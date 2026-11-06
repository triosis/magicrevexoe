import {HttpError} from '../middleware/error-handler.js'

// Task 22: no written finance-reviewed owner approval exists. Catalog approval,
// environment flags, provider signatures and administrator roles cannot lift this.
// A separately reviewed implementation must consume actual written approval before
// financial execution is enabled. No runtime or test-only bypass is provided.
export function requireFinancialApproval():void{
 throw new HttpError(409,'Financial execution is disabled pending written owner approval and finance review')
}
export const financialReadiness=Object.freeze({paidActivation:false,checkout:false,overageCollection:false,settlement:false,refunds:false,creditNotes:false,gstInvoiceIssuance:false,automatedDunning:false})
