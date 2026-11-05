import {expect,it} from 'vitest'
import {navigationFor} from '../../src/application/Root'
import {creatableKinds,permittedParent,statusChoices} from '../../src/application/types'
import {member} from './fixtures'
it('limits navigation and onboarding choices to current server-provided membership permissions',()=>{
 expect(navigationFor(member).map(n=>n.path)).not.toContain('/app/accounts');expect(navigationFor(member).map(n=>n.path)).toContain('/app/business');expect(creatableKinds(member)).toEqual([])
 const reseller={...member,kind:'reseller' as const,permissions:['tenant.read','membership.manage','merchant.create','sub_reseller.create']};expect(creatableKinds(reseller)).toEqual(['sub_reseller','merchant']);expect(navigationFor(reseller).map(n=>n.path)).not.toContain('/app/feedback')
 expect(creatableKinds({...reseller,kind:'sub_reseller'})).toEqual(['merchant']);expect(permittedParent('sub_reseller','sub_reseller')).toBe(false);expect(permittedParent('reseller','merchant')).toBe(true);expect(permittedParent('platform','merchant')).toBe(true);expect(statusChoices('resolved')).toEqual([['in_progress','reopened']])
})
