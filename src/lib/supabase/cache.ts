import { supabase } from './server';

// Cache em memória como fallback para desenvolvimento local sem Supabase
const localMemoryCache = new Map<string, { payload: any; expiresAt: Date }>();

const DEFAULT_TTL_SECONDS = 900; // 15 minutos

export async function getCached<T>(cacheKey: string): Promise<T | null> {
  const now = new Date();

  // 1. Se o Supabase estiver configurado, tenta buscar do banco
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('meta_cache')
        .select('payload, expires_at')
        .eq('cache_key', cacheKey)
        .maybeSingle();

      if (error) {
        console.error('[Supabase Cache Read Error]:', error);
      } else if (data) {
        const expiresAt = new Date(data.expires_at);
        if (expiresAt > now) {
          // Log de cache hit
          await logApiCall(cacheKey.split('_')[0] || 'unknown', 'GET', true, 200, 0);
          return data.payload as T;
        } else {
          // Cache expirado: deleta do banco
          await supabase.from('meta_cache').delete().eq('cache_key', cacheKey);
        }
      }
    } catch (e) {
      console.error('[Supabase Exception during read]:', e);
    }
  }

  // 2. Se falhar ou não estiver configurado, tenta do cache em memória local
  const localVal = localMemoryCache.get(cacheKey);
  if (localVal) {
    if (localVal.expiresAt > now) {
      return localVal.payload as T;
    } else {
      localMemoryCache.delete(cacheKey);
    }
  }

  return null;
}

export async function setCached(
  cacheKey: string,
  accountId: string,
  endpoint: string,
  payload: any,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  // 1. Grava no cache local
  localMemoryCache.set(cacheKey, { payload, expiresAt });

  // 2. Se o Supabase estiver configurado, grava no banco
  if (supabase) {
    try {
      const { error } = await supabase
        .from('meta_cache')
        .upsert({
          cache_key: cacheKey,
          account_id: accountId,
          endpoint,
          payload,
          fetched_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        }, { onConflict: 'cache_key' });

      if (error) {
        console.error('[Supabase Cache Write Error]:', error);
      }
    } catch (e) {
      console.error('[Supabase Exception during write]:', e);
    }
  }
}

export async function invalidateCache(accountId: string): Promise<void> {
  // Invalida em memória
  for (const [key] of localMemoryCache.entries()) {
    if (key.startsWith(`${accountId}_`)) {
      localMemoryCache.delete(key);
    }
  }

  // Invalida no Supabase
  if (supabase) {
    try {
      await supabase
        .from('meta_cache')
        .delete()
        .eq('account_id', accountId);
    } catch (e) {
      console.error('[Supabase Exception during invalidation]:', e);
    }
  }
}

export async function logApiCall(
  accountId: string,
  endpoint: string,
  cacheHit: boolean,
  statusCode: number,
  durationMs: number
): Promise<void> {
  if (supabase) {
    try {
      await supabase.from('meta_api_calls').insert({
        endpoint,
        account_id: accountId,
        cache_hit: cacheHit,
        status_code: statusCode,
        duration_ms: durationMs
      });
    } catch (e) {
      // Ignora silenciosamente erros de telemetria
    }
  }
}
