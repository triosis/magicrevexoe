import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createDatabasePool } from '../dist/db/pool.js'
import { loadMigrations, runMigrations } from '../dist/migrations/runner.js'
import { startDisposableMariaDB } from './mariadb-fixture.mjs'

test('MariaDB 11.8 migration lifecycle, exclusivity, failure, rollback and forward repair',{timeout:120000},async t=>{
  const fixture=await startDisposableMariaDB()
  const pools=[]
  const sessions=new Set()
  // Infrastructure fault fixtures intentionally exercise only the immutable
  // bootstrap; complete business schema is covered by schema.integration.mjs.
  const files=(await loadMigrations(new URL('../migrations/',import.meta.url))).slice(0,1)
  let count=0
  async function database(){
    const name='magicreview_migration_test_'+(++count)
    await fixture.admin.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    const pool=createDatabasePool({NODE_ENV:'test',HOST:'127.0.0.1',PORT:3001,CORS_ORIGINS:[],DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:name,DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:3})
    pool.on('connection',connection=>sessions.add(connection))
    pools.push(pool);return pool
  }
  function step(version,sql,verify='SELECT 1 AS satisfied'){
    return {version,name:'fixture_'+version,sql,verify,checksum:createHash('sha256').update(sql).update('\0').update(verify).digest()}
  }
  try {
    await t.test('explicit CLI status and execution use only the supplied disposable target',async()=>{
      await database()
      const name='magicreview_migration_test_'+count
      async function cli(command){
        const child=spawn(process.execPath,[fileURLToPath(new URL('../dist/migrations/cli.js',import.meta.url)),command],{
          env:{...process.env,MIGRATION_DB_HOST:'127.0.0.1',MIGRATION_DB_PORT:String(fixture.options.port),MIGRATION_DB_NAME:name,MIGRATION_DB_USER:'root',MIGRATION_DB_PASSWORD:fixture.options.password},windowsHide:true,
        })
        let output='',error='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>error+=data)
        const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)})
        assert.equal(error,'');assert.equal(code,0);return JSON.parse(output)
      }
      assert.equal((await cli('status')).initialized,false)
      assert.ok((await cli('up')).applied.includes('000000'))
      assert.deepEqual((await cli('status')).pending,[])
    })
    await t.test('status is read-only; bootstrap verifies and records checksum; reruns are idempotent',async()=>{
      const pool=await database()
      assert.equal((await runMigrations(pool,files,'status')).initialized,false)
      const [empty]=await pool.query('SHOW TABLES');assert.equal(empty.length,0)
      assert.deepEqual((await runMigrations(pool,files,'up')).applied,['000000'])
      assert.deepEqual((await runMigrations(pool,files,'up')).pending,[])
      const [rows]=await pool.query('SELECT checksum,status FROM schema_migrations')
      assert.equal(rows[0].status,'applied');assert.ok(rows[0].checksum.equals(files[0].checksum))
      await assert.rejects(runMigrations(pool,[{...files[0],checksum:Buffer.alloc(32)}],'up'),/CHECKSUM_MISMATCH/)
    })
    await t.test('exclusive lock excludes a concurrent runner, including across commit',async()=>{
      const pool=await database()
      const connection=await pool.getConnection()
      const [[info]]=await connection.query('SELECT DATABASE() AS db')
      const key='magicreview:migrate:'+createHash('sha256').update(info.db).digest('hex').slice(0,40)
      await connection.execute('SELECT GET_LOCK(?,0)',[key]);await connection.commit()
      await assert.rejects(runMigrations(pool,files,'up',0),/LOCK_UNAVAILABLE/)
      await connection.execute('SELECT RELEASE_LOCK(?)',[key]);connection.release()
      await runMigrations(pool,files,'up')
    })
    await t.test('nonempty untracked schema and orphan bootstrap ledger are never silently baselined',async()=>{
      const pool=await database();await pool.query('CREATE TABLE existing_fixture(id INT) ENGINE=InnoDB')
      await assert.rejects(runMigrations(pool,files,'up'),/BASELINE_REVIEW/)
      const orphan=await database();await orphan.query(files[0].sql)
      await assert.rejects(runMigrations(orphan,files,'up'),/BOOTSTRAP_INCOMPLETE/)
    })
    await t.test('postcondition failure retains committed DDL, marks failed and blocks all retries',async()=>{
      const pool=await database()
      const partial=step('000001','CREATE TABLE recovery_fixture(id INT PRIMARY KEY) ENGINE=InnoDB','SELECT COUNT(*) AS satisfied FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\'recovery_fixture\' AND COLUMN_NAME=\'recovered\'')
      const manifest=[...files,partial]
      await assert.rejects(runMigrations(pool,manifest,'up'),/POSTCONDITION_FAILED/)
      const [[row]]=await pool.query("SELECT status FROM schema_migrations WHERE version='000001'");assert.equal(row.status,'failed')
      await assert.rejects(runMigrations(pool,manifest,'up'),/INCOMPLETE_MIGRATION/)
      // Explicit operator-style FORWARD repair in disposable fixture only. No
      // automatic repair, down migration, checksum rewrite or production action.
      await pool.query('ALTER TABLE recovery_fixture ADD COLUMN recovered INT NULL')
      const [[proof]]=await pool.query(partial.verify);assert.equal(Number(proof.satisfied),1)
      await pool.execute("UPDATE schema_migrations SET status='applied',applied_at=CURRENT_TIMESTAMP(6),last_verified_step=1,failure_code=NULL WHERE version=? AND status='failed' AND checksum=?",[partial.version,partial.checksum])
      assert.deepEqual((await runMigrations(pool,manifest,'status')).pending,[])
    })
    await t.test('DML rollback/savepoint works; applying state and ledger drift fail closed',async()=>{
      const pool=await database();await runMigrations(pool,files,'up')
      const c=await pool.getConnection();await c.beginTransaction()
      await c.execute("INSERT INTO schema_migrations(version,name,checksum,status,runner_id) VALUES ('000001','fixture',?,'applying',?)",[Buffer.alloc(32),Buffer.alloc(16)])
      await c.query('SAVEPOINT fixture_savepoint')
      await c.query("UPDATE schema_migrations SET name='changed_fixture' WHERE version='000001'")
      await c.query('ROLLBACK TO SAVEPOINT fixture_savepoint')
      const [[saved]]=await c.query("SELECT name FROM schema_migrations WHERE version='000001'");assert.equal(saved.name,'fixture')
      await c.rollback();c.release()
      const [[result]]=await pool.query('SELECT COUNT(*) AS n FROM schema_migrations');assert.equal(Number(result.n),1)
      await pool.query("UPDATE schema_migrations SET status='applying' WHERE version='000000'")
      await assert.rejects(runMigrations(pool,files,'up'),/INCOMPLETE_MIGRATION/)
      const drift=await database();await runMigrations(drift,files,'up');await drift.query('ALTER TABLE schema_migrations ADD COLUMN unexpected INT')
      await assert.rejects(runMigrations(drift,files,'status'),/INCOMPATIBLE_MIGRATION_LEDGER/)
    })
    await t.test('multiple-statement file is rejected without executing its second statement',async()=>{
      const pool=await database()
      const manifest=[...files,step('000001','SELECT 1; CREATE TABLE forbidden_fixture(id INT)')]
      await assert.rejects(runMigrations(pool,manifest,'up'),/MIGRATION_OPERATION_FAILED/)
      const [found]=await pool.query("SHOW TABLES LIKE 'forbidden_fixture'");assert.equal(found.length,0)
    })
  } finally {
    console.info('Closing disposable database sessions')
    // Close idle test sessions without relying on pooled COM_QUIT completion.
    // Every checked-out migration session has already been destroyed by runner.
    for(const connection of sessions) connection.destroy()
    // Give mysql2 pending command completion callbacks one event-loop turn before
    // ending the now-empty pools.
    await new Promise(resolve=>setImmediate(resolve))
    for(const pool of pools) await pool.end()
    console.info('Stopping disposable database server')
    await fixture.close()
  }
})
