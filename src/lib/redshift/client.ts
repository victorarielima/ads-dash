import { Pool } from 'pg';
import { generateCacheKey } from '../utils/hash';
import { getCached, setCached } from '../supabase/cache';

let pool: Pool | null = null;

// Agregações históricas do Redshift mudam pouco ao longo do dia — cacheamos por
// 30 min (mesma infra do cache da Meta) para que reabrir/alternar um período já
// consultado seja instantâneo em vez de re-executar full scans pesados.
const REDSHIFT_TTL_SECONDS = 1800;

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
      // A visão geral dispara até 4 queries concorrentes (mensal atual + YoY +
      // campanhas + criativos); 5 conexões evitam que a 4ª fique na fila.
      max: 5,
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
  params: any[] = [],
  options: { ttlSeconds?: number; skipCache?: boolean } = {}
): Promise<T[]> {
  const { ttlSeconds = REDSHIFT_TTL_SECONDS, skipCache = false } = options;

  // Chave determinística: mesma SQL + mesmos params (since/until) => mesma chave.
  const cacheKey = generateCacheKey('redshift', sql, { params });

  if (!skipCache) {
    const cached = await getCached<T[]>(cacheKey);
    if (cached) {
      console.log(`[Redshift Cache Hit] key: ${cacheKey}`);
      return cached;
    }
  }

  const p = getPool();
  if (!p) {
    console.warn('[Redshift] Credenciais não configuradas — verifique o .env.local');
    return [];
  }

  const client = await p.connect();
  try {
    const result = await client.query(sql, params);
    const rows = result.rows as T[];
    if (!skipCache) {
      await setCached(cacheKey, 'redshift', 'query', rows, ttlSeconds);
    }
    return rows;
  } catch (err) {
    console.error('[Redshift Query Error]:', err);
    return [];
  } finally {
    client.release();
  }
}
