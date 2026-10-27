// Local ownership metadata only. This never grants server access or caches server
// records/capabilities. Binding to the secure session prevents a different login
// from opening the previous owner's drafts before online identification completes.
export interface LocalIdentity {accountId:string;contextId:string;role:'cm'|'mcst'|'contractor'|'admin';sessionBinding:string}
export function sameLocalOwner(identity:LocalIdentity|undefined,binding:string,owner:string|undefined):identity is LocalIdentity {
  return !!identity&&identity.accountId===owner&&!!binding&&identity.sessionBinding===binding;
}
export function localRole(value:string):value is LocalIdentity['role'] {return ['cm','mcst','contractor','admin'].includes(value);}
