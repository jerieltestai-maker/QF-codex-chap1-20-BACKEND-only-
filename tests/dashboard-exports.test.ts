import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';

test('CH18 canonical dashboards, snapshots, privacy and revocation',async t=>{
  const f=await completionFixture();
  const drain=async()=>{for(let i=0;i<500;i++){const w=await f.worker.claim();if(!w)break;await f.worker.process(w);}};
  const version=async(id:string,c=f.cm)=>f.okay(await f.get('workspaces/'+id,c)).job.version;
  const request=async(id:string,c=f.cm,format='json')=>f.okay(await f.post('workspaces/'+id+'/exports',{format},c,await version(id)));
  const grant=async(id:string,c=f.cm)=>f.okay(await f.post('exports/'+id+'/grant',{},c));
  const download=async(id:string,c=f.cm)=>{const g=await grant(id,c);return f.get(g.url.slice('/api/v1/'.length),c);};
  try {
    const id=await f.prepared();
    await t.test('CH18-T01/T10: canonical queue, API filters, pages and forbidden actions',async()=>{
      const cm=f.okay(await f.get('dashboard/tickets?q='+id,f.cm));assert.equal(cm.total,1);assert.equal(cm.items[0].jobId,id);
      const mcst=f.okay(await f.get('dashboard/tasks',f.mcst));assert.ok(mcst.items.some((r:{jobId:string;ownerRole:string})=>r.jobId===id&&r.ownerRole==='mcst'));
      const contractor=f.okay(await f.get('dashboard/tickets',f.contractor));assert.ok(contractor.items.some((r:{jobId:string})=>r.jobId===id));
      assert.equal((await f.get('dashboard/tickets?limit=0',f.cm)).statusCode,422);
      assert.equal((await f.post('workspaces/'+id+'/payments/confirm-invoice',{invoiceVersion:1,amountSgd:'100.00',confirmed:true},f.cm,await version(id))).statusCode,403);
      const empty=f.okay(await f.get('dashboard/tickets?q=unfindable',f.cm));assert.deepEqual(empty.items,[]);assert.equal(empty.total,0);
      assert.equal(f.okay(await f.get('dashboard/tickets?limit=1&offset=1',f.cm)).items.length,0);
    });
    await t.test('CH18-T02: several bells never duplicate or complete the actual task',async()=>{
      await drain();const before=f.okay(await f.get('dashboard/tasks',f.mcst));
      const [task]=await f.db.query("SELECT id FROM tasks WHERE resource_id=$1 AND owner_role='mcst' AND status='open' ORDER BY id LIMIT 1",[id]);assert.ok(task);
      await f.db.query("INSERT INTO notifications VALUES($1,$2,$3,'Repeated reminder','test',$4)",[randomUUID(),task.id,randomUUID(),f.now().toISOString()]);
      const bells=f.okay(await f.get('notifications',f.mcst));
      for(const n of bells.notifications)f.okay(await f.post('notifications/'+n.id+'/read',{},f.mcst));
      const after=f.okay(await f.get('dashboard/tasks',f.mcst));assert.equal(after.total,before.total);assert.equal(after.items.filter((r:{taskId:string})=>r.taskId===task.id).length,1);
    });
    await t.test('CH18-T03: concealed identity absent from JSON, HTML, filenames and nested snapshots',async()=>{
      const e=f.okay(await f.get('estates/'+ids.estate,f.mcst));
      f.okay(await f.post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:false,reason:'Conceal for export verification'},f.mcst,e.version));
      for(const format of ['json','html']) {
        const x=await request(id,f.cm,format);await drain();const r=await download(x.exportId);assert.equal(r.statusCode,200,r.body);
        assert.ok(!r.body.includes('Fictional Pending Contractor'));assert.ok(!r.body.includes(ids.organisation));assert.ok(!r.body.includes('contractor@example.test'));
        assert.ok(r.body.includes('10000'));assert.ok(!r.body.includes('fee_entries'));assert.ok(!String(r.headers['content-disposition']).includes('Contractor'));
        if(format==='html'){assert.ok(r.body.startsWith('<!doctype html>'));assert.ok(String(r.headers['content-security-policy']).includes('sandbox'));}
      }
    });
    await t.test('CH18-T04: contractor pack contains only own quote and never estate selection rationale',async()=>{
      const x=f.okay(await f.post('workspaces/'+id+'/exports',{format:'json'},f.contractor,await version(id)));await drain();
      const r=await download(x.exportId,f.contractor);assert.equal(r.statusCode,200,r.body);const p=r.json();assert.equal(p.quotes.length,1);assert.deepEqual(p.selections,[]);assert.deepEqual(p.approvals,[]);
      assert.ok(p.history.some((e:{action:string})=>e.action==='work.start'));assert.ok(p.history.every((e:{action:string})=>!e.action.startsWith('selection.')));
      assert.ok(!r.body.includes('Factual selection'));assert.ok(!r.body.includes('fee_entries'));
      assert.equal((await f.get('exports/'+x.exportId,f.mcst)).statusCode,404);
    });
    await t.test('CH18-T05: confidential subject cannot discover a case through counts/search/exports',async()=>{
      const description='Confidential-canary-'+randomUUID();
      const secret=f.okay(await f.post('workspaces/'+id+'/cases',{description,category:'confidential_conduct',privacy:'confidential',subjectUserIds:[ids.mcst],subjectOrganisationIds:[]},f.cm,await version(id)));
      const queue=f.okay(await f.get('dashboard/tasks?q='+encodeURIComponent(description),f.mcst));assert.equal(queue.total,0);
      const x=await request(id,f.mcst);await drain();const r=await download(x.exportId,f.mcst);assert.equal(r.statusCode,200,r.body);assert.ok(!r.body.includes(description));assert.ok(!r.body.includes(secret.supportId));
    });
    await t.test('CH18-T07: later changes do not mutate bytes or the recorded decision snapshot',async()=>{
      const x=await request(id);await drain();const before=await download(x.exportId);assert.equal(before.statusCode,200,before.body);
      await f.db.query('UPDATE job_records SET version=version+1 WHERE id=$1',[id]);
      const state=f.okay(await f.get('exports/'+x.exportId,f.cm));assert.equal(state.hasLaterChanges,true);
      const after=await download(x.exportId);assert.equal(after.body,before.body);assert.equal(after.headers['x-content-sha256'],before.headers['x-content-sha256']);
      await assert.rejects(f.db.query("UPDATE decision_exports SET snapshot='{}' WHERE id=$1",[x.exportId]),/immutable|append|preserv|modif/i);
    });
    await t.test('CH18-T08: production analytics reject fictional records and never infer unanswered outcomes',async()=>{
      const a=f.okay(await f.get('workspaces/'+id+'/analytics',f.cm));assert.equal(a.dataOrigin,'fictional');assert.ok(a.metrics.definition.includes('Missing Feedback'));assert.equal(a.metrics.payments.length,0);
      await f.db.query("UPDATE deployment_identity SET environment='production'");
      const b=f.okay(await f.get('workspaces/'+id+'/analytics',f.cm));assert.equal(b.excluded,true);assert.equal(b.metrics,null);
      await f.db.query("UPDATE deployment_identity SET environment='test'");
    });
    await t.test('CH18-T06: expired and explicitly revoked grants cannot retrieve a file',async()=>{
      const x=await request(id);await drain();const g=await grant(x.exportId);f.okay(await f.post('exports/'+x.exportId+'/revoke',{},f.cm));assert.equal((await f.get(g.url.slice(8),f.cm)).statusCode,404);
      const g2=await grant(x.exportId);await f.db.query("UPDATE export_grants SET expires_at='2026-01-01'");assert.equal((await f.get(g2.url.slice(8),f.cm)).statusCode,404);
    });
    await t.test('CH18-T06: concealment changes invalidate queued generation and an already-generated download',async()=>{
      let e=f.okay(await f.get('estates/'+ids.estate,f.mcst));f.okay(await f.post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:true,reason:'Unmasked baseline'},f.mcst,e.version));
      const ready=await request(id);await drain();const g=await grant(ready.exportId),queued=await request(id);
      e=f.okay(await f.get('estates/'+ids.estate,f.mcst));f.okay(await f.post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:false,reason:'Tighten concealment after request'},f.mcst,e.version));
      assert.equal((await f.get(g.url.slice(8),f.cm)).statusCode,404);await drain();assert.equal((await f.db.query('SELECT export_id FROM export_results WHERE export_id=$1',[queued.exportId])).length,0);
      assert.equal((await f.get('exports/'+ready.exportId,f.cm)).statusCode,404);
    });
    await t.test('CH18-T01/T02: an available approval stays actionable even when its reminder is in the future',async()=>{
      const rows=f.okay(await f.get('dashboard/tasks',f.mcst));
      const actions=rows.items.filter((r:{kind:string})=>r.kind==='payment.send');assert.ok(actions.length>0);
      for(const row of actions)assert.equal(row.state,'actionable');
    });
    await t.test('CH18-T06: revoked membership after request blocks generation and download',async()=>{
      const x=await request(id,f.peer);await f.db.query('UPDATE memberships SET active=false WHERE id=$1',[ids.mcst2]);await drain();
      assert.equal((await f.db.query('SELECT * FROM export_results WHERE export_id=$1',[x.exportId])).length,0);
      const [outbox]=await f.db.query("SELECT last_error_code FROM outbox WHERE resource_id=$1 AND kind='export.generate'",[x.exportId]);assert.equal(outbox!.last_error_code,'EXPORT_ACCESS_REVOKED');
      assert.notEqual((await f.get('exports/'+x.exportId,f.peer)).statusCode,200);
    });
  }finally{await f.close();}
});
