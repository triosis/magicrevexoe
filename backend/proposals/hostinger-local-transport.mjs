// REVIEW ONLY. No runtime/CLI imports this module; no environment reads or I/O.
// Owner approval is a separate release decision, not proven by these strings.
export const proposedApprovalAcknowledgement='I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT'
export function reviewHostingerLocalTransport(input){
 if(input?.NODE_ENV!=='production'||input.DB_TLS_MODE!=='HOSTINGER_LOCAL')throw Error('Explicit proposed production local mode required')
 if(input.DB_HOST!=='127.0.0.1'||input.DB_PORT!=='3306')throw Error('Proposed local mode requires exactly 127.0.0.1:3306')
 if(input.HOSTINGER_LOCAL_APPROVAL!==proposedApprovalAcknowledgement||!/^[A-Za-z0-9][A-Za-z0-9._-]{7,79}$/.test(input.HOSTINGER_LOCAL_APPROVAL_ID??''))throw Error('Explicit operator acknowledgement and approval record required')
 if(input.DB_TLS_CA_FILE!==undefined||input.DB_TLS_CA_SHA256!==undefined)throw Error('CA fields must be absent in the proposed local mode')
 return Object.freeze({proposalOnly:true,transport:'unencrypted_loopback',host:'127.0.0.1',port:3306,approvalId:input.HOSTINGER_LOCAL_APPROVAL_ID,requiresSeparateOwnerReleaseApproval:true})
}
