import {runCronFromEnvironment} from './cron.js'
import {inspectCronTarget} from './cron-inspect.js'

// Executed explicitly by the managed Node cron binary, never by app startup.
const args=process.argv.slice(2)
const operation=args.length===1&&args[0]==='--inspect'?()=>inspectCronTarget(process.env):args.length===0?()=>runCronFromEnvironment(process.env):async()=>{throw Error('INVALID_ARGUMENTS')}
operation().then(result=>console.info(JSON.stringify(result))).catch(()=>{
 console.error('INITIALIZATION_REFUSED_OR_FAILED: inspect protected database records; do not retry automatically')
 process.exitCode=1
})
