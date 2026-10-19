import {readFileSync} from 'node:fs';
export type Environment = 'development' | 'test' | 'staging' | 'production';
export interface Config {
  environment: Environment; host: string; port: number; origin: string;
  databaseAdapter: 'pglite' | 'postgres'; databasePath: string; databaseUrl?: string;
  identityAdapter: 'local'; sessionHours: number; localAccountHelper: boolean;
  adviceProvider:'local'|'gemini'; geminiModel:string; geminiApiKey?:string;
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const environment = env.APP_ENV;
  if (!['development', 'test', 'staging', 'production'].includes(environment ?? ''))
    throw new Error('APP_ENV must explicitly identify the environment');
  // Managed production identity is a release gate, never silently replaced by the local adapter.
  if (environment === 'production' || environment === 'staging')
    throw new Error('Managed identity integration is required before staging/production');
  if (env.IDENTITY_ADAPTER !== 'local') throw new Error('Set IDENTITY_ADAPTER=local for isolated development');
  const databaseAdapter = env.DATABASE_ADAPTER ?? 'pglite';
  if (!['pglite', 'postgres'].includes(databaseAdapter)) throw new Error('Invalid database adapter');
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const host = env.HOST ?? '127.0.0.1';
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error('Local identity must bind to loopback');
  const origin = env.APP_ORIGIN ?? `http://127.0.0.1:${port}`;
  const parsed = new URL(origin);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.origin !== origin)
    throw new Error('Local identity origin must be a loopback origin without a path');
  if (databaseAdapter === 'postgres' && !env.DATABASE_URL) throw new Error('DATABASE_URL required');
  if (databaseAdapter === 'postgres') {
    const target = new URL(env.DATABASE_URL!);
    if (!['127.0.0.1','localhost'].includes(target.hostname) || !target.pathname.endsWith('_' + environment))
      throw new Error('Local PostgreSQL must be loopback and use an environment-suffixed database');
  }
  if (env.LOCAL_ACCOUNT_HELPER === 'true' && environment !== 'development')
    throw new Error('Local account helper is only permitted in development');
  const adviceProvider=env.ADVICE_PROVIDER??'local',geminiModel=env.GEMINI_MODEL??'gemini-3.5-flash-lite';
  if(!['local','gemini'].includes(adviceProvider)||!/^gemini-[a-z0-9.-]{1,80}$/.test(geminiModel))throw new Error('Invalid advice provider/model configuration');
  let geminiApiKey:string|undefined;
  if(adviceProvider==='gemini') {
    try {geminiApiKey=(env.GEMINI_API_KEY??(env.GEMINI_API_KEY_FILE?readFileSync(env.GEMINI_API_KEY_FILE,'utf8'):'')).trim();}catch{throw new Error('Gemini server key file is unavailable');}
    if(!geminiApiKey)throw new Error('Gemini requires a server-side API key');
  }
  return {environment: environment as Environment, host, port, origin,
    databaseAdapter: databaseAdapter as Config['databaseAdapter'],
    databasePath: env.DATABASE_PATH ?? `work/${environment}-db`,
    ...(env.DATABASE_URL ? {databaseUrl: env.DATABASE_URL} : {}), identityAdapter: 'local', sessionHours: 8, localAccountHelper: env.LOCAL_ACCOUNT_HELPER === 'true',
    adviceProvider:adviceProvider as Config['adviceProvider'],geminiModel,...(geminiApiKey?{geminiApiKey}:{})};
}
