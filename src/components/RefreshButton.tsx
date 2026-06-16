'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { refreshAccountData } from '@/app/actions';

interface RefreshButtonProps {
  accountId: string;
}

export function RefreshButton({ accountId }: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    
    // Dispara a revalidação do cache no servidor
    const res = await refreshAccountData(accountId);
    
    if (res.success) {
      // Força a atualização dos Server Components ativos na tela
      startTransition(() => {
        router.refresh();
      });
    } else {
      alert('Falha ao atualizar dados. Verifique a conexão com a API.');
    }
    
    setIsLoading(false);
  };

  const activeLoading = isLoading || isPending;

  return (
    <button
      onClick={handleRefresh}
      disabled={activeLoading}
      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-evino-gray-300 text-evino-ink font-semibold text-sm rounded-evino hover:bg-evino-gray-50 active:bg-evino-gray-100 transition-colors disabled:opacity-50 shadow-sm cursor-pointer bg-white"
    >
      <RefreshCw className={`w-4 h-4 text-evino-gray-500 ${activeLoading ? 'animate-spin' : ''}`} />
      <span>{activeLoading ? 'Atualizando...' : 'Atualizar'}</span>
    </button>
  );
}
