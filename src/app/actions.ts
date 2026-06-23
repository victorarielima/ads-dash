'use server';

import { revalidatePath } from 'next/cache';
import { invalidateCache } from '@/lib/supabase/cache';

export async function refreshAccountData(accountId: string) {
  try {
    // Invalida o cache no banco de dados e memória para a conta correspondente
    await invalidateCache(accountId);
    // O cache do Redshift é gravado sob a "conta" lógica 'redshift' (chaves
    // redshift_*), então precisa ser invalidado à parte — senão a receita LC
    // (incl. o painel "Hoje") continua servindo o snapshot antigo no refresh.
    await invalidateCache('redshift');

    // Solicita ao Next.js revalidar todos os dados sob a conta dinâmica
    revalidatePath(`/[adAccountId]`, 'layout');
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao revalidar cache da conta:', error);
    return { success: false, error: error.message };
  }
}
