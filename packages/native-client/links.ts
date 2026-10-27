// Development custom links identify a resource only. They never contain authority or a command.
export function ticketFromLink(value:string):string|undefined {
  try {
    const url=new URL(value);
    if(url.protocol!=='quotefix:'||url.hostname!=='ticket'||url.username||url.password||url.port||url.search||url.hash)return;
    const id=url.pathname.slice(1);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)?id:undefined;
  }catch{return;}
}
