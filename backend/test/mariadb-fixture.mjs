import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { randomBytes } from 'node:crypto'
import { createConnection } from 'mysql2/promise'

// This harness launches its OWN Windows ZIP-distribution server. It never reads
// .env, DB_* or remote database settings. No service install or destructive SQL.
export async function startDisposableMariaDB(tls, {port: requestedPort} = {}) {
  if(requestedPort!==undefined&&requestedPort!==3306)throw Error('Only explicit disposable loopback port 3306 is supported')
  const bin=process.env.MARIADB_TEST_BIN
  if (!bin || process.platform!=='win32') throw Error('MARIADB_TEST_BIN must point to local MariaDB 11.8 Windows bin directory')
  const datadir=await mkdtemp(path.join(tmpdir(),'magicreview-mariadb-'))
  const password=randomBytes(32).toString('hex')
  const reservation=net.createServer()
  // A busy explicit port fails at bind: never connect to an existing DB listener.
  reservation.listen(requestedPort??0,'127.0.0.1')
  await once(reservation,'listening')
  const port=reservation.address().port
  await new Promise(resolve=>reservation.close(resolve))
  const installer=spawn(path.join(bin,'mariadb-install-db.exe'),['--datadir='+datadir,'--password='+password,'--port='+port],{windowsHide:true,stdio:'ignore'})
  if ((await once(installer,'exit'))[0]!==0) throw Error('Disposable MariaDB initialization failed')
  const child=spawn(path.join(bin,'mariadbd.exe'),['--no-defaults','--basedir='+path.dirname(bin),'--datadir='+datadir,'--bind-address=127.0.0.1','--port='+port,'--character-set-server=utf8mb4','--collation-server=utf8mb4_unicode_ci','--skip-log-bin','--console',...(tls?['--ssl-ca='+tls.cert,'--ssl-cert='+tls.cert,'--ssl-key='+tls.key]:[])],{windowsHide:true,stdio:'ignore'})
  const options={host:'127.0.0.1',port,user:'root',password,connectTimeout:1000}
  let admin
  for(let i=0;i<200;i++) {
    if(child.exitCode!==null) throw Error('Disposable MariaDB exited before accepting connections')
    try { admin=await createConnection(options); break } catch { await new Promise(resolve=>setTimeout(resolve,100)) }
  }
  if(!admin) {child.kill();throw Error('Disposable MariaDB did not become ready')}
  return {options,admin,datadir,async close(){
    const stopped=once(child,'exit')
    // SHUTDOWN affects only this harness-owned process, never a supplied server.
    await admin.query('SHUTDOWN')
    admin.destroy()
    await stopped
  }}
}
