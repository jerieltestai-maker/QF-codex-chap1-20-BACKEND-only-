import {createHash, randomBytes, scrypt, timingSafeEqual} from 'node:crypto';

import {mkdir, writeFile} from 'node:fs/promises';
import type {Config} from './config.js';
import {AppError} from '../contracts/primitives.js';
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve,reject) => scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},
    (error,key)=>error ? reject(error) : resolve(key)));
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 15 || password.length > 128) throw new AppError(422,'FIELD_VALIDATION','Use a password of 15–128 characters');
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt);
  return salt + ':' + hash.toString('hex');
}
export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const hash = await derive(password, salt);
  const bytes = Buffer.from(expected, 'hex');
  return bytes.length === hash.length && timingSafeEqual(bytes, hash);
}
export interface SecurityMail {to: string; purpose: 'verify' | 'recover' | 'invite'; token: string;}
export interface Mailbox {send(mail: SecurityMail): Promise<void>;}
export function localMailbox(config: Config): Mailbox {
  if (!['development','test'].includes(config.environment)) throw new Error('Local mailbox prohibited');
  return {send: async mail => {
    const folder = 'work/security-mailbox';
    await mkdir(folder, {recursive: true});
    await writeFile(`${folder}/${Date.now()}-${randomBytes(4).toString('hex')}.json`, JSON.stringify(mail, null, 2), {mode: 0o600});
  }};
}
