import {runInitializationJob} from './job.js'

// No defaults, dotenv, HTTP endpoint, automatic retries or setup on normal startup.
try{
 const args=process.argv.slice(2)
 if(args.length!==2||args[0]!=='--job'||!args[1])throw Error()
 console.info(JSON.stringify(await runInitializationJob(args[1])))
}catch{
 console.error('Initialization job refused or failed. Preserve private policy, preflight and audit artifacts for review. No automatic retry is permitted.')
 process.exitCode=1
}
