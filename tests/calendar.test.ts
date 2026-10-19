import {test} from 'node:test';
import assert from 'node:assert/strict';
import {businessDayDue,dateExpiry,sourcingDue,feedbackDue,remainingBusinessMs,resumeBusinessDue,singaporeInstant,urgentCheckpoint,type HolidayCalendar} from '../packages/domain/calendar.js';
const calendar:HolidayCalendar={version:'fixture',firstYear:2026,lastYear:2026,holidays:new Set(['2026-11-09'])};
test('CH04-T01: skip trigger Friday, weekend and Monday holiday; cutoff is Singapore 23:59',()=>{
  assert.equal(businessDayDue(new Date('2026-11-06T10:00:00+08:00'),1,calendar).toISOString(),'2026-11-10T15:59:00.000Z');
  assert.throws(()=>businessDayDue(new Date('2026-12-31T00:00:00+08:00'),1,calendar),/calendar coverage/);
});
test('Date-only expiry, noon sourcing and date-only Feedback use distinct confirmed anchors',()=>{
  assert.equal(dateExpiry('2026-10-13').toISOString(),'2026-10-13T16:00:00.000Z');
  assert.equal(sourcingDue(new Date('2026-12-01T23:59:00+08:00')).toISOString(),'2026-12-03T04:00:00.000Z');
  assert.equal(feedbackDue('2026-10-13').toISOString(),'2026-11-12T01:00:00.000Z');
});
test('T17 primitive retains remaining eligible business time through holiday pause and multiple resumes',()=>{
  const anchor=new Date('2026-11-05T12:00:00+08:00'),start=singaporeInstant('2026-11-06');
  const due=businessDayDue(anchor,5,calendar),pause=new Date('2026-11-06T12:00:00+08:00');
  const budget=remainingBusinessMs(pause,due,calendar,start);
  assert.equal(budget,4.5*86400000-60000);
  const resumed=resumeBusinessDue(new Date('2026-11-10T12:00:00+08:00'),budget,calendar,start);
  assert.equal(resumed.toISOString(),'2026-11-16T15:59:00.000Z');
  const nextPause=new Date('2026-11-11T12:00:00+08:00');
  const rest=remainingBusinessMs(nextPause,resumed,calendar,start);
  assert.equal(rest,budget-86400000);
  assert.equal(resumeBusinessDue(new Date('2026-11-12T12:00:00+08:00'),rest,calendar,start).toISOString(),'2026-11-17T15:59:00.000Z');
  assert.equal(remainingBusinessMs(new Date('2026-11-20T12:00:00+08:00'),due,calendar,start),0);
});
test('Approved urgent cadence stays anchored and coalesces missed steps',()=>{
  const anchor=new Date('2026-10-13T00:00:00Z');
  for(const [hour,nextHour] of [[0.25,1],[1,3],[3,10],[10,17],[25,31]])
    assert.equal(urgentCheckpoint(anchor,new Date(anchor.getTime()+hour!*3600000)).nextDue.getTime(),anchor.getTime()+nextHour!*3600000);
});
