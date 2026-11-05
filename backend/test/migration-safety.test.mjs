import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {mkdtemp,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {inspectGrants} from '../dist/migrations/privileges.js'
import {targetPolicy,operatorMigrations} from '../dist/migrations/operator.js'

test('grant inspection rejects inherited/global/excessive/column privileges instead of approximating them',()=>{
 for(const grant of ["GRANT ALL PRIVILEGES ON *.* TO `fixture`@`localhost`", "GRANT SELECT ON `other`.* TO `fixture`@`localhost`", "GRANT `role` TO `fixture`@`localhost`", "GRANT SELECT(id) ON `fixture`.`users` TO `fixture`@`localhost`", "GRANT SELECT ON `fixture`.* TO `fixture`@`localhost` WITH GRANT OPTION"]){assert.throws(()=>inspectGrants([grant],'fixture','migration'),/UNSUPPORTED_OR_EXCESSIVE/)}
 assert.throws(()=>inspectGrants(['GRANT USAGE ON *.* TO `fixture`@`localhost`'],'fixture','migration'),/MISSING_REQUIRED_PRIVILEGES/)
})
test('operator CLI requires target/environment and explicit production approval before any connection',async()=>{
 await assert.rejects(operatorMigrations({},[],{},{},'unexpected'),/INVALID_OPERATOR_MODE/)
 const invoke=args=>spawnSync(process.execPath,[fileURLToPath(new URL('../dist/migrations/operator-cli.js',import.meta.url)),...args],{encoding:'utf8',windowsHide:true,env:{...process.env,MIGRATION_DB_USER:'test-only',MIGRATION_DB_PASSWORD:randomBytes(24).toString('hex')}})
 assert.match(invoke(['apply']).stderr,/EXPLICIT_TARGET_ENVIRONMENT_REQUIRED/)
 const dir=await mkdtemp(path.join(tmpdir(),'magicreview-operator-policy-')),file=path.join(dir,'target.json')
 const policy={environment:'production',host:'unreachable.example.invalid',port:3306,database:'synthetic',serverHostname:'synthetic',expectedAccount:'fixture@localhost',tlsCaFile:'not-read.pem',tlsCaSha256:'0'.repeat(64)}
 await writeFile(file,JSON.stringify(policy))
 assert.match(invoke(['apply','--target',file,'--environment','production']).stderr,/EXPLICIT_PRODUCTION_CONFIRMATION_REQUIRED/)
 assert.match(invoke(['preflight','--target',file,'--environment','staging']).stderr,/TARGET_ENVIRONMENT_MISMATCH/)
 await assert.rejects(operatorMigrations({},[],{},targetPolicy.parse(policy),'apply'),/EXPLICIT_PRODUCTION_CONFIRMATION_REQUIRED/)
 assert.equal(targetPolicy.safeParse({...policy,tlsCaFile:undefined}).success,false)
 assert.equal(targetPolicy.safeParse({...policy,host:'127.0.0.1'}).success,false)
 assert.equal(targetPolicy.safeParse({...policy,environment:'local',host:'127.0.0.1',database:'unexpected'}).success,false)
})
