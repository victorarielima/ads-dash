'use client';

import React, { useState } from 'react';
import { CreativePreview } from '@/components/creative/CreativePreview';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Check, ArrowLeftRight, Award } from 'lucide-react';
import { clsx } from 'clsx';

interface AdComparisonData {
  id: string;
  name: string;
  thumbnail: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpa: number;
  creative: any;
  dailyInsights: Array<{ date: string; spend: number; revenue: number; roas: number }>;
}

interface CompareComponentProps {
  adsList: AdComparisonData[];
}

export function CompareComponent({ adsList }: CompareComponentProps) {
  // Guarda os IDs dos criativos selecionados (inicializa com os 2 primeiros da lista)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    adsList.slice(0, 2).map(ad => ad.id)
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) {
          alert('Selecione pelo menos 2 criativos para comparar.');
          return prev;
        }
        return prev.filter(x => x !== id);
      } else {
        if (prev.length >= 5) {
          alert('Você pode comparar no máximo 5 criativos simultaneamente.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  // Filtra as entidades ativas sob a comparação
  const selectedAds = adsList.filter(ad => selectedIds.includes(ad.id));

  // Determina os vencedores para cada métrica
  const winners = {
    spend: Math.max(...selectedAds.map(a => a.spend)),
    ctr: Math.max(...selectedAds.map(a => a.ctr)),
    purchases: Math.max(...selectedAds.map(a => a.purchases)),
    revenue: Math.max(...selectedAds.map(a => a.revenue)),
    roas: Math.max(...selectedAds.map(a => a.roas)),
    cpa: Math.min(...selectedAds.filter(a => a.cpa > 0).map(a => a.cpa)), // menor cpa vence
  };

  // Cores de linha do gráfico por criativo
  const lineColors = ['#ED0E32', '#7B1A2E', '#C8A95C', '#3B82F6', '#10B981'];

  // Agrupa os dados diários de forma unificada para o Recharts
  const chartData = (() => {
    const datesMap = new Map<string, Record<string, any>>();
    
    selectedAds.forEach((ad, adIdx) => {
      ad.dailyInsights.forEach(day => {
        const date = day.date;
        if (!datesMap.has(date)) {
          datesMap.set(date, { date });
        }
        const dataObj = datesMap.get(date)!;
        // Salva o ROAS daquele criativo naquele dia
        dataObj[`roas_ad_${adIdx}`] = day.roas;
        dataObj[`spend_ad_${adIdx}`] = day.spend;
      });
    });

    return Array.from(datesMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  })();

  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch (_) {
      return tickItem;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Painel de Seleção */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
        <h3 className="font-display text-sm font-bold text-evino-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <ArrowLeftRight className="w-4 h-4 text-evino-red" /> Selecionar Criativos para Comparar (2 a 5)
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 max-h-[160px] overflow-y-auto p-1">
          {adsList.map(ad => {
            const isSelected = selectedIds.includes(ad.id);
            return (
              <div
                key={ad.id}
                onClick={() => handleToggleSelect(ad.id)}
                className={clsx(
                  'border rounded-evino p-2.5 flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-200 hover:border-evino-red relative select-none bg-white',
                  isSelected ? 'border-evino-red ring-1 ring-evino-red bg-evino-red-50/10' : 'border-evino-gray-200'
                )}
              >
                {isSelected && (
                  <span className="absolute top-1 right-1 bg-evino-red text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px]">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                
                <img
                  src={ad.thumbnail}
                  alt={ad.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=64&auto=format&fit=crop&q=80';
                  }}
                  className="w-10 h-10 object-cover rounded border border-evino-gray-200 mb-2 shrink-0"
                />
                
                <span className="text-[10px] font-semibold text-evino-ink line-clamp-2 leading-tight">
                  {ad.name}
                </span>
                
                <span className="text-[8px] font-mono text-evino-gray-400 mt-1">{ad.id}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Visualização dos Anúncios Selecionados Lado a Lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-center">
        {selectedAds.map((ad, idx) => (
          <div key={ad.id} className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <span
                className="w-3.5 h-3.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: lineColors[idx] }}
              />
              <span className="font-display text-sm font-bold text-evino-ink truncate max-w-[200px]" title={ad.name}>
                {ad.name}
              </span>
            </div>
            <CreativePreview creative={ad.creative} />
          </div>
        ))}
      </div>

      {/* 3. Tabela Comparativa de Métricas */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm overflow-hidden">
        <h3 className="font-display text-lg font-bold text-evino-ink mb-4">Tabela Comparativa de Métricas</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase">
                <th className="p-3 rounded-l-evino">Métrica</th>
                {selectedAds.map((ad, idx) => (
                  <th key={ad.id} className="p-3 text-right">
                    <span className="flex items-center gap-1.5 justify-end">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: lineColors[idx] }} />
                      {ad.name.split('|')[0] || `Anúncio ${idx + 1}`}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-evino-gray-100 font-mono text-xs tabular-nums text-evino-ink">
              
              {/* Investido */}
              <tr className="hover:bg-evino-gray-50 transition-colors">
                <td className="p-3 font-sans text-sm font-semibold text-evino-gray-600">Investimento</td>
                {selectedAds.map(ad => (
                  <td key={ad.id} className="p-3 text-right">
                    <span className={clsx(ad.spend === winners.spend && 'font-bold text-evino-burgundy bg-evino-cream px-1.5 py-0.5 rounded')}>
                      {formatCurrency(ad.spend)}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Impressões */}
              <tr className="hover:bg-evino-gray-50 transition-colors">
                <td className="p-3 font-sans text-sm font-semibold text-evino-gray-600">Impressões</td>
                {selectedAds.map(ad => (
                  <td key={ad.id} className="p-3 text-right">
                    {formatNumber(ad.impressions)}
                  </td>
                ))}
              </tr>

              {/* CTR */}
              <tr className="hover:bg-evino-gray-50 transition-colors">
                <td className="p-3 font-sans text-sm font-semibold text-evino-gray-600">CTR (Click-Through Rate)</td>
                {selectedAds.map(ad => {
                  const isWinner = ad.ctr === winners.ctr;
                  return (
                    <td key={ad.id} className="p-3 text-right">
                      <span className={clsx(
                        isWinner && 'font-bold text-success bg-success/5 border border-success/15 px-1.5 py-0.5 rounded flex items-center gap-0.5 justify-end w-fit ml-auto'
                      )}>
                        {isWinner && <Award className="w-3.5 h-3.5 shrink-0" />}
                        {ad.ctr.toFixed(2)}%
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Compras */}
              <tr className="hover:bg-evino-gray-50 transition-colors">
                <td className="p-3 font-sans text-sm font-semibold text-evino-gray-600">Compras</td>
                {selectedAds.map(ad => {
                  const isWinner = ad.purchases === winners.purchases && ad.purchases > 0;
                  return (
                    <td key={ad.id} className="p-3 text-right">
                      <span className={clsx(
                        isWinner && 'font-bold text-success bg-success/5 border border-success/15 px-1.5 py-0.5 rounded flex items-center gap-0.5 justify-end w-fit ml-auto'
                      )}>
                        {isWinner && <Award className="w-3.5 h-3.5 shrink-0" />}
                        {formatNumber(ad.purchases)}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Receita */}
              <tr className="hover:bg-evino-gray-50 transition-colors">
                <td className="p-3 font-sans text-sm font-semibold text-evino-gray-600">Receita</td>
                {selectedAds.map(ad => (
                  <td key={ad.id} className="p-3 text-right">
                    <span className={clsx(ad.revenue === winners.revenue && 'font-bold text-evino-red bg-evino-red-50 px-1.5 py-0.5 rounded')}>
                      {formatCurrency(ad.revenue)}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ROAS */}
              <tr className="hover:bg-evino-gray-50 transition-colors">
                <td className="p-3 font-sans text-sm font-bold text-evino-ink">ROAS (Retorno Ads)</td>
                {selectedAds.map(ad => {
                  const isWinner = ad.roas === winners.roas && ad.roas > 0;
                  return (
                    <td key={ad.id} className="p-3 text-right font-bold text-evino-ink">
                      <span className={clsx(
                        isWinner && 'font-bold text-success bg-success/5 border border-success/15 px-2 py-0.5 rounded flex items-center gap-0.5 justify-end w-fit ml-auto'
                      )}>
                        {isWinner && <Award className="w-3.5 h-3.5 shrink-0" />}
                        {ad.roas.toFixed(2)}x
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* CPA */}
              <tr className="hover:bg-evino-gray-50 transition-colors">
                <td className="p-3 font-sans text-sm font-semibold text-evino-gray-600">CPA (Custo por Compra)</td>
                {selectedAds.map(ad => {
                  const isWinner = ad.cpa === winners.cpa && ad.cpa > 0;
                  return (
                    <td key={ad.id} className="p-3 text-right">
                      <span className={clsx(
                        isWinner && 'font-bold text-success bg-success/5 border border-success/15 px-1.5 py-0.5 rounded flex items-center gap-0.5 justify-end w-fit ml-auto'
                      )}>
                        {isWinner && <Award className="w-3.5 h-3.5 shrink-0" />}
                        {ad.cpa > 0 ? formatCurrency(ad.cpa) : 'R$ 0,00'}
                      </span>
                    </td>
                  );
                })}
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Gráfico diário diário sobreposto (ROAS) */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="font-display text-lg font-bold text-evino-ink">Sobreposição Histórica de ROAS</h3>
          <p className="text-xs text-evino-gray-500">Curva de retorno (ROAS) diária sobreposta de cada criativo</p>
        </div>
        
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatXAxis} tickLine={false} axisLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={(v) => `${v}x`} />
              <Tooltip cursor={{ stroke: '#E4E4E7' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {selectedAds.map((ad, idx) => (
                <Line
                  key={ad.id}
                  type="monotone"
                  dataKey={`roas_ad_${idx}`}
                  name={ad.name.split('|')[0] || `Anúncio ${idx + 1}`}
                  stroke={lineColors[idx % lineColors.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
