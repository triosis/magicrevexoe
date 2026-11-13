import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createPool} from 'mysql2/promise'
import {startDisposableMariaDB} from './mariadb-fixture.mjs'
import {loadMigrations,runMigrations} from '../dist/migrations/runner.js'
import {reviewMigrationState} from '../dist/setup/migration-review.js'

test('read-only review identifies an absent failed trigger and preserves numeric driver error and failed ledger',{timeout:60000},async()=>{
 const fixture=await startDisposableMariaDB(),database='magicreview_migration_review',user='review_fixture',password=randomBytes(24).toString('hex')
 let pool
 try{
  await fixture.admin.query('CREATE DATABASE '+database+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  await fixture.admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[user,password])
  // Deliberately reproduce a server-side CREATE TRIGGER error in this fixture.
  await fixture.admin.query('GRANT SELECT,INSERT,UPDATE,CREATE,ALTER ON '+database+".* TO ?@'localhost'",[user])
  pool=createPool({...fixture.options,user,password,database,connectionLimit:2,charset:'utf8mb4',supportBigNumbers:true,bigNumberStrings:true})
  const files=await loadMigrations(new URL('../migrations/',import.meta.url))
  await assert.rejects(runMigrations(pool,files.slice(0,25),'up'),/DB_ERROR_1142/)
  const [before]=await pool.query('SELECT version,status,failure_code FROM schema_migrations ORDER BY version')
  assert.equal(before[24].failure_code,'DB_ERROR_1142')
  const db=await pool.getConnection()
  let review
  try{review=await reviewMigrationState(db)}finally{db.release()}
  assert.equal(review.appliedPrefixCount,24);assert.equal(review.ledgerRows,25)
  assert.equal(review.checksumsMatch,true);assert.equal(review.schemaMatchesAppliedPrefix,true)
  assert.equal(review.incompleteTailRecognized,true);assert.equal(review.failedVersion,'000024')
  assert.equal(review.failedPostconditionSatisfied,false);assert.equal(review.schemaMatchesIncludingFailedStep,false)
  assert.equal(review.storedDatabaseError,'DB_ERROR_1142');assert.equal(review.changesMade,false)
  assert.deepEqual((await pool.query('SELECT version,status,failure_code FROM schema_migrations ORDER BY version'))[0],before)
  await assert.rejects(runMigrations(pool,files,'up'),/INCOMPLETE_MIGRATION_REQUIRES_REVIEW/)
 }finally{await pool?.end();await fixture.close()}
})
