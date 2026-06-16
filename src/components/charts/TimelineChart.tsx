'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';

interface TimelineChartProps {
  data: Array<{
    date: string;
    spend: number;
    revenue: number;
    roas: number;
  }>;
}

export function TimelineChart({ data }: TimelineChartProps) {
  // Caso de dados vazios
  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center border border-dashed border-evino-gray-200 bg-white rounded-evino">
        <p className="text-sm text-evino-gray-500">Sem dados suficientes para gerar a linha do tempo.</p>
      </div>
    );
  }

  // Ordena os dados por data para renderizar corretamente a linha
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Formata as datas no eixo X (ex: 26 Mai)
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch (_) {
      return tickItem;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-evino-gray-200 p-3 shadow-md rounded-evino text-xs">
          <p className="font-semibold text-evino-ink mb-1.5">{formatXAxis(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-4 justify-between py-0.5">
              <span className="flex items-center gap-1.5 text-evino-gray-600">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-evino-ink">
                {entry.name === 'ROAS'
                  ? `${parseFloat(entry.value).toFixed(2)}x`
                  : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-evino-ink">Desempenho no Tempo</h3>
          <p className="text-xs text-evino-gray-500">Acompanhamento diário de investimento vs. receita gerada</p>
        </div>
      </div>
      
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={sortedData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ED0E32" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#ED0E32" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7B1A2E" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#7B1A2E" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#71717A', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#71717A', fontSize: 11 }}
              tickFormatter={(v) => `R$ ${formatNumber(v)}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#C8A95C', fontSize: 11 }}
              tickFormatter={(v) => `${v}x`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              name="Spend"
              stroke="#ED0E32"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSpend)"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="Receita"
              stroke="#7B1A2E"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="roas"
              name="ROAS"
              stroke="#C8A95C"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
