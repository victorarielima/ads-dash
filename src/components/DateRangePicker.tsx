'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar } from 'lucide-react';

export function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const since = searchParams.get('since') || '';
  const until = searchParams.get('until') || '';

  // Determina a opção atual selecionada baseada nas datas da URL
  const getSelectedOption = () => {
    if (!since || !until) return 'last_30d';

    const sDate = new Date(since + 'T00:00:00');
    const uDate = new Date(until + 'T00:00:00');
    const diffTime = Math.abs(uDate.getTime() - sDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1 && since === getOffsetDateStr(1)) return 'yesterday';
    if (diffDays === 6) return 'last_7d';
    if (diffDays === 29) return 'last_30d';
    if (diffDays === 89) return 'last_90d';
    return 'custom';
  };

  const getOffsetDateStr = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const calculatedPreset = getSelectedOption();
  const [activePreset, setActivePreset] = useState<string>(calculatedPreset);

  // Sincroniza o preset ativo caso a URL mude externamente
  useEffect(() => {
    setActivePreset(calculatedPreset);
  }, [calculatedPreset]);

  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);

    if (preset === 'custom') {
      // Quando seleciona personalizado, apenas mostra os campos de data,
      // sem atualizar a URL imediatamente para não disparar reloads vazios.
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const todayStr = getOffsetDateStr(0);

    switch (preset) {
      case 'today':
        params.set('since', todayStr);
        params.set('until', todayStr);
        break;
      case 'yesterday':
        const yestStr = getOffsetDateStr(1);
        params.set('since', yestStr);
        params.set('until', yestStr);
        break;
      case 'last_7d':
        params.set('since', getOffsetDateStr(6));
        params.set('until', todayStr);
        break;
      case 'last_30d':
        params.set('since', getOffsetDateStr(29));
        params.set('until', todayStr);
        break;
      case 'last_90d':
        params.set('since', getOffsetDateStr(89));
        params.set('until', todayStr);
        break;
      default:
        return;
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCustomDateChange = (field: 'since' | 'until', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(field, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 bg-white border border-evino-gray-200 rounded-evino px-3 py-1.5 shadow-sm text-sm text-evino-gray-700">
        <Calendar className="w-4 h-4 text-evino-gray-400" />
        <select
          value={activePreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="bg-transparent focus:outline-none font-medium cursor-pointer"
        >
          <option value="today">Hoje</option>
          <option value="yesterday">Ontem</option>
          <option value="last_7d">Últimos 7 dias</option>
          <option value="last_30d">Últimos 30 dias</option>
          <option value="last_90d">Últimos 90 dias</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {activePreset === 'custom' && (
        <div className="flex items-center gap-1.5 bg-white border border-evino-gray-200 rounded-evino px-3 py-1 text-sm shadow-sm">
          <input
            type="date"
            value={since || getOffsetDateStr(29)}
            onChange={(e) => handleCustomDateChange('since', e.target.value)}
            className="bg-transparent focus:outline-none text-evino-gray-700 font-mono text-xs"
          />
          <span className="text-evino-gray-400 text-xs font-semibold">até</span>
          <input
            type="date"
            value={until || getOffsetDateStr(0)}
            onChange={(e) => handleCustomDateChange('until', e.target.value)}
            className="bg-transparent focus:outline-none text-evino-gray-700 font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
