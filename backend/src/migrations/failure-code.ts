// Numeric server errno only; never persist messages, SQL, parameters or account data.
export function databaseFailureCode(error:unknown){
 if(error&&typeof error==='object'&&'errno' in error&&typeof error.errno==='number'&&Number.isInteger(error.errno)&&error.errno>=1000&&error.errno<=9999)return `DB_ERROR_${error.errno}`
 return 'EXECUTION_FAILED'
}
