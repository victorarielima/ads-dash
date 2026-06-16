'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdAccount } from '@/lib/meta/types';
import { Landmark } from 'lucide-react';

interface AccountSelectorProps {
  accounts: AdAccount[];
  selectedAccountId: string;
}

export function AccountSelector({ accounts, selectedAccountId }: AccountSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAccountChange = (accountId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // Navega para a nova conta mantendo as datas selecionadas
    router.push(`/${accountId}?${params.toString()}`);
  };

  const activeAccount = accounts.find(acc => acc.id === selectedAccountId) || accounts[0];

  return (
    <div className="flex items-center gap-1.5 bg-white border border-evino-gray-200 rounded-evino px-3 py-1.5 shadow-sm text-sm text-evino-gray-700">
      <Landmark className="w-4 h-4 text-evino-gray-400" />
      <select
        value={selectedAccountId}
        onChange={(e) => handleAccountChange(e.target.value)}
        className="bg-transparent focus:outline-none font-semibold text-evino-ink cursor-pointer"
      >
        {accounts.length === 0 ? (
          <option value="">Sem contas disponíveis</option>
        ) : (
          accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.id.replace('act_', '')})
            </option>
          ))
        )}
      </select>
    </div>
  );
}
