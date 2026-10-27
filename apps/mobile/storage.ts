import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {Directory,File,Paths} from 'expo-file-system';
import type {PendingUpload} from '../../packages/native-client/client';
import {sameLocalOwner,type LocalIdentity} from '../../packages/native-client/local-state';
export interface Draft {id:string;accountId:string;contextId:string;jobId:string|null;kind:'issue'|'quote'|'start';title:string;text:string;location:string;updatedAt:string;operationId?:string;baseVersion?:number;accessVersion?:number}
const directory=()=>new Directory(Paths.document,'quotefix-pending');
export async function deviceStore() {
  const db=await SQLite.openDatabaseAsync('quotefix-drafts.db');
  let key=await SecureStore.getItemAsync('quotefix-draft-key');
  if(!key){key=Array.from(Crypto.getRandomBytes(32),b=>b.toString(16).padStart(2,'0')).join('');await SecureStore.setItemAsync('quotefix-draft-key',key,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}
  if(!/^[a-f0-9]{64}$/.test(key))throw new Error('Local draft key unavailable');
  await db.execAsync(`PRAGMA key = "x'${key}'"`);
  const cipher=await db.getFirstAsync<Record<string,unknown>>('PRAGMA cipher_version');
  if(!cipher)throw new Error('Encrypted draft storage requires a native development build. Expo Go is unsupported.');
  await db.execAsync('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  await db.execAsync('CREATE TABLE IF NOT EXISTS drafts(id TEXT PRIMARY KEY,account TEXT NOT NULL,context TEXT NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS uploads(id TEXT PRIMARY KEY,account TEXT NOT NULL,context TEXT NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS device_owner(id INTEGER PRIMARY KEY CHECK(id=1),account TEXT NOT NULL); CREATE TABLE IF NOT EXISTS local_identity(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL);');
  async function assertOwner(account:string){if((await db.getFirstAsync<{account:string}>('SELECT account FROM device_owner WHERE id=1'))?.account!==account)throw new Error('Account changed. This device write was not saved.');}
  async function assertContext(account:string,context:string){
    await assertOwner(account);const row=await db.getFirstAsync<{payload:string}>('SELECT payload FROM local_identity WHERE id=1');
    const identity=row?JSON.parse(row.payload) as LocalIdentity:undefined;
    if(identity?.accountId!==account||identity.contextId!==context)throw new Error('Account context changed. This device write was not saved.');
  }
  let writes:Promise<unknown>=Promise.resolve();
  function write<T>(operation:()=>Promise<T>){const result=writes.then(operation);writes=result.catch(()=>undefined);return result;}
  return {
    async owner(){return (await db.getFirstAsync<{account:string}>('SELECT account FROM device_owner WHERE id=1'))?.account;},
    async setOwner(account:string){await write(async()=>{await db.runAsync('INSERT OR REPLACE INTO device_owner VALUES(1,?)',[account]);});},
    async identity(binding:string){
      const row=await db.getFirstAsync<{payload:string}>('SELECT payload FROM local_identity WHERE id=1');
      const value=row?JSON.parse(row.payload) as LocalIdentity:undefined,owner=(await db.getFirstAsync<{account:string}>('SELECT account FROM device_owner WHERE id=1'))?.account;
      return sameLocalOwner(value,binding,owner)?value:undefined;
    },
    async rememberIdentity(value:LocalIdentity){await write(async()=>{await assertOwner(value.accountId);await db.runAsync('INSERT OR REPLACE INTO local_identity VALUES(1,?)',[JSON.stringify(value)]);});},
    async drafts(account:string,context:string){return (await db.getAllAsync<{payload:string}>('SELECT payload FROM drafts WHERE account=? AND context=?',[account,context])).map(r=>JSON.parse(r.payload) as Draft);},
    async uploads(account:string,context:string){return (await db.getAllAsync<{payload:string}>('SELECT payload FROM uploads WHERE account=? AND context=?',[account,context])).map(r=>JSON.parse(r.payload) as PendingUpload);},
    async saveDraft(d:Draft){await write(()=>db.withTransactionAsync(async()=>{await assertContext(d.accountId,d.contextId);await db.runAsync('INSERT OR REPLACE INTO drafts VALUES(?,?,?,?)',[d.id,d.accountId,d.contextId,JSON.stringify(d)]);}));},
    async removeDraft(id:string){await write(async()=>{await db.runAsync('DELETE FROM drafts WHERE id=?',[id]);});},
    async saveUpload(u:PendingUpload){await write(()=>db.withTransactionAsync(async()=>{await assertContext(u.accountId,u.contextId);await db.runAsync('INSERT OR REPLACE INTO uploads VALUES(?,?,?,?)',[u.id,u.accountId,u.contextId,JSON.stringify(u)]);}));},
    async removeUpload(id:string){
      await write(async()=>{
      const row=await db.getFirstAsync<{payload:string}>('SELECT payload FROM uploads WHERE id=?',[id]);
      if(row){const upload=JSON.parse(row.payload) as PendingUpload;
        if(!upload.consumed)throw new Error('Keep this capture until the server confirms attachment.');
        const root=directory().uri,uri=upload.localUri;
        if(!/^[a-f0-9-]{36}$/.test(id)||!['jpg','png','pdf'].some(ext=>uri===(root.endsWith('/')?root:root+'/')+id+'.'+ext))throw new Error('Unexpected local capture path');
        const file=new File(uri);if(file.exists)file.delete();
      }
      await db.runAsync('DELETE FROM uploads WHERE id=?',[id]);
      });
    },
    async copyFile(uri:string,id:string,extension:string,account:string,context:string){
      return write(async()=>{
      if(!/^[a-f0-9-]{36}$/.test(id)||!['jpg','png','pdf'].includes(extension))throw new Error('Invalid capture reference');
      await assertContext(account,context);
      const root=directory();root.create({idempotent:true,intermediates:true});const target=new File(root,id+'.'+extension);new File(uri).copy(target);return target.uri;
      });
    },
    async clear(){
      await write(async()=>{
      await db.withTransactionAsync(async()=>{await db.runAsync('DELETE FROM drafts');await db.runAsync('DELETE FROM uploads');await db.runAsync('DELETE FROM device_owner');await db.runAsync('DELETE FROM local_identity');});
      const root=directory();if(root.exists)root.delete();
      });
    },
    close:async()=>{await writes;await db.closeAsync();}
  };
}
export type DeviceStore=Awaited<ReturnType<typeof deviceStore>>;
