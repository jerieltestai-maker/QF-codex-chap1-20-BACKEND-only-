import {AppError} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
export type Role = 'cm' | 'mcst' | 'contractor' | 'admin';
export interface Membership extends Record<string, unknown> {
  id: string; role: Role; estate_id: string | null; organisation_id: string | null;
  label: string | null; version: number; verified: boolean | null;
}
export interface Actor {
  id: string; name: string; email: string; accessVersion: number; context: Membership | undefined;
  memberships: Membership[]; csrf: string; sessionHash: string;
}
export type Capability = 'estate.read' | 'rfq.manage' | 'selection.approve' | 'payment.record'
  | 'contractor.account' | 'quote.submit' | 'fee.read' | 'membership.manage';
export function can(actor: Actor, capability: Capability): boolean {
  const role = actor.context?.role;
  if (!role) return false;
  if (role === 'admin') return true;
  if (['estate.read','rfq.manage'].includes(capability)) return role === 'cm' || role === 'mcst';
  if (['selection.approve','payment.record'].includes(capability)) return role === 'mcst';
  if (['contractor.account','fee.read'].includes(capability)) return role === 'contractor';
  if (capability === 'quote.submit') return role === 'contractor' && actor.context?.verified === true;
  return false;
}
export function requireCapability(actor: Actor, capability: Capability): void {
  if (!can(actor, capability)) throw new AppError(403, 'FORBIDDEN', 'This action is not permitted');
}
export interface ResourceAccess {
  estateId?: string; organisationId?: string;
  subjectUserIds?: string[]; subjectOrganisationIds?: string[];
}
export function canRead(actor: Actor, resource: ResourceAccess): boolean {
  // Exclusions apply even to a subject who otherwise has estate-wide or Admin authority.
  if (resource.subjectUserIds?.includes(actor.id)) return false;
  if (actor.memberships.some(m => m.organisation_id && resource.subjectOrganisationIds?.includes(m.organisation_id))) return false;
  const context = actor.context;
  if (!context) return false;
  if (context.role === 'admin') return true;
  if (context.role === 'contractor') return !!resource.organisationId && context.organisation_id === resource.organisationId;
  return !!resource.estateId && context.estate_id === resource.estateId;
}
export async function memberships(sql: Sql, userId: string): Promise<Membership[]> {
  return sql.query<Membership>(`SELECT m.id,m.role,m.estate_id,m.organisation_id,m.label,m.version,o.verified
    FROM memberships m LEFT JOIN organisations o ON o.id=m.organisation_id
    WHERE m.user_id=$1 AND m.active=true ORDER BY m.id`, [userId]);
}
