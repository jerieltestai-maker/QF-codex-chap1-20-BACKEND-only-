import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {Directory,File,Paths} from 'expo-file-system';
import type {PendingUpload} from '../../packages/native-client/client';
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
  await db.execAsync('CREATE TABLE IF NOT EXISTS drafts(id TEXT PRIMARY KEY,account TEXT NOT NULL,context TEXT NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS uploads(id TEXT PRIMARY KEY,account TEXT NOT NULL,context TEXT NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS device_owner(id INTEGER PRIMARY KEY CHECK(id=1),account TEXT NOT NULL);');
  return {
    async owner(){return (await db.getFirstAsync<{account:string}>('SELECT account FROM device_owner WHERE id=1'))?.account;},
    async setOwner(account:string){await db.runAsync('INSERT OR REPLACE INTO device_owner VALUES(1,?)',[account]);},
    async drafts(account:string,context:string){return (await db.getAllAsync<{payload:string}>('SELECT payload FROM drafts WHERE account=? AND context=?',[account,context])).map(r=>JSON.parse(r.payload) as Draft);},
    async uploads(account:string,context:string){return (await db.getAllAsync<{payload:string}>('SELECT payload FROM uploads WHERE account=? AND context=?',[account,context])).map(r=>JSON.parse(r.payload) as PendingUpload);},
    async saveDraft(d:Draft){await db.runAsync('INSERT OR REPLACE INTO drafts VALUES(?,?,?,?)',[d.id,d.accountId,d.contextId,JSON.stringify(d)]);},
    async removeDraft(id:string){await db.runAsync('DELETE FROM drafts WHERE id=?',[id]);},
    async saveUpload(u:PendingUpload){await db.runAsync('INSERT OR REPLACE INTO uploads VALUES(?,?,?,?)',[u.id,u.accountId,u.contextId,JSON.stringify(u)]);},
    async removeUpload(id:string){await db.runAsync('DELETE FROM uploads WHERE id=?',[id]);},
    async copyFile(uri:string,id:string,extension:string){
      if(!/^[a-f0-9-]{36}$/.test(id)||!['jpg','png','pdf'].includes(extension))throw new Error('Invalid capture reference');
      const root=directory();root.create({idempotent:true,intermediates:true});const target=new File(root,id+'.'+extension);new File(uri).copy(target);return target.uri;
    },
    async clear(){
      await db.withTransactionAsync(async()=>{await db.runAsync('DELETE FROM drafts');await db.runAsync('DELETE FROM uploads');await db.runAsync('DELETE FROM device_owner');});
      const root=directory();if(root.exists)root.delete();
    },
    close:()=>db.closeAsync()
  };
}
export type DeviceStore=Awaited<ReturnType<typeof deviceStore>>;
