import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Exporta o cliente do Supabase apenas se as credenciais estiverem disponíveis.
// Caso contrário, retorna null para indicar modo mock/offline.
export const supabase = 
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}
