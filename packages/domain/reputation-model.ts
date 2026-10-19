import {AppError,requiredText} from '../contracts/primitives.js';

export const formulaVersion='reputation-2026-10-18-v1';
export const formula={version:formulaVersion,points:[0,25,50,75,100],dimensionWeight:100,recommendationWeight:120,primaryMultiplier:125,secondaryMultiplier:110,externalMinimum:5,aggregation:'equal job units',rounding:'one decimal half up'} as const;
export const dimensions=['workmanship','timeliness','customerService','valueForMoney','recommendation'] as const;
export type Dimension=typeof dimensions[number]|'durability';
export type Rubric=Record<typeof dimensions[number],number>;
export interface ScoreUnit {id:string;source:'external'|'quotefix';inspectionEntryId:string;inspectionVersion:number;rubric:Rubric;durability?:number;durabilityEntryId?:string;durabilityVersion?:number}
export function validateRubric(value:Rubric,reason:string) {
  if(dimensions.some(d=>!Number.isInteger(value[d])||value[d]<1||value[d]>5))throw new AppError(422,'FIELD_VALIDATION','Answer all five inspection questions with a 1–5 response');
  if(dimensions.some(d=>value[d]<=2))requiredText(reason);
  return Object.fromEntries(dimensions.map(d=>[d,value[d]])) as Rubric;
}
export function score(units:ScoreUnit[],primary='none',secondary?:string) {
  const rubricDimensions=[...dimensions,'durability'] as const;
  const mapped=(p:string|undefined)=>p&&rubricDimensions.includes(p as Dimension)?p as Dimension:undefined;
  const first=mapped(primary),second=primary==='none'?undefined:mapped(secondary);
  const calculate=(adjusted:boolean)=> {
    if(!units.length)return null;
    let sumNumerator=0n,sumDenominator=1n;
    const gcd=(a:bigint,b:bigint):bigint=>b===0n?a:gcd(b,a%b);
    for(const unit of units) {
      let numerator=0,denominator=0;
      for(const d of rubricDimensions) {
        const rating=d==='durability'?unit.durability:unit.rubric[d];if(rating===undefined)continue;
        const base=d==='recommendation'?120:100,multiplier=adjusted?(d===first?125:d===second?110:100):100,weight=base*multiplier;
        numerator+=(rating-1)*25*weight;denominator+=weight;
      }
      const n=BigInt(numerator),d=BigInt(denominator),nextNumerator=sumNumerator*d+n*sumDenominator,nextDenominator=sumDenominator*d,divisor=gcd(nextNumerator,nextDenominator);
      sumNumerator=nextNumerator/divisor;sumDenominator=nextDenominator/divisor;
    }
    const denominator=sumDenominator*BigInt(units.length);
    return Number((sumNumerator*20n+denominator)/(2n*denominator))/10;
  };
  const breakdown=Object.fromEntries(rubricDimensions.map(d=>{
    const ratings=units.map(u=>d==='durability'?u.durability:u.rubric[d]).filter((n):n is number=>n!==undefined);
    return [d,{points:ratings.length?Math.round(ratings.reduce((n,r)=>n+(r-1)*25,0)/ratings.length*10)/10:null,denominator:ratings.length}];
  }));
  return {pure:calculate(false),adjusted:calculate(true),denominator:units.length,externalCount:units.filter(u=>u.source==='external').length,
    quoteFixCount:units.filter(u=>u.source==='quotefix').length,breakdown,formulaVersion,primary,secondary:secondary??null};
}
