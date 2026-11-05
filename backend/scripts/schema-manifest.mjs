import {writeFile} from 'node:fs/promises'
import {startDisposableMariaDB} from '../test/mariadb-fixture.mjs'
import {createDatabasePool} from '../dist/db/pool.js'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {inspectSchema} from '../dist/migrations/schema.js'

// Reference generation is ONLY against a harness-owned, fresh loopback server.
const fixture=await startDisposableMariaDB(),sessions=new Set()
await fixture.admin.query('CREATE DATABASE magicreview_migration_manifest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
const pool=createDatabasePool({DB_HOST:'127.0.0.1',DB_PORT:fixture.options.port,DB_NAME:'magicreview_migration_manifest',DB_USER:'root',DB_PASSWORD:fixture.options.password,DB_CONNECTION_LIMIT:1});pool.on('connection',c=>sessions.add(c))
try{
 const [[server]]=await fixture.admin.query('SELECT VERSION() AS version');if(!/^11\.8\.9-MariaDB/.test(server.version))throw Error('Reference requires MariaDB 11.8.9')
 const files=await loadMigrations(new URL('../migrations/',import.meta.url)),prefixes={empty:{}}
 for(let i=0;i<files.length;i++){await runMigrations(pool,files.slice(0,i+1),'up');const connection=await pool.getConnection();try{prefixes[files[i].version]=await inspectSchema(connection)}finally{connection.release()}}
 await writeFile(new URL('../docs/schema-manifest.json',import.meta.url),JSON.stringify({format:1,checksums:files.map(m=>m.checksum.toString('hex')),prefixes},null,2)+'\n')
 console.info('Generated reviewed reference for '+files.length+' ordered prefixes; no production connection')
}finally{for(const c of sessions)c.destroy();await pool.end();await fixture.close()}
