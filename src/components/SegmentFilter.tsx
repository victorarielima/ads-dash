'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Store, Wine } from 'lucide-react';

// Filtro de segmento: separa os dados pelo nome do conjunto de anúncios
// (Evino-Ecomm-… vs Evino-Clube-…). Aplica-se às tabelas de Campanhas e Criativos.
const OPTIONS = [
  { value: '', label: 'Todos', Icon: null },
  { value: 'ecom', label: 'Ecom', Icon: Store },
  { value: 'clube', label: 'Clube', Icon: Wine },
] as const;

export function SegmentFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const current = (searchParams.get('segment') || '').toLowerCase();

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('segment', value);
    else params.delete('segment');
    // Além de trocar a URL, força o re-render dos Server Components para que os
    // valores realmente mudem (o Router Cache pode servir o RSC antigo só na push).
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    });
  };

  return (
    <div className={`inline-flex items-center gap-0.5 bg-white border border-evino-gray-200 rounded-evino p-0.5 shadow-sm transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value || 'all'}
            type="button"
            onClick={() => handleSelect(value)}
            className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-evino-red text-white'
                : 'text-evino-gray-600 hover:bg-evino-gray-100'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
