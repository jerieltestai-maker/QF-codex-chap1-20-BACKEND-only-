import {AppError,dateOnly,utcInstant} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
const DAY=86400000, OFFSET=8*3600000;
export interface HolidayCalendar {version:string; firstYear:number; lastYear:number; holidays:Set<string>}
export function singaporeDate(instant:Date):string {return new Date(instant.getTime()+OFFSET).toISOString().slice(0,10);}
export function singaporeInstant(day:string,time='00:00:00'):Date {return new Date(dateOnly(day)+'T'+time+'+08:00');}
export function nextDate(day:string,n=1):string {return new Date(Date.parse(dateOnly(day)+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);}
export function isBusinessDate(day:string,calendar:HolidayCalendar):boolean {
  const year=Number(day.slice(0,4));
  if (year<calendar.firstYear || year>calendar.lastYear) throw new AppError(503,'CALENDAR_UNAVAILABLE','Verified holiday calendar coverage is required');
  const weekday=new Date(day+'T00:00:00Z').getUTCDay();
  return weekday!==0 && weekday!==6 && !calendar.holidays.has(day);
}
export function businessDayDue(anchor:Date,count:number,calendar:HolidayCalendar):Date {
  if (!Number.isInteger(count)||count<1) throw new Error('Positive business-day count required');
  let day=singaporeDate(anchor);
  while(count>0) {day=nextDate(day);if(isBusinessDate(day,calendar))count--;}
  return singaporeInstant(day,'23:59:00');
}
export function dateExpiry(day:string):Date {return singaporeInstant(nextDate(day));}
export function sourcingDue(anchor:Date):Date {return singaporeInstant(nextDate(singaporeDate(anchor),2),'12:00:00');}
export function feedbackDue(day:string):Date {return singaporeInstant(nextDate(day,30),'09:00:00');}
export function urgentCheckpoint(anchor:Date,now:Date):{offsetMinutes:number;nextDue:Date} {
  const elapsed=(now.getTime()-anchor.getTime())/60000;
  const offsetMinutes=elapsed<60?15:elapsed<180?60:180+Math.max(0,Math.floor((elapsed-180)/420))*420;
  const nextMinutes=offsetMinutes===15?60:offsetMinutes===60?180:offsetMinutes+420;
  return {offsetMinutes,nextDue:new Date(anchor.getTime()+nextMinutes*60000)};
}
export function explicitInstant(value:string):Date {
  try {
    if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value))throw new Error('Invalid instant');
    dateOnly(value.slice(0,10));
    return new Date(utcInstant(value));
  } catch {throw new AppError(422,'FIELD_VALIDATION','Supply a valid date and time with timezone');}
}
export async function loadCalendar(sql:Sql,version='SG-MOM-2026-2027-v1'):Promise<HolidayCalendar> {
  const [row]=await sql.query('SELECT * FROM holiday_calendars WHERE version=$1',[version]);
  if(!row)throw new AppError(503,'CALENDAR_UNAVAILABLE','Verified holiday calendar coverage is required');
  return {version,firstYear:Number(row.first_year),lastYear:Number(row.last_year),holidays:new Set(row.holidays as string[])};
}
// Pause budgets count only eligible Singapore dates, preserving sub-day time.
// Initial anchor date is skipped even when the pause happens before its next midnight.
export function remainingBusinessMs(from:Date,due:Date,calendar:HolidayCalendar,start:Date):number {
  let cursor=Math.max(from.getTime(),start.getTime()),remaining=0;
  while(cursor<due.getTime()) {
    const day=singaporeDate(new Date(cursor));
    const end=Math.min(singaporeInstant(nextDate(day)).getTime(),due.getTime());
    if(isBusinessDate(day,calendar))remaining+=end-cursor;
    cursor=end;
  }
  return remaining;
}
export function resumeBusinessDue(at:Date,remaining:number,calendar:HolidayCalendar,start:Date):Date {
  if(remaining<0||!Number.isFinite(remaining))throw new Error('Invalid remaining time');
  let cursor=Math.max(at.getTime(),start.getTime());
  while(remaining>0) {
    const day=singaporeDate(new Date(cursor)),end=singaporeInstant(nextDate(day)).getTime();
    if(isBusinessDate(day,calendar)) {
      if(remaining<=end-cursor)return new Date(cursor+remaining);
      remaining-=end-cursor;
    }
    cursor=end;
  }
  return new Date(cursor);
}
