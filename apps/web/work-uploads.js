(() => {
  'use strict';
  function indexedStore() {
    const opened=new Promise((resolve,reject)=>{
      const req=indexedDB.open('quotefix-work-uploads',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('files',{keyPath:'key'});
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    async function run(mode,action) {
      const db=await opened;return new Promise((resolve,reject)=>{
        const tx=db.transaction('files',mode),req=action(tx.objectStore('files'));let value;
        req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
    }
    return {get:key=>run('readonly',s=>s.get(key)),put:row=>run('readwrite',s=>s.put(row)),remove:key=>run('readwrite',s=>s.delete(key))};
  }
  window.qfWorkUploads={create({api,submit,scope,current,online,store=indexedStore(),intent}) {
    const key=(jobId,purpose,slot)=>JSON.stringify([scope(),jobId,purpose,slot]);
    const valid=(partition,jobId)=>{if(scope()!==partition||!current(jobId))throw new Error('Account or job changed. Reopen this attachment in its own context.');};
    const locks=new Map();
    async function exclusive(id,action) {
      const work=(locks.get(id)||Promise.resolve()).catch(()=>{}).then(action);locks.set(id,work);
      try{return await work;}finally{if(locks.get(id)===work)locks.delete(id);}
    }
    return {
      async get(jobId,purpose,slot) {const partition=scope(),row=await store.get(key(jobId,purpose,slot));valid(partition,jobId);return row;},
      async remember(jobId,purpose,slot,row) {const partition=scope(),id=key(jobId,purpose,slot);return exclusive(id,async()=>{valid(partition,jobId);const saved={...row,key:id,jobId,purpose};await store.put(saved);return saved;});},
      async queue(jobId,purpose,slot,file) {
        const partition=scope(),id=key(jobId,purpose,slot);return exclusive(id,async()=>{
        if(!file||!['application/pdf','image/png','image/jpeg'].includes(file.type)||!file.size||file.size>10485760)throw new Error('Choose a PDF or image up to 10 MiB.');
        valid(partition,jobId);const bytes=new Uint8Array(await file.arrayBuffer());
        const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');valid(partition,jobId);
        const prior=await store.get(id);valid(partition,jobId);
        const row=prior?.checksum===checksum?{...prior,file}:{key:id,jobId,purpose,file,checksum,mediaType:file.type,byteSize:file.size,state:'device'};
        await store.put(row);return row;
        });
      },
      async remove(jobId,purpose,slot) {const partition=scope(),id=key(jobId,purpose,slot);await exclusive(id,async()=>{valid(partition,jobId);await store.remove(id);});},
      async resume(jobId,purpose,slot) {
        if(!online())throw new Error('Attachment saved on this device. Connect and choose Attach / resume to upload.');
        const partition=scope(),id=key(jobId,purpose,slot);return exclusive(id,async()=>{let row=await store.get(id);valid(partition,jobId);
        if(!row)throw new Error('Choose an attachment first.');
        if(!row.uploadId) {
          const route=purpose==='evidence'?'work/uploads':'completion/uploads';
          const body={mediaType:row.mediaType,byteSize:row.byteSize,checksum:row.checksum,...(purpose==='evidence'?{}:{purpose})};
          const created=intent?await intent(jobId,purpose,{mediaType:row.mediaType,byteSize:row.byteSize,checksum:row.checksum}):await submit('workspaces/'+jobId+'/'+route,body,0);valid(partition,jobId);
          row={...row,uploadId:created.uploadId};await store.put(row);
        }
        let result=await api('uploads/'+row.uploadId);valid(partition,jobId);
        if(result.state==='transferring') {
          if(!row.file)throw new Error('Choose the same file to resume the missing bytes.');
          const bytes=new Uint8Array(await row.file.arrayBuffer());valid(partition,jobId);await api('uploads/'+row.uploadId+'/renew',{});
          for(let offset=0;offset<bytes.length;offset+=262144) {
            valid(partition,jobId);if(result.chunks.some(c=>c.byte_offset===offset))continue;
            let binary='';for(const byte of bytes.slice(offset,offset+262144))binary+=String.fromCharCode(byte);
            await api('uploads/'+row.uploadId+'/chunks',{offset,bytes:btoa(binary)});
          }
          valid(partition,jobId);await submit('uploads/'+row.uploadId+'/finalize',{},0);result=await api('uploads/'+row.uploadId);valid(partition,jobId);
        }
        row={...row,state:result.state,objects:result.objects};
        if(result.state==='ready')delete row.file; // Ready business files stay on the server; temporary queued bytes are no longer needed.
        await store.put(row);return row;
        });
      }
    };
  }};
})();
