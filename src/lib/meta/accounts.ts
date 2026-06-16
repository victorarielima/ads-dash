import { requestMeta } from './client';
import { AdAccount } from './types';

export async function listAdAccounts(): Promise<AdAccount[]> {
  try {
    const data = await requestMeta<any>('me', 'me/adaccounts', {
      params: {
        fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance',
      },
      ttlSeconds: 86400, // Contas de anúncio mudam raramente, cacheamos por 24h
    });
    
    // Se for chamada real, a resposta vem envolvida em um array { data: [...] }
    if (data && data.data) {
      const list = data.data as AdAccount[];
      return list.filter(acc => {
        const name = acc.name?.toLowerCase() || '';
        return name !== 'victor lima' && !name.includes('victor lima');
      });
    }
    
    const list = data as AdAccount[];
    return list.filter(acc => {
      const name = acc.name?.toLowerCase() || '';
      return name !== 'victor lima' && !name.includes('victor lima');
    });
  } catch (error) {
    console.error('Erro ao listar contas de anúncios:', error);
    return [];
  }
}
