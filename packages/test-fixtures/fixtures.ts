import type {Database} from '../infrastructure/database.js';
import {hashPassword} from '../infrastructure/local-identity.js';
import {randomUUID} from 'node:crypto';
export const ids = {
  admin:'10000000-0000-4000-8000-000000000001', cm:'10000000-0000-4000-8000-000000000002',
  mcst:'10000000-0000-4000-8000-000000000003', contractor:'10000000-0000-4000-8000-000000000004',
  mcst2:'10000000-0000-4000-8000-000000000005', cm2:'10000000-0000-4000-8000-000000000006',
  estate:'20000000-0000-4000-8000-000000000001', otherEstate:'20000000-0000-4000-8000-000000000002',
  organisation:'30000000-0000-4000-8000-000000000001'
};
export const fixturePassword = 'Fictional-dev-only-2026!';
export async function installFixtures(db:Database, environment:string) {
  // Check both explicit caller environment and persistent DB marker before hashing/writing any fixture.
  if (!['development','test'].includes(environment)) throw new Error('Fictional fixtures are forbidden outside development/test');
  const [marker] = await db.query('SELECT environment FROM deployment_identity');
  if (marker?.environment !== environment) throw new Error('Fixture database environment mismatch');
  const passwordHash = await hashPassword(fixturePassword);
  await db.transaction(async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(734130)');
    await tx.query('INSERT INTO estates(id,name) VALUES($1,$2),($3,$4) ON CONFLICT DO NOTHING',
      [ids.estate,'Fictional Estate Alpha',ids.otherEstate,'Fictional Estate Beta']);
    await tx.query('INSERT INTO organisations(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [ids.organisation,'Fictional Pending Contractor']);
    const actors = [[ids.admin,'admin','Admin',null,null,null],
      [ids.cm,'cm','CM',ids.estate,null,'Block A'],
      [ids.mcst,'mcst','MCST',ids.estate,null,'Chair'],
      [ids.contractor,'contractor','Contractor',null,ids.organisation,null],
      [ids.mcst2,'mcst','MCST Two',ids.estate,null,'Treasurer'],
      [ids.cm2,'cm','CM Two',ids.estate,null,'Block B']];
    for (const [id,role,name,estate,org,label] of actors) {
      const address = name!.toString().toLowerCase().replaceAll(' ','') + '@example.test';
      await tx.query('INSERT INTO users(id,email,name,password_hash,email_verified) VALUES($1,$2,$3,$4,true) ON CONFLICT DO NOTHING',
        [id,address,name,passwordHash]);
      await tx.query('INSERT INTO memberships(id,user_id,role,estate_id,organisation_id,label) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        [id,id,role,estate,org,label]);
    }
    const [integrity]=await tx.query("SELECT to_regclass('integrity_settings') AS name");
    if(integrity?.name)for(const estateId of [ids.estate,ids.otherEstate])await tx.query(`INSERT INTO integrity_settings
      VALUES($1,$2,NULL,1,$3,true,$4,'Explicit fictional fixture setup',$5,'admin','2026-10-18T00:00Z','next_round') ON CONFLICT DO NOTHING`,
      [randomUUID(),estateId,environment==='test'?{quoteRevisionPct:10000,selectedPricePct:10000,variationGrowthPct:10000,minimumQuotes:1}:{quoteRevisionPct:20,selectedPricePct:30,variationGrowthPct:20,minimumQuotes:3},'I understand these warning settings apply from the next RFQ round. Existing jobs will continue to use their previous warning settings.',ids.admin]);
  });
}
