import {loadEnv} from '../config/env.js'
import {configuredAuth} from '../auth/configuration.js'
import {createDatabasePool} from './pool.js'
import {verifyDatabase} from './diagnostic.js'
import {safeDatabaseFailure} from '../app.js'

// No dotenv in production; no argv credentials, migrations, writes or mail.
try{
 if(process.argv.length!==3||process.argv[2]!=='--confirm-read-only'||process.env.NODE_ENV!=='production')throw Error('Explicit production read-only confirmation required')
 const env=loadEnv()
 // Validate existing auth/SMTP security configuration, without contacting SMTP.
 const pool=createDatabasePool(env)
 try{configuredAuth(pool,process.env)}finally{await pool.end()}
 console.info(JSON.stringify(await verifyDatabase(env)))
}catch(error){
 const code=typeof error==='object'&&error!==null&&'code'in error?error.code:undefined
 const diagnostic=code==='UNSUPPORTED_DATABASE_VERSION'?'Unsupported database: current release requires MariaDB 11.8.':code==='ENCRYPTED_DATABASE_SESSION_REQUIRED'?'Encrypted database session required.':safeDatabaseFailure(error)
 console.error(JSON.stringify({status:'failed',diagnostic,configuration:'Review explicit transport approval, production variable formats and required CA/DNS policy; raw errors withheld'}))
 process.exitCode=1
}
