(() => {
  'use strict';
  // Keep operation identities/fingerprints; private form bodies stay in their own drafts.
  function stable(value) {
    if(Array.isArray(value))return value.map(stable);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
    return value;
  }
  const sameInput=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
  window.qfCommands = {sameInput,create({api,partition,generation,storage,online,digest}) {
    const prefix=scope=>'quotefix:operation:'+scope+':';
    return {
      async submit(route,body,version=0) {
        if(!online())throw new Error('Connect to submit. Your draft remains separate.');
        const scope=partition(),epoch=generation(),key=prefix(scope)+route;
        const signature=await digest(new TextEncoder().encode(JSON.stringify(stable(body))));
        if(epoch!==generation()||scope!==partition())throw new Error('Account or context changed. Review again before submitting.');
        const prior=JSON.parse(storage.getItem(key)||'null');
        if(prior&&prior.signature!==signature)throw new Error('An earlier submission has an uncertain result. Check pending submissions before changing this action.');
        const command=prior||{key:crypto.randomUUID(),signature,version};
        storage.setItem(key,JSON.stringify(command));
        try {const result=await api(route,body,command);storage.removeItem(key);return result;}
        catch(error){if(error.status&&error.status<500)storage.removeItem(key);else error.message+=' Result uncertain; retry unchanged or check pending submissions.';throw error;}
      },
      async recover() {
        if(!online())throw new Error('Connect to check pending submissions.');
        const scope=partition(),epoch=generation(),base=prefix(scope),keys=[];
        for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(base))keys.push(key);}
        const results=[];
        for(const key of keys) {
          const command=JSON.parse(storage.getItem(key)||'null');if(!command)continue;
          try {
            const result=await api('operations/'+command.key);
            if(epoch!==generation()||scope!==partition())throw new Error('Account or context changed. Review again before checking.');
            storage.removeItem(key);results.push({route:key.slice(base.length),result});
          } catch(error) {
            if(epoch!==generation()||scope!==partition())throw error;
            // A missing receipt cannot justify a different decision: preserve its original identity.
            if(error.status===404)results.push({route:key.slice(base.length),result:null});else throw error;
          }
        }
        return results;
      }
    };
  }};
})();
