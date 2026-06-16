import React from 'react';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters';

interface PlacementItem {
  platform: string;
  position: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  roas: number;
}

interface PlacementBreakdownProps {
  data: PlacementItem[];
}

export function PlacementBreakdown({ data }: PlacementBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center border border-dashed border-evino-gray-200 bg-white rounded-evino">
        <p className="text-sm text-evino-gray-500">Sem dados de posicionamento disponíveis.</p>
      </div>
    );
  }

  // Ordena por maior spend decrescente
  const sortedData = [...data].sort((a, b) => b.spend - a.spend);

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return 'bg-pink-50 text-pink-700 border-pink-150';
      case 'facebook':
        return 'bg-blue-50 text-blue-700 border-blue-150';
      case 'messenger':
        return 'bg-cyan-50 text-cyan-700 border-cyan-150';
      default:
        return 'bg-evino-gray-50 text-evino-gray-700 border-evino-gray-150';
    }
  };

  const getPositionLabel = (pos: string) => {
    // Traduz posições comuns
    const mappings: Record<string, string> = {
      'feed': 'Feed de Notícias',
      'stories': 'Stories',
      'reels': 'Reels',
      'right_column': 'Coluna Direita',
      'marketplace': 'Marketplace',
      'explore': 'Explorar',
      'search': 'Resultados de Pesquisa',
      'classic_interstitial': 'Interstitial Clássico',
      'rewarded_video': 'Vídeo Premiado',
      'inbox': 'Caixa de Entrada',
    };
    return mappings[pos.toLowerCase()] || pos;
  };

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold text-evino-ink">Performance por Posicionamento</h3>
        <p className="text-xs text-evino-gray-500">Divisão do investimento por canal da Meta e locais de exibição</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-evino-cream border-b border-evino-gray-200">
              <th className="p-3 text-xs font-semibold text-evino-gray-600 uppercase rounded-l-evino">Plataforma</th>
              <th className="p-3 text-xs font-semibold text-evino-gray-600 uppercase">Posicionamento</th>
              <th className="p-3 text-xs font-semibold text-evino-gray-600 uppercase text-right">Spend</th>
              <th className="p-3 text-xs font-semibold text-evino-gray-600 uppercase text-right">CTR</th>
              <th className="p-3 text-xs font-semibold text-evino-gray-600 uppercase text-right">Compras</th>
              <th className="p-3 text-xs font-semibold text-evino-gray-600 uppercase text-right rounded-r-evino">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-evino-gray-100">
            {sortedData.map((item, idx) => {
              const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
              return (
                <tr key={idx} className="hover:bg-evino-gray-50 transition-colors text-sm">
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getPlatformBadgeColor(item.platform)}`}>
                      {item.platform.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-evino-ink">
                    {getPositionLabel(item.position)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                    {formatCurrency(item.spend)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-600">
                    {ctr.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                    {formatNumber(item.purchases)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs tabular-nums font-bold text-evino-ink">
                    {item.roas > 0 ? `${item.roas.toFixed(2)}x` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
