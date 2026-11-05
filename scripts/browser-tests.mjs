import {createServer} from 'vite'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {fileURLToPath} from 'node:url'

// Own Vite in-process so Windows does not need process-tree termination to clean up.
// Test configuration points only to loopback; no production API is contacted.
process.env.VITE_API_URL='http://127.0.0.1:4189/api/v1'
const server=await createServer({server:{host:'127.0.0.1',port:5178,strictPort:true}})
try{
 await server.listen()
 const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/@playwright/test/cli.js',import.meta.url)),'test',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,PW_REUSE_SERVER:'1'}})
 const [code]=await once(child,'exit');process.exitCode=typeof code==='number'?code:1
}finally{await server.close()}
