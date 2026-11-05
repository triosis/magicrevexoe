export type Kind='platform'|'reseller'|'sub_reseller'|'merchant'
export type Membership={membershipId:string;tenantId:string;kind:Kind;roleId:string;roleCode:string;permissions:string[]}
export type Me={user:{id:string;publicId:string;email:string;displayName:string};memberships:Membership[];selectedMembership:Membership|null;mfaImplemented:boolean}
export type Account={id:string;publicId:string;kind:Kind;parentId:string|null;name:string;status:string;effectiveStatus:string;industryChannelId:string|null;lockVersion:number;createdAt:string}
export type Channel={id:string;code:string;name:string;status:string}
export type ChannelVersion={id:string;version:number;displayName:string;status:string;publicCopy:{title:string}}
export type Merchant={id:string;name:string;status:string;lockVersion:number;industryChannel:Channel;onboarding:{complete:boolean;checks:Record<string,boolean>;readyBranchCount:string}}
export type Branch={id:string;merchantId:string;industryChannelId:string;code:string;name:string;timezone:string;address:string|null;status:string;lockVersion:number}
export type Destination={id:string;placeId:string;reviewUrl:string;status:string;lockVersion:number}
export type ShortLink={id:string;branchId:string;code:string;status:string;lockVersion:number;publicUrl:string}
export type QrAsset={id:string;branchId:string;shortLinkId:string;format:'svg'|'png';status:string;contentUrl:string;sha256:string}
export type FeedbackStatus='new'|'in_progress'|'resolved'|'dismissed'
export type Feedback={id:string;publicId:string;merchantId:string;branchId:string;ratings:{overall:number;service:number|null;cleanliness:number|null;waitingTime:number|null};status:FeedbackStatus;lockVersion:number;submittedAt:string;resolvedAt:string|null;history?:{fromStatus:string;toStatus:string;reasonCode:string;createdAt:string}[]}
export type Statistics={groups:{status:FeedbackStatus;count:string;averageRating:string}[]}
export type RatingName='overallRating'|'serviceRating'|'cleanlinessRating'|'waitingTimeRating'
export type PublicFunnel={merchant:{name:string};branch:{name:string;address:string|null;timezone:string};industryChannel:{code:string;name:string};channelVersion:{version:number;title:string};funnel:{revision:number;brandTitle:string;accentHex:string;locale:string};options:{googleReview:{label:string;url:string;independent:true};privateFeedback:{label:string;independent:true;submissionAvailable:boolean;submissionUrl:string;submissionToken:{token:string;expiresAt:string};fields:{name:RatingName;label?:string;type:'integer';minimum:1;maximum:5;required:boolean}[]}};feedbackPolicy:{structuredOnly:true;medicalDetailsAllowed:false}}
export const has=(membership:Membership|null|undefined,permission:string)=>membership?.permissions.includes(permission)===true
export const kindName:Record<Kind,string>={platform:'Super Admin',reseller:'Reseller',sub_reseller:'Sub-Reseller',merchant:'Merchant'}
export function creatableKinds(member:Membership){return(['reseller','sub_reseller','merchant'] as const).filter(kind=>has(member,`${kind}.create`)&&has(member,'membership.manage')&&has(member,'tenant.read')&&member.kind!=='merchant'&&(kind!=='reseller'||member.kind==='platform')&&(kind!=='sub_reseller'||member.kind==='platform'||member.kind==='reseller'))}
export function permittedParent(parent:Kind,child:Kind){return child==='reseller'?parent==='platform':child==='sub_reseller'?parent==='reseller':child==='merchant'&&parent!=='merchant'}
export function statusChoices(status:FeedbackStatus){return status==='new'?[['in_progress','triage'],['resolved','completed'],['dismissed','spam'],['dismissed','duplicate']]:status==='in_progress'?[['new','follow_up'],['resolved','completed'],['dismissed','spam'],['dismissed','duplicate']]:[['in_progress','reopened']]}
