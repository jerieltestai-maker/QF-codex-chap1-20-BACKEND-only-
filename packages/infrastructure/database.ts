import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Config } from './config.js';
import {lockLocalDatabase} from './local-database-lock.js';

export interface Sql {
  exec(sql: string): Promise<void>;
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}
export interface Database extends Sql {
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function openDatabase(config: Config, testSchema?: string): Promise<Database> {
  if (config.databaseAdapter === 'pglite') {
    const release=config.databasePath==='memory://'?undefined:await lockLocalDatabase(config.databasePath);
    const db = new PGlite(config.databasePath);
    await db.waitReady;
    return {
      exec: async sql => {await db.exec(sql);},
      query: async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) =>
        (await db.query<T>(sql, params)).rows,
      transaction: fn => db.transaction(tx => fn({exec: async sql => {await tx.exec(sql);}, query: async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) =>
        (await tx.query<T>(sql, params)).rows})),
      close: async () => {await db.close();await release?.();}
    };
  }
  if (testSchema && (config.environment !== 'test' || !/^qf_test_[0-9a-f]{16}$/.test(testSchema)))
    throw new Error('Invalid isolated test schema');
  const pool = new pg.Pool({connectionString: config.databaseUrl, max: 10,
    ...(testSchema ? {options:'-c search_path=' + testSchema} : {})});
  if (testSchema) await pool.query('CREATE SCHEMA ' + testSchema);
  return {
    exec: async sql => {await pool.query(sql);},
    query: async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) =>
      (await pool.query<T>(sql, params)).rows,
    transaction: async fn => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({exec: async sql => {await client.query(sql);}, query: async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) =>
          (await client.query<T>(sql, params)).rows});
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK'); throw error;
      } finally {client.release();}
    },
    close: async () => {
      try { if (testSchema) await pool.query('DROP SCHEMA ' + testSchema + ' CASCADE'); }
      finally { await pool.end(); }
    }
  };
}
export async function migrate(db: Database, environment: string, through?: string): Promise<void> {
  await db.transaction(async tx => {
    await tx.query('SELECT pg_advisory_xact_lock(734129)');
    await tx.query('CREATE TABLE IF NOT EXISTS deployment_identity (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), environment text NOT NULL)');
    await tx.query('INSERT INTO deployment_identity(environment) VALUES($1) ON CONFLICT DO NOTHING', [environment]);
    const [identity] = await tx.query('SELECT environment FROM deployment_identity');
    if (identity?.environment !== environment) throw new Error('Database environment mismatch; refusing mutation');
    await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const names = (await readdir('database/migrations')).filter(x => x.endsWith('.sql')).sort();
    if (through && !names.includes(through)) throw new Error('Unknown migration target');
    for (const name of names) {
      if (through && name > through) break;
      const sql = await readFile(`database/migrations/${name}`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const [applied] = await tx.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name]);
      if (applied && applied.checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
      if (!applied) {
        await tx.exec(sql);
        await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name, checksum]);
      }
    }
  });
}
