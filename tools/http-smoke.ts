import assert from 'node:assert/strict';
const origin=process.argv[2] ?? 'http://127.0.0.1:3000';
if (!/^http:\/\/127\.0\.0\.1:300[01]$/.test(origin)) throw new Error('Smoke test only permits local development ports');
assert.equal((await fetch(origin+'/health/ready')).status,200);
const page=await fetch(origin+'/');assert.equal(page.status,200);
assert.match(await page.text(),/QuoteFix/);
for (const email of ['cm@example.test','mcst@example.test']) {
  const signed=await fetch(origin+'/api/v1/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({email,password:'Fictional-dev-only-2026!'})});
  assert.equal(signed.status,200);
  const cookie=signed.headers.get('set-cookie')!.split(';')[0]!;
  const context=await fetch(origin+'/api/v1/me/context',{headers:{Cookie:cookie}});
  const data=await context.json();
  assert.equal(data.capabilities['payment.record'],email.startsWith('mcst'));
  const other=await fetch(origin+'/api/v1/estates/20000000-0000-4000-8000-000000000002',{headers:{Cookie:cookie}});
  assert.equal(other.status,404);
  const logout=await fetch(origin+'/api/v1/auth/logout',{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':data.csrfToken,'Content-Type':'application/json'},body:'{}'});
  assert.equal(logout.status,200);
}
console.log('Live HTTP smoke passed: health, page, two independent account sessions, role permissions, estate isolation and logout.');
