import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import {base64url,NativeClient,type NativeSession} from '../../packages/native-client/client';
const key='quotefix-native-session';
export async function readSession():Promise<NativeSession|undefined>{const value=await SecureStore.getItemAsync(key);if(!value)return;try{return JSON.parse(value) as NativeSession;}catch{await SecureStore.deleteItemAsync(key);}}
export const forgetSession=()=>SecureStore.deleteItemAsync(key);
export async function signIn(baseUrl:string) {
  const verifier=base64url(Crypto.getRandomBytes(32)),state=base64url(Crypto.getRandomBytes(32));
  const digest=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,verifier,{encoding:Crypto.CryptoEncoding.BASE64});
  const challenge=digest.replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  // External system browser, no password form in the native app or embedded web view.
  const result=await WebBrowser.openAuthSessionAsync(baseUrl+'/native/authorize?'+new URLSearchParams({challenge,state}),'quotefix://auth');
  if(result.type!=='success')throw new Error('Sign-in was interrupted. Start again when ready.');
  const url=new URL(result.url);
  if(url.protocol!=='quotefix:'||url.hostname!=='auth'||url.pathname!==''||url.searchParams.get('state')!==state)throw new Error('Sign-in return could not be verified.');
  const session=await new NativeClient(baseUrl,undefined).request<NativeSession>('native/token',{code:url.searchParams.get('code'),verifier,redirectUri:'quotefix://auth'});
  await SecureStore.setItemAsync(key,JSON.stringify(session),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});return session;
}
