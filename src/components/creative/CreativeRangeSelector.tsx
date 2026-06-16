'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CalendarRange } from 'lucide-react';

export function CreativeRangeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const activeRange = searchParams.get('creative_range') || 'default';

  const handleRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === 'default') {
      params.delete('creative_range');
    } else {
      params.set('creative_range', value);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1.5 bg-evino-cream border border-evino-gray-250 rounded-evino px-2 py-1 text-xs font-semibold text-evino-gray-600 shadow-sm shrink-0">
      <CalendarRange className="w-3.5 h-3.5 text-evino-gray-400" />
      <select
        value={activeRange}
        onChange={(e) => handleRangeChange(e.target.value)}
        className="bg-transparent focus:outline-none font-bold text-evino-ink cursor-pointer pr-1"
      >
        <option value="default">Período do Painel</option>
        <option value="today">Hoje</option>
        <option value="yesterday">Ontem</option>
        <option value="last_7d">Últimos 7 dias</option>
        <option value="last_30d">Últimos 30 dias</option>
        <option value="last_90d">Últimos 90 dias</option>
      </select>
    </div>
  );
}
