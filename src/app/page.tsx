import { redirect } from 'next/navigation';
import { listAdAccounts } from '@/lib/meta/accounts';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const accounts = await listAdAccounts();
  
  const defaultAccountId = process.env.META_DEFAULT_AD_ACCOUNT_ID;
  
  // Se houver uma conta padrão definida nas variáveis de ambiente, usa ela.
  if (defaultAccountId && accounts.some(acc => acc.id === defaultAccountId)) {
    redirect(`/${defaultAccountId}`);
  }

  // Senão, pega a primeira conta retornada pela API
  if (accounts.length > 0) {
    redirect(`/${accounts[0].id}`);
  }

  // Se não houver nenhuma conta configurada e nem token da Meta,
  // criamos um fallback ou mostramos uma mensagem informativa
  return (
    <div className="min-h-screen bg-evino-cream flex items-center justify-center p-6 text-center">
      <div className="bg-white border border-evino-gray-200 rounded-evino p-8 max-w-md shadow-lg">
        <div className="w-16 h-16 rounded-full bg-evino-red-50 text-evino-red flex items-center justify-center text-3xl mx-auto mb-4">
          🍷
        </div>
        <h2 className="font-display text-xl font-bold text-evino-ink mb-2">Evino Ads Analytics</h2>
        <p className="text-sm text-evino-gray-500 mb-6">
          Nenhuma conta de anúncios foi encontrada ou o token da API está ausente.
        </p>
        <div className="bg-evino-gray-50 p-4 rounded-evino text-left text-xs font-mono text-evino-gray-600 border border-evino-gray-150 space-y-2">
          <p>Para inicializar o painel:</p>
          <p className="font-bold">1. Crie o arquivo .env.local na raiz</p>
          <p className="font-bold">2. Adicione as variáveis de ambiente:</p>
          <p className="pl-3 text-evino-red">META_ACCESS_TOKEN=seu_token</p>
          <p className="pl-3 text-evino-red">SUPABASE_URL=seu_supabase_url</p>
          <p className="pl-3 text-evino-red">SUPABASE_SERVICE_ROLE_KEY=sua_chave</p>
        </div>
      </div>
    </div>
  );
}
