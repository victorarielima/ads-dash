import React, { Suspense } from 'react';
import { listAdAccounts } from '@/lib/meta/accounts';
import { EvinoLogo } from '@/components/EvinoLogo';
import { AccountSelector } from '@/components/AccountSelector';
import { DateRangePicker } from '@/components/DateRangePicker';
import { RefreshButton } from '@/components/RefreshButton';
import { NavigationTabs } from '@/components/NavigationTabs';
import { HeaderSkeleton } from '@/components/LoadingSkeleton';

interface AccountLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    adAccountId?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children, params }: AccountLayoutProps) {
  const { adAccountId = '' } = await params;
  
  if (!adAccountId.startsWith('act_')) {
    return null;
  }
  
  // Lista todas as contas reais da Meta Graph API
  const accounts = await listAdAccounts();

  return (
    <div className="min-h-screen bg-evino-gray-50 flex flex-col">
      {/* Cabeçalho Superior */}
      <header className="bg-white border-b border-evino-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <EvinoLogo selectedAccountId={adAccountId} accounts={accounts} />
          
          <div className="flex flex-wrap items-center gap-3">
            <Suspense fallback={<div className="h-9 w-48 bg-evino-gray-100 animate-pulse rounded-evino" />}>
              <AccountSelector accounts={accounts} selectedAccountId={adAccountId} />
            </Suspense>
            <Suspense fallback={<div className="h-9 w-40 bg-evino-gray-100 animate-pulse rounded-evino" />}>
              <DateRangePicker />
            </Suspense>
            <RefreshButton accountId={adAccountId} />
          </div>
        </div>
        
        {/* Abas de Navegação */}
        <NavigationTabs accountId={adAccountId} />
      </header>

      {/* Conteúdo das Páginas */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
