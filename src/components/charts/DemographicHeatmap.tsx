import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

interface DemographicItem {
  age: string;
  gender: string;
  spend: number;
  roas: number;
  purchases: number;
}

interface DemographicHeatmapProps {
  data: DemographicItem[];
}

export function DemographicHeatmap({ data }: DemographicHeatmapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center border border-dashed border-evino-gray-200 bg-white rounded-evino">
        <p className="text-sm text-evino-gray-500">Sem dados demográficos disponíveis.</p>
      </div>
    );
  }

  // Extrai idades únicas e ordena de forma crescente
  const ages = Array.from(new Set(data.map(item => item.age))).sort();
  // Gêneros
  const genders = ['female', 'male'];

  const getCellData = (age: string, gender: string) => {
    return data.find(item => item.age === age && item.gender.toLowerCase() === gender) || { spend: 0, roas: 0, purchases: 0 };
  };

  // Encontra o ROAS máximo para colorir o heatmap
  const maxRoas = Math.max(...data.map(item => item.roas), 1);

  // Retorna classe CSS de fundo correspondente à performance de ROAS
  const getHeatmapColorClass = (roas: number) => {
    if (roas === 0) return 'bg-white border-evino-gray-100';
    const ratio = roas / maxRoas;

    if (ratio < 0.25) return 'bg-evino-red-50 text-evino-ink border-evino-red-100';
    if (ratio < 0.5) return 'bg-evino-red-100 text-evino-ink border-evino-red-200';
    if (ratio < 0.75) return 'bg-evino-red-300 text-white border-evino-red-400';
    return 'bg-evino-red text-white border-evino-red-600'; // ROAS Estelar
  };

  const getGenderLabel = (g: string) => {
    return g === 'female' ? 'Feminino (Mulheres)' : 'Masculino (Homens)';
  };

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold text-evino-ink">Distribuição Demográfica</h3>
        <p className="text-xs text-evino-gray-500">Cruzamento de Idade × Gênero mostrando Spend / ROAS</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-evino-gray-500 uppercase border-b border-evino-gray-200 bg-evino-cream rounded-l-evino">
                Faixa Etária
              </th>
              {genders.map(g => (
                <th
                  key={g}
                  className="p-3 text-center text-xs font-semibold text-evino-gray-500 uppercase border-b border-evino-gray-200 bg-evino-cream last:rounded-r-evino"
                >
                  {getGenderLabel(g)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ages.map(age => (
              <tr key={age} className="hover:bg-evino-gray-50 transition-colors">
                <td className="p-3 font-semibold text-sm text-evino-ink border-b border-evino-gray-100">
                  {age}
                </td>
                {genders.map(gender => {
                  const cell = getCellData(age, gender);
                  const colorClass = getHeatmapColorClass(cell.roas);

                  return (
                    <td
                      key={gender}
                      className="p-1 border-b border-evino-gray-100"
                    >
                      <div
                        className={`rounded-evino p-2.5 text-center border transition-all duration-200 ${colorClass}`}
                      >
                        <div className="font-mono text-xs font-bold">
                          {cell.roas > 0 ? `${cell.roas.toFixed(2)}x ROAS` : '0.00x'}
                        </div>
                        <div className="text-[10px] opacity-90 font-mono mt-0.5">
                          Spend: {formatCurrency(cell.spend)}
                        </div>
                        <div className="text-[9px] opacity-80 mt-0.5">
                          {cell.purchases} compras
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legenda do Heatmap */}
      <div className="flex items-center gap-4 mt-4 text-[10px] text-evino-gray-500 justify-end">
        <span>Legenda de Rentabilidade (ROAS):</span>
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded border border-evino-red-100 bg-evino-red-50 inline-block" />
          <span>Baixo</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded border border-evino-red-200 bg-evino-red-100 inline-block" />
          <span>Médio</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded border border-evino-red-400 bg-evino-red-300 inline-block" />
          <span>Alto</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded border border-evino-red-600 bg-evino-red inline-block" />
          <span>Excelente</span>
        </div>
      </div>
    </div>
  );
}
