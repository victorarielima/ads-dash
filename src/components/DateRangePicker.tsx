'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { spOffsetDateStr } from '@/lib/utils/date';

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

  // Data local de São Paulo (mesmo fuso usado no filtro do Redshift), para que
  // "Hoje" represente o dia local inteiro (00:00–23:59) em vez do dia UTC.
  const getOffsetDateStr = (daysAgo: number): string => spOffsetDateStr(daysAgo);

  const calculatedPreset = getSelectedOption();
  const [activePreset, setActivePreset] = useState<string>(calculatedPreset);

  // Rascunho local das datas personalizadas. Só viram URL (e disparam o reload
  // pesado) quando o usuário define início E fim e confirma — nunca a cada onChange.
  const [draftSince, setDraftSince] = useState<string>(since || getOffsetDateStr(29));
  const [draftUntil, setDraftUntil] = useState<string>(until || getOffsetDateStr(0));

  // Sincroniza o preset ativo caso a URL mude externamente
  useEffect(() => {
    setActivePreset(calculatedPreset);
  }, [calculatedPreset]);

  // Mantém o rascunho alinhado com a URL quando ela muda externamente
  useEffect(() => {
    if (since) setDraftSince(since);
    if (until) setDraftUntil(until);
  }, [since, until]);

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

  // Só aplica (e recarrega) quando início e fim estão preenchidos e início <= fim.
  const isDraftValid = Boolean(draftSince) && Boolean(draftUntil) && draftSince <= draftUntil;
  const draftDiffersFromUrl = draftSince !== since || draftUntil !== until;

  const applyCustomRange = () => {
    if (!isDraftValid) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('since', draftSince);
    params.set('until', draftUntil);
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
            value={draftSince}
            max={draftUntil || undefined}
            onChange={(e) => setDraftSince(e.target.value)}
            className="bg-transparent focus:outline-none text-evino-gray-700 font-mono text-xs"
          />
          <span className="text-evino-gray-400 text-xs font-semibold">até</span>
          <input
            type="date"
            value={draftUntil}
            min={draftSince || undefined}
            onChange={(e) => setDraftUntil(e.target.value)}
            className="bg-transparent focus:outline-none text-evino-gray-700 font-mono text-xs"
          />
          <button
            type="button"
            onClick={applyCustomRange}
            disabled={!isDraftValid || !draftDiffersFromUrl}
            className="ml-1 rounded-evino bg-evino-red px-2.5 py-1 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
