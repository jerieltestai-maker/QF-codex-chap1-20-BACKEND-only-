import {createHash} from 'node:crypto';
import type {Sql} from './database.js';

// Present adapters store authoritative objects in PostgreSQL bytea: pg_dump includes them.
// A future external object adapter MUST extend this check and the backup artifact set.
export async function verifyEvidenceIntegrity(sql:Sql) {
  let fileCount=0,exportCount=0;
  for(const table of ['file_objects','export_results'] as const) {
    const key=table==='file_objects'?'id':'export_id';let after='00000000-0000-0000-0000-000000000000';
    for(;;) {
      const rows=await sql.query(`SELECT ${key} AS id,bytes,checksum FROM ${table} WHERE ${key}>$1 ORDER BY ${key} LIMIT 20`,[after]);
      if(!rows.length)break;
      for(const row of rows) {
        if(createHash('sha256').update(Buffer.from(row.bytes as Uint8Array)).digest('hex')!==row.checksum)
          throw new Error('Evidence checksum verification failed');
        if(table==='file_objects')fileCount++;else exportCount++;
      }
      after=String(rows.at(-1)!.id);
    }
  }
  const [invalid]=await sql.query(`SELECT count(*)::integer AS n FROM upload_intents u LEFT JOIN file_objects f ON f.upload_id=u.id AND f.variant='original'
    WHERE u.state='ready' AND (f.id IS NULL OR f.checksum<>u.checksum OR octet_length(f.bytes)<>u.byte_size)`);
  if(Number(invalid!.n))throw new Error('Ready evidence is missing or differs from its upload');
  return {fileCount,exportCount,storage:'database-bytea' as const};
}
