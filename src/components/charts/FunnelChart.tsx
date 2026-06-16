import React from 'react';
import { formatNumber, formatCurrency } from '@/lib/utils/formatters';

interface FunnelStep {
  name: string;
  value: number;
  cost?: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

export function FunnelChart({ steps }: FunnelChartProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center border border-dashed border-evino-gray-200 bg-white rounded-evino">
        <p className="text-sm text-evino-gray-500">Sem dados do funil disponíveis.</p>
      </div>
    );
  }

  const maxValue = steps[0].value || 1;

  // Gradiente de cores oficiais da Evino de cima para baixo
  const bgColors = [
    'bg-evino-red',       // Impressões
    'bg-evino-red-400',   // Cliques
    'bg-evino-red-300',   // LPV
    'bg-evino-red-200',   // ATC
    'bg-evino-red-100',   // IC
    'bg-evino-red-50',    // Purchases (destacamos ou usamos bordô)
  ];

  const textColors = [
    'text-white',
    'text-white',
    'text-white',
    'text-evino-ink',
    'text-evino-ink',
    'text-evino-red-900',
  ];

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
      <div>
        <h3 className="font-display text-lg font-semibold text-evino-ink">Funil de Conversão</h3>
        <p className="text-xs text-evino-gray-500">Etapas do fluxo de compra e custos por ação associados</p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {steps.map((step, idx) => {
          const pctOfMax = (step.value / maxValue) * 100;
          const prevStep = idx > 0 ? steps[idx - 1] : null;
          const pctOfPrev = prevStep && prevStep.value > 0 ? (step.value / prevStep.value) * 100 : 100;
          
          const barColor = bgColors[idx] || 'bg-evino-gray-200';
          const textColor = textColors[idx] || 'text-evino-ink';

          return (
            <div key={idx} className="flex flex-col">
              {/* Informações da linha */}
              <div className="flex items-center justify-between text-xs font-semibold text-evino-gray-600 mb-1">
                <span className="flex items-center gap-1.5 font-display text-sm font-bold text-evino-ink">
                  {step.name}
                </span>
                <span className="font-mono text-sm text-evino-ink">
                  {formatNumber(step.value)}
                  {prevStep && (
                    <span className="text-xs text-evino-gray-400 font-sans ml-2 font-normal">
                      ({pctOfPrev.toFixed(1)}% do ant.)
                    </span>
                  )}
                </span>
              </div>

              {/* Barra do funil */}
              <div className="w-full bg-evino-gray-100 rounded-full h-8 relative overflow-hidden flex items-center">
                <div
                  className={`h-full ${barColor} rounded-full flex items-center px-3 transition-all duration-500`}
                  style={{ width: `${Math.max(4, pctOfMax)}%` }}
                >
                  <span className={`text-[11px] font-bold ${textColor} truncate`}>
                    {pctOfMax.toFixed(1)}% do total
                  </span>
                </div>
                {step.cost !== undefined && step.cost > 0 && (
                  <span className="absolute right-3 font-mono text-[11px] font-bold text-evino-gray-500">
                    Custo por Etapa: {formatCurrency(step.cost)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
