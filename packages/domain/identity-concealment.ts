import type {Sql} from '../infrastructure/database.js';

// Historical quote explanations must remain concealed after a company changes its profile.
export async function contractorIdentifiers(sql:Sql,organisationId:string):Promise<string[]> {
  const company=await sql.query(`SELECT name AS value FROM organisations WHERE id=$1
    UNION SELECT contact FROM contractor_profiles WHERE organisation_id=$1
    UNION SELECT snapshot->>'name' FROM contractor_profile_versions WHERE organisation_id=$1
    UNION SELECT snapshot->>'contact' FROM contractor_profile_versions WHERE organisation_id=$1
    UNION SELECT before_value->>'name' FROM audit_events WHERE resource_id=$1 AND action='verification.profile'`,[organisationId]);
  const people=await sql.query('SELECT u.name,u.email FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organisation_id=$1',[organisationId]);
  return [...new Set([...company.map(c=>c.value),...people.flatMap(p=>[p.name,p.email])].filter(value=>typeof value==='string'&&value.trim()).map(String))].sort((a,b)=>b.length-a.length);
}
export function concealedText(value:string,identifiers:string[]):string {
  return identifiers.reduce((text,name)=>text.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'[identity concealed]'),value)
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g,'[contact concealed]').replace(/(?:\+65\s*)?[689]\d{3}[ -]?\d{4}\b/g,'[contact concealed]');
}
