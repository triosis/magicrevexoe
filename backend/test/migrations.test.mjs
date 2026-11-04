import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { loadMigrations, supportedVersion, validateHistory, runMigrations } from '../dist/migrations/runner.js'

test('only verified MariaDB 11.8 series is accepted', () => {
  for (const version of ['11.8.9-MariaDB','11.8.10-MariaDB-log','5.5.5-11.8.9-MariaDB']) assert.equal(supportedVersion(version),true)
  for (const version of ['8.0.40','11.4.9-MariaDB','12.0.1-MariaDB','11.8.9','garbage']) assert.equal(supportedVersion(version),false)
})

test('unsupported engine fails before lock or DDL and disposes connection', async()=>{
  let destroyed=false
  const sql=[]
  const pool={async getConnection(){return {async execute(statement){sql.push(statement);return [[{version:'8.0.40',db:'fixture'}]]},destroy(){destroyed=true}}}}
  await assert.rejects(runMigrations(pool,[],'up'),/UNSUPPORTED_DATABASE_VERSION/)
  assert.equal(sql.length,1);assert.equal(destroyed,true)
})

test('CLI refuses remote targets before creating a pool and never prints supplied secrets',()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../dist/migrations/cli.js',import.meta.url)),'up'],{
    env:{...process.env,MIGRATION_DB_HOST:'production.invalid',MIGRATION_DB_PORT:'3306',MIGRATION_DB_NAME:'magicreview_migration_fixture',MIGRATION_DB_USER:'private_fixture_user',MIGRATION_DB_PASSWORD:'private_fixture_password'},encoding:'utf8',windowsHide:true,
  })
  assert.equal(result.status,1)
  assert.equal(result.stdout,'')
  assert.equal(result.stderr.trim(),'INVALID_LOCAL_MIGRATION_CONFIGURATION')
})

test('checked-in manifest contains only migration tracking infrastructure', async () => {
  const migrations=await loadMigrations(new URL('../migrations/',import.meta.url))
  assert.equal(migrations.length,1)
  assert.equal(migrations[0].version,'000000')
  assert.equal(migrations[0].name,'schema_migrations')
  assert.equal(migrations[0].checksum.length,32)
})

test('history fails closed on checksum, order and incomplete execution', async () => {
  const files=await loadMigrations(new URL('../migrations/',import.meta.url))
  const row={...files[0],status:'applied'}
  validateHistory(files,[row])
  for(const patch of [{status:'failed'},{status:'applying'},{checksum:Buffer.alloc(32)},{version:'000002'},{name:'other'}]) {
    assert.throws(()=>validateHistory(files,[{...row,...patch}]))
  }
  assert.throws(()=>validateHistory(files,[row,{...row,version:'000001'}]))
})

test('loader rejects gaps, duplicate versions, CRLF, missing verification; hashes postconditions',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'magicreview-migration-manifest-'))
  const url=pathToFileURL(dir+path.sep)
  await writeFile(new URL('000000_schema_migrations.sql',url),'SELECT 1\n')
  await writeFile(new URL('000002_gap.sql',url),'SELECT 1\n')
  await assert.rejects(loadMigrations(url),/INVALID_MIGRATION_SEQUENCE/)
  // Use fresh directories instead of deleting fixture files.
  const dir2=await mkdtemp(path.join(tmpdir(),'magicreview-migration-manifest-'))
  const url2=pathToFileURL(dir2+path.sep)
  await writeFile(new URL('000000_schema_migrations.sql',url2),'SELECT 1\n')
  await writeFile(new URL('000001_fixture.sql',url2),'SELECT 1\n')
  await assert.rejects(loadMigrations(url2),/MISSING_MIGRATION_POSTCONDITION/)
  await writeFile(new URL('000001_fixture.verify.sql',url2),'SELECT 1 AS satisfied\n')
  const manifest=await loadMigrations(url2)
  assert.equal(manifest[1].checksum.toString('hex'),createHash('sha256').update('SELECT 1\n\0SELECT 1 AS satisfied\n').digest('hex'))
  await writeFile(new URL('000001_fixture.sql',url2),'SELECT 1\r\n')
  await assert.rejects(loadMigrations(url2),/INVALID_MIGRATION_ENCODING/)
  await writeFile(new URL('000001_fixture.sql',url2),'SELECT 1\n')
  await writeFile(new URL('000001_duplicate.sql',url2),'SELECT 1\n')
  await writeFile(new URL('000001_duplicate.verify.sql',url2),'SELECT 1 AS satisfied\n')
  await assert.rejects(loadMigrations(url2),/INVALID_MIGRATION_SEQUENCE/)
})
