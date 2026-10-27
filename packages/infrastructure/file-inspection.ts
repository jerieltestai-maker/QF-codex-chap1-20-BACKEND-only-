import sharp from 'sharp';
import {execFile} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
export type ScanResult='clean'|'infected'|'unavailable';
export interface FileInspector {scan(bytes:Buffer):Promise<ScanResult>}
function commandInspector(path:string|undefined,args:(file:string)=>string[],infectedCode?:number):FileInspector {
  return {scan:async(bytes)=>{
    if(!path)return 'unavailable';
    const directory=await mkdtemp(join(tmpdir(),'quotefix-scan-'));
    try {
      const file=join(directory,'upload');await writeFile(file,bytes,{mode:0o600});
      return await new Promise<ScanResult>(resolve=>execFile(path,args(file),{timeout:30000,windowsHide:true,maxBuffer:4096},error=>{
        if(!error)resolve('clean');else if(infectedCode!==undefined&&error.code===infectedCode)resolve('infected');else resolve('unavailable');
      }));
    } finally {
      // Only this locally created, fixed-prefix temporary directory is removed.
      const target=resolve(directory),root=resolve(tmpdir());
      if(dirname(target)!==root||!basename(target).startsWith('quotefix-scan-'))throw new Error('Unexpected scan temporary path');
      await rm(target,{recursive:true,force:true});
    }
  }};
}
export function localFileInspector(path=process.env.CLAMSCAN_PATH):FileInspector {
  return commandInspector(path,file=>['--no-summary',file],1);
}
export function defenderFileInspector(path=process.env.DEFENDER_PATH??join(process.env.ProgramFiles??'C:/Program Files','Windows Defender','MpCmdRun.exe')):FileInspector {
  // DisableRemediation protects stored evidence. HRESULT failures (including
  // detections) remain blocked, never mistaken for a successful clean scan.
  return commandInspector(path,file=>['-Scan','-ScanType','3','-File',file,'-DisableRemediation','-ReturnHR']);
}
export function configuredFileInspector():FileInspector {
  const provider=process.env.FILE_SCANNER??(process.env.CLAMSCAN_PATH?'clamav':process.platform==='win32'?'defender':'clamav');
  if(provider==='defender'&&process.platform==='win32')return defenderFileInspector();
  if(provider==='clamav')return localFileInspector();
  throw new Error('Configure FILE_SCANNER=clamav, or defender on Windows');
}
export async function validateAndSanitize(bytes:Buffer,mediaType:string):Promise<Buffer|null> {
  if(mediaType==='application/pdf') {
    if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||!bytes.subarray(-2048).includes(Buffer.from('%%EOF')))throw new Error('INVALID_FILE_TYPE');
    // PDFs remain restricted originals; no misleading automatic sanitization claim.
    return null;
  }
  const image=sharp(bytes,{limitInputPixels:25000000,failOn:'warning'});
  const metadata=await image.metadata();
  if(metadata.format!==(mediaType==='image/png'?'png':'jpeg')||(metadata.pages??1)>1)throw new Error('INVALID_FILE_TYPE');
  // Decode/re-encode and strip metadata; humans still review visible identifiers before any future sharing.
  return image.rotate().png().toBuffer();
}
