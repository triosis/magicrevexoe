import {cronJob} from './cron.js'
import {inspectCronTarget} from './cron-inspect.js'
import {digest} from '../migrations/schema.js'

// Read-only diagnostics: fixed field names, booleans and public fingerprints only.
// Never return raw JSON input, exception messages, grants or credential values.
export async function diagnoseCron(environment:NodeJS.ProcessEnv){
 const inspection=await inspectCronTarget(environment)
 let raw:unknown
 try{raw=JSON.parse(environment.INITIALIZATION_CRON_JOB??'')}catch{return {mode:'diagnose',inspection,jobJsonValid:false,changesMade:false}}
 const parsed=cronJob.safeParse(raw)
 const input=raw as {policy?:{hostingerLocalApprovalId?:unknown;hostingerWildcard?:{approvalId?:unknown;notBefore?:unknown;expiresAt?:unknown}};releaseFingerprint?:unknown;confirmation?:unknown;action?:unknown}|null
 const wildcard=input?.policy?.hostingerWildcard
 const starts=typeof wildcard?.notBefore==='string'?Date.parse(wildcard.notBefore):NaN
 const expires=typeof wildcard?.expiresAt==='string'?Date.parse(wildcard.expiresAt):NaN
 const required=['MIGRATION_DB_USER','MIGRATION_DB_PASSWORD','INITIALIZATION_STATE_DB_NAME','INITIALIZATION_STATE_DB_USER','INITIALIZATION_STATE_DB_PASSWORD'] as const
 return {mode:'diagnose',inspection,jobJsonValid:true,jobSchemaValid:parsed.success,
  policyWindowActive:Number.isFinite(starts)&&Number.isFinite(expires)&&starts<=Date.now()&&Date.now()<expires,
  releaseMatches:input?.releaseFingerprint===inspection.releaseFingerprint,
  localApprovalIdMatches:typeof input?.policy?.hostingerLocalApprovalId==='string'&&input.policy.hostingerLocalApprovalId===environment.HOSTINGER_LOCAL_APPROVAL_ID,
  wildcardApprovalIdMatches:typeof wildcard?.approvalId==='string'&&wildcard.approvalId===environment.HOSTINGER_WILDCARD_APPROVAL_ID,
  ...(parsed.success?{confirmationMatches:parsed.data.confirmation===`INITIALIZE:${parsed.data.action}:${digest(parsed.data.policy)}`} :{}),
  requiredInputsPresent:Object.fromEntries(required.map(key=>[key,!!environment[key]])),
  stateDatabaseDistinct:!!environment.INITIALIZATION_STATE_DB_NAME&&environment.INITIALIZATION_STATE_DB_NAME.toLowerCase()!==inspection.databaseName?.toLowerCase(),
  changesMade:false}
}
