import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool | null {
  const host = process.env.REDSHIFT_HOST;
  const port = parseInt(process.env.REDSHIFT_PORT || '5439');
  const database = process.env.REDSHIFT_DATABASE;
  const user = process.env.REDSHIFT_USER;
  const password = process.env.REDSHIFT_PASSWORD;

  if (!host || !database || !user || !password) return null;

  if (!pool) {
    pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    pool.on('error', (err) => {
      console.error('[Redshift Pool Error]:', err);
    });
  }

  return pool;
}

export async function queryRedshift<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const p = getPool();
  if (!p) {
    console.warn('[Redshift] Credenciais não configuradas — verifique o .env.local');
    return [];
  }

  const client = await p.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (err) {
    console.error('[Redshift Query Error]:', err);
    return [];
  } finally {
    client.release();
  }
}
