import {readFile,readdir} from 'node:fs/promises'
export async function triggerPrivilegeMap(){
 const directory=new URL('../migrations/',import.meta.url),result=[]
 for(const file of (await readdir(directory)).filter(f=>f.endsWith('.sql')&&!f.endsWith('.verify.sql')).sort()){
  const sql=await readFile(new URL(file,directory),'utf8'),match=/^CREATE TRIGGER (\w+) (BEFORE|AFTER) (INSERT|UPDATE|DELETE) ON (\w+) FOR EACH ROW/.exec(sql)
  if(!match)continue
  // Deliberately bounded inventory for this release, not a general SQL parser.
  if(/\b(?:SET\s+NEW\.|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CALL\s+)\b/i.test(sql))throw Error('New trigger write/call needs manual dependency review: '+file)
  const unique=values=>[...new Set(values)].sort()
  const oldColumns=unique([...sql.matchAll(/\bOLD\.(\w+)/gi)].map(m=>m[1]))
  const newColumns=unique([...sql.matchAll(/\bNEW\.(\w+)/gi)].map(m=>m[1]))
  const tableReads=unique([...sql.matchAll(/\b(?:FROM|JOIN)\s+(\w+)/gi)].map(m=>m[1]))
  const selectTables=unique([...tableReads,...(oldColumns.length||newColumns.length?[match[4]]:[])])
  result.push({file,trigger:match[1],timing:match[2],event:match[3],subject:match[4],definer:'creating account; verified from information_schema at rehearsal',definerTriggerOn:match[4],definerSelectOn:selectTables,oldColumns,newColumns,bodyTableReads:tableReads,bodyWrites:[],invokerPrivilege:match[3]})
 }
 if(result.length!==46)throw Error('Trigger release count changed; review map')
 return result
}
