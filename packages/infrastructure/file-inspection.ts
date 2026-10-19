import sharp from 'sharp';
import {execFile} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
export type ScanResult='clean'|'infected'|'unavailable';
export interface FileInspector {scan(bytes:Buffer):Promise<ScanResult>}
export function localFileInspector(path=process.env.CLAMSCAN_PATH):FileInspector {
  return {scan:async(bytes)=>{
    if(!path)return 'unavailable';
    const directory=await mkdtemp(join(tmpdir(),'quotefix-scan-'));
    try {
      const file=join(directory,'upload');await writeFile(file,bytes,{mode:0o600});
      return await new Promise<ScanResult>(resolve=>execFile(path,['--no-summary',file],{timeout:30000,windowsHide:true,maxBuffer:4096},error=>{
        if(!error)resolve('clean');else if(error.code===1)resolve('infected');else resolve('unavailable');
      }));
    } finally {
      // Only this locally created, fixed-prefix temporary directory is removed.
      const target=resolve(directory),root=resolve(tmpdir());
      if(dirname(target)!==root||!basename(target).startsWith('quotefix-scan-'))throw new Error('Unexpected scan temporary path');
      await rm(target,{recursive:true,force:true});
    }
  }};
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
