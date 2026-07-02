'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export interface HourlyRoasPoint {
  hour: number;       // 0–23
  label: string;      // "00h" … "23h"
  roas: number;
  revenue: number;
  avgRevenue: number; // receita média por dia naquela hora
  spend: number;
}

interface HourlyRoasChartProps {
  data: HourlyRoasPoint[];
  isGrandCru: boolean;
  rangeLabel: string;
}

function shortR$(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as HourlyRoasPoint;
  return (
    <div className="bg-white border border-evino-gray-200 p-2.5 shadow-md rounded text-xs">
      <p className="font-semibold text-evino-ink mb-1">{label}</p>
      <p className="text-evino-gray-600">ROAS: <span className="font-bold text-evino-ink">{p.roas.toFixed(2)}x</span></p>
      <p className="text-evino-gray-600">Receita média/dia: <span className="font-bold text-evino-ink">{shortR$(p.avgRevenue)}</span></p>
      <p className="text-evino-gray-600">Receita total: <span className="font-bold text-evino-ink">{shortR$(p.revenue)}</span></p>
      <p className="text-evino-gray-600">Invest: <span className="font-bold text-evino-ink">{shortR$(p.spend)}</span></p>
    </div>
  );
};

export function HourlyRoasChart({ data, isGrandCru, rangeLabel }: HourlyRoasChartProps) {
  if (!data || data.length === 0) return null;

  // ROAS médio do período (ponderado pelo total) como referência horizontal.
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalSpend = data.reduce((s, d) => s + d.spend, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm">
      <h4 className="font-display text-sm font-semibold text-evino-ink mb-0.5">ROAS por Hora do Dia</h4>
      <p className="text-xs text-evino-gray-500 mb-3">{rangeLabel}</p>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#71717A' }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              yAxisId="roas"
              tickFormatter={(v) => `${Number(v).toFixed(1)}x`}
              tick={{ fontSize: 10, fill: '#71717A' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tickFormatter={(v) => shortR$(Number(v))}
              tick={{ fontSize: 10, fill: '#71717A' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            {avgRoas > 0 && (
              <ReferenceLine
                yAxisId="roas"
                y={avgRoas}
                stroke="#A1A1AA"
                strokeDasharray="4 4"
                label={{ value: `média ${avgRoas.toFixed(2)}x`, position: 'insideTopRight', fontSize: 10, fill: '#A1A1AA' }}
              />
            )}
            <Tooltip content={<Tip />} />
            <Bar
              yAxisId="revenue"
              dataKey="avgRevenue"
              name="Receita média/dia"
              fill="#E4C6CC"
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="roas"
              type="monotone"
              dataKey="roas"
              stroke="#7B1A2E"
              strokeWidth={2}
              dot={{ r: 2, fill: '#7B1A2E' }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
