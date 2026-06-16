'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { formatNumber, formatCurrency } from '@/lib/utils/formatters';

interface VideoRetentionData {
  plays: number;
  views3s: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  thruplays: number;
  avgWatchTime?: number;
  costPerThruplay?: number;
}

interface VideoRetentionChartProps {
  data: VideoRetentionData;
}

export function VideoRetentionChart({ data }: VideoRetentionChartProps) {
  const {
    plays = 0,
    views3s = 0,
    p25 = 0,
    p50 = 0,
    p75 = 0,
    p95 = 0,
    thruplays = 0,
    avgWatchTime = 0,
    costPerThruplay = 0,
  } = data;

  if (plays === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center border border-dashed border-evino-gray-200 bg-white rounded-evino">
        <p className="text-sm text-evino-gray-500">Métricas de vídeo não aplicáveis para este criativo.</p>
      </div>
    );
  }

  // Hook Rate = 3s views / plays * 100
  const hookRate = plays > 0 ? (views3s / plays) * 100 : 0;
  // Hold Rate = 50% views / 3s views * 100
  const holdRate = views3s > 0 ? (p50 / views3s) * 100 : 0;
  // Completion Rate = 95% views / plays * 100
  const completionRate = plays > 0 ? (p95 / plays) * 100 : 0;

  // Monta a estrutura para o Recharts
  const chartData = [
    { name: 'Plays', pct: 100, value: plays },
    { name: '3s View', pct: Math.min(100, (views3s / plays) * 100), value: views3s },
    { name: '25%', pct: Math.min(100, (p25 / plays) * 100), value: p25 },
    { name: '50%', pct: Math.min(100, (p50 / plays) * 100), value: p50 },
    { name: '75%', pct: Math.min(100, (p75 / plays) * 100), value: p75 },
    { name: '95%', pct: Math.min(100, (p95 / plays) * 100), value: p95 },
    { name: 'ThruPlay', pct: Math.min(100, (thruplays / plays) * 100), value: thruplays },
  ];

  // Cores sequenciais do Recharts para a curva
  const barColors = [
    '#ED0E32', // Evino Red (Plays)
    '#F02E4C', // 3s
    '#F44A66', // 25%
    '#F88699', // 50%
    '#FCC2CC', // 75%
    '#FEE7EB', // 95%
    '#7B1A2E', // Bordô (ThruPlay)
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-white border border-evino-gray-200 p-2 shadow-sm rounded-evino text-xs">
          <p className="font-semibold text-evino-ink">{entry.name}</p>
          <p className="text-evino-gray-600">Visualizações: <span className="font-bold">{formatNumber(entry.value)}</span></p>
          <p className="text-evino-gray-600">Retenção: <span className="font-bold">{entry.pct.toFixed(1)}%</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Curva de Retenção */}
        <div className="lg:col-span-2">
          <h3 className="font-display text-lg font-semibold text-evino-ink">Retenção de Vídeo</h3>
          <p className="text-xs text-evino-gray-500 mb-4">Curva de drop-off dos espectadores ao longo do criativo</p>
          
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#71717A', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#71717A', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F4F4F5' }} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Métricas Auxiliares */}
        <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-evino-gray-200 pt-4 lg:pt-0 lg:pl-6">
          <div>
            <h4 className="font-display text-sm font-bold text-evino-ink mb-3 uppercase tracking-wider text-evino-gray-500">Métricas de Vídeo</h4>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-evino-gray-600">Tempo Médio Assistido</span>
                <span className="font-mono font-bold text-evino-ink">{avgWatchTime.toFixed(1)}s</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-evino-gray-600 flex items-center gap-1">
                  Hook Rate
                  <span className="text-[10px] bg-evino-gray-100 text-evino-gray-500 px-1 rounded" title="3s views / plays">3s/plays</span>
                </span>
                <span className="font-mono font-bold text-evino-red">{hookRate.toFixed(1)}%</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-evino-gray-600 flex items-center gap-1">
                  Hold Rate
                  <span className="text-[10px] bg-evino-gray-100 text-evino-gray-500 px-1 rounded" title="50% views / 3s views">50%/3s</span>
                </span>
                <span className="font-mono font-bold text-evino-burgundy">{holdRate.toFixed(1)}%</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-evino-gray-600 flex items-center gap-1">
                  Completion Rate
                  <span className="text-[10px] bg-evino-gray-100 text-evino-gray-500 px-1 rounded" title="95% views / plays">95%/plays</span>
                </span>
                <span className="font-mono font-bold text-success">{completionRate.toFixed(1)}%</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-evino-gray-600">Custo por ThruPlay</span>
                <span className="font-mono font-bold text-evino-ink">{formatCurrency(costPerThruplay)}</span>
              </div>
            </div>
          </div>

          <div className="bg-evino-cream border border-evino-gray-100 rounded-evino p-3 text-[11px] text-evino-gray-600 mt-4">
            <span className="font-bold text-evino-red">💡 Insight:</span> Um Hook Rate acima de 30% indica que a cena inicial está retendo a atenção do cliente Evino.
          </div>
        </div>

      </div>
    </div>
  );
}
