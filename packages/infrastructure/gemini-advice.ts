import type {AdviceProvider,AdviceResult,Evidence} from '../domain/advice-service.js';

// Fixed provider endpoint; no client-controlled URL, tools, private source text or attachments.
export class GeminiAdviceProvider implements AdviceProvider {
  readonly name:string;
  constructor(private readonly apiKey:string,readonly model='gemini-3.5-flash-lite',private readonly request:typeof fetch=fetch) {
    if(!apiKey.trim()||!/^gemini-[a-z0-9.-]{1,80}$/.test(model))throw new Error('Invalid Gemini server configuration');
    this.name='gemini:'+model;
  }
  async evaluate(evidence:Evidence,signal?:AbortSignal):Promise<AdviceResult> {
    if(evidence.primary==='none'||evidence.quotes.length<2)return {recommendedQuoteId:null,citations:[],origin:'local'};
    const candidates=evidence.quotes.map((q,i)=>({id:'q'+(i+1),priceCents:q.amountCents,availability:q.availability,duration:q.duration,pure:q.pure,priorityScore:q.adjusted,external:q.externalCount,observedJobs:q.quoteFixCount}));
    const data=JSON.stringify({primary:evidence.primary,secondary:evidence.secondary,candidates});
    if(candidates.length>100||Buffer.byteLength(data)>32768)throw new Error('Comparison exceeds the bounded AI input; manual comparison remains available');
    const ids=candidates.map(q=>q.id),schema={type:'object',additionalProperties:false,required:['recommendedQuoteId','citations'],properties:{
      recommendedQuoteId:{type:['string','null'],enum:[null,...ids]},citations:{type:'array',maxItems:100,items:{type:'string',enum:ids}}}};
    const response=await this.request('https://generativelanguage.googleapis.com/v1/interactions',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':this.apiKey},redirect:'error',...(signal?{signal}:{}),
      body:JSON.stringify({model:this.model,store:false,
        system_instruction:'Compare only supplied facts. Return candidate IDs and supporting candidate citations, or null. No preference means null. Primary priority first, secondary breaks ties. Lower total price uses current price; earlier availability uses same_day < next_day < 2_3_days < 4_7_days. Unknown/custom availability cannot be ordered. Workmanship uses the supplied priorityScore only when every candidate has one. Missing history is unknown. Similar experience/less disruption have no comparable evidence here: return null. Never infer present availability from historical timeliness or present price from historical value. Return no invented history, identities or explanations.',
        input:data,generation_config:{max_output_tokens:256,thinking_level:'minimal'},response_format:{type:'text',mime_type:'application/json',schema}})
    });
    if(!response.ok)throw new Error('Gemini request failed'); // Provider bodies/headers can contain private material; never surface them.
    const declared=Number(response.headers.get('content-length')??0);if(declared>65536)throw new Error('Gemini response is too large');
    if(!response.body)throw new Error('Gemini returned no body');
    const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
    try {while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>65536)throw new Error('Gemini response is too large');chunks.push(next.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    const parse=(text:string):unknown=>{try{return JSON.parse(text);}catch{throw new Error('Gemini returned invalid structured JSON');}};
    const payload=parse(Buffer.concat(chunks).toString('utf8')) as {status?:string;steps?:{type?:string;content?:{type?:string;text?:string}[]}[]}|null;
    if(!payload||payload.status!=='completed'||!Array.isArray(payload.steps))throw new Error('Gemini did not complete the structured response');
    const blocks=payload.steps.filter(s=>s?.type==='model_output').at(-1)?.content;
    if(!Array.isArray(blocks)||blocks.some(c=>!c||c.type==='text'&&typeof c.text!=='string'))throw new Error('Gemini returned invalid content');
    const output=blocks?.filter(c=>c.type==='text').map(c=>c.text??'').join('');if(!output)throw new Error('Gemini returned no structured answer');
    const result=parse(output) as Record<string,unknown>|null;
    if(!result||typeof result!=='object'||Array.isArray(result)||Object.keys(result).some(k=>!['recommendedQuoteId','citations'].includes(k))||
      !(result.recommendedQuoteId===null||typeof result.recommendedQuoteId==='string'&&ids.includes(result.recommendedQuoteId))||
      !Array.isArray(result.citations)||result.citations.some(c=>typeof c!=='string'||!ids.includes(c)))throw new Error('Gemini returned unsupported evidence');
    const original=(short:string)=>evidence.quotes[ids.indexOf(short)]!.quoteId;
    return {recommendedQuoteId:result.recommendedQuoteId===null?null:original(String(result.recommendedQuoteId)),citations:(result.citations as string[]).map(original),origin:'provider'};
  }
}
