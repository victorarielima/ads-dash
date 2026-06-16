export function generateCacheKey(accountId: string, endpoint: string, params: Record<string, any>): string {
  // Ordena as chaves do objeto params de forma determinística
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const inputString = `${accountId}:${endpoint}:${JSON.stringify(sortedParams)}`;
  
  // Algoritmo djb2 simples e rápido para hash numérico de 32 bits, convertido em hexadecimal
  let hash = 5381;
  for (let i = 0; i < inputString.length; i++) {
    hash = (hash * 33) ^ inputString.charCodeAt(i);
  }
  
  const hashHex = (hash >>> 0).toString(16);
  return `${accountId}_${hashHex}`;
}
