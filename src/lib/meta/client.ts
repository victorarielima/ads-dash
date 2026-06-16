import { generateCacheKey } from '../utils/hash';
import { getCached, setCached, logApiCall } from '../supabase/cache';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_API_VERSION || 'v25.0';
const BASE_URL = 'https://graph.facebook.com';

interface RequestOptions {
  params?: Record<string, any>;
  ttlSeconds?: number;
  skipCache?: boolean;
}

export async function requestMeta<T>(
  accountId: string,
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params = {}, ttlSeconds = 900, skipCache = false } = options;
  
  if (!META_ACCESS_TOKEN) {
    throw new Error('META_ACCESS_TOKEN_MISSING: Por favor, configure a variável de ambiente META_ACCESS_TOKEN no arquivo .env.local.');
  }

  const queryParams = { 
    ...params,
    access_token: META_ACCESS_TOKEN 
  };

  const cacheKey = generateCacheKey(accountId, endpoint, params);

  // 1. Tenta recuperar do cache se não for skipCache
  if (!skipCache) {
    const cachedData = await getCached<T>(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] key: ${cacheKey}`);
      return cachedData;
    }
  }

  // 2. Chamada real à Graph API
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (typeof value === 'object') {
      query.set(key, JSON.stringify(value));
    } else {
      query.set(key, String(value));
    }
  }

  const url = `${BASE_URL}/${META_API_VERSION}/${endpoint}?${query.toString()}`;
  const startTime = Date.now();

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const durationMs = Date.now() - startTime;
      
      // Parse rate limits from headers
      const usageHeader = response.headers.get('x-business-use-case-usage');
      if (usageHeader) {
        try {
          const usage = JSON.parse(usageHeader);
          console.log(`[Rate Limit Header]:`, usage);
          const actUsage = usage[accountId];
          if (actUsage) {
            const maxVal = Math.max(actUsage.call_count || 0, actUsage.total_cputime || 0, actUsage.total_time || 0);
            if (maxVal >= 80) {
              console.warn(`[WARNING] Rate limit está em ${maxVal}% para a conta ${accountId}.`);
            }
          }
        } catch (_) {}
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const metaError = errorBody.error || {};
        
        // Trata erro de Token Inválido (190)
        if (metaError.code === 190) {
          throw new Error('META_TOKEN_EXPIRED_OR_INVALID: O token da API do Facebook Ads expirou ou é inválido. Por favor, atualize o META_ACCESS_TOKEN.');
        }

        // Trata Rate Limit (HTTP 429 ou códigos 17, 80004)
        if (response.status === 429 || metaError.code === 17 || metaError.code === 80004) {
          console.warn(`[Rate Limit Hit] Retrying in ${delay}ms. Retries left: ${retries - 1}`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Backoff exponencial
          continue;
        }

        throw new Error(metaError.message || `Meta API error status ${response.status}`);
      }

      const payload = await response.json();
      
      // Sucesso: registra e salva no cache
      await logApiCall(accountId, endpoint, false, response.status, durationMs);
      await setCached(cacheKey, accountId, endpoint, payload, ttlSeconds);
      
      return payload as T;
    } catch (error: any) {
      if (retries <= 1 || error.message.includes('META_TOKEN_EXPIRED_OR_INVALID') || error.message.includes('META_ACCESS_TOKEN_MISSING')) {
        await logApiCall(accountId, endpoint, false, 500, Date.now() - startTime);
        throw error;
      }
      retries--;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error('Meta API request failed after retries');
}
