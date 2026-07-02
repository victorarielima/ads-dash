'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

export interface MonthlyChartPoint {
  monthKey: string;
  label: string;
  revenue: number;
  spend: number;
  roas: number;
  yoyGrowth: number | null;
}

interface RevenueMonthlyChartsProps {
  data: MonthlyChartPoint[];
  isGrandCru: boolean;
}

function shortR$(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}

function getRoasColor(roas: number): string {
  if (roas >= 8) return '#16a34a';
  if (roas >= 4) return '#4ade80';
  if (roas >= 3) return '#a3e635';
  if (roas >= 2) return '#fbbf24';
  if (roas > 0) return '#fb923c';
  return '#e4e4e7';
}

const TipRevenue = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v: number = payload[0].value;
  return (
    <div className="bg-white border border-evino-gray-200 p-2.5 shadow-md rounded text-xs">
      <p className="font-semibold text-evino-ink mb-1">{label}</p>
      <p className="text-evino-gray-600">Receita: <span className="font-bold text-evino-ink">{shortR$(v)}</span></p>
    </div>
  );
};

const TipRoas = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-evino-gray-200 p-2.5 shadow-md rounded text-xs">
      <p className="font-semibold text-evino-ink mb-1">{label}</p>
      <p className="text-evino-gray-600">ROAS: <span className="font-bold text-evino-ink">{Number(payload[0].value).toFixed(2)}x</span></p>
    </div>
  );
};

const TipYoy = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0].value);
  return (
    <div className="bg-white border border-evino-gray-200 p-2.5 shadow-md rounded text-xs">
      <p className="font-semibold text-evino-ink mb-1">{label}</p>
      <p className="text-evino-gray-600">
        YoY Receita:{' '}
        <span className={`font-bold ${v >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {v >= 0 ? '+' : ''}{v.toFixed(1)}%
        </span>
      </p>
    </div>
  );
};

export function RevenueMonthlyCharts({ data }: RevenueMonthlyChartsProps) {
  if (!data || data.length === 0) return null;

  const yoyData = data.filter(d => d.yoyGrowth !== null);
  const showYoy = yoyData.length > 0;
  const gridClass = showYoy ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {/* Receita Mensal */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm">
        <h4 className="font-display text-sm font-semibold text-evino-ink mb-3">Receita Mensal</h4>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={shortR$} tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} width={56} />
              <Tooltip content={<TipRevenue />} />
              <Bar dataKey="revenue" fill="#7B1A2E" radius={[3, 3, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROAS Mensal */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm">
        <h4 className="font-display text-sm font-semibold text-evino-ink mb-3">ROAS Mensal</h4>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${Number(v).toFixed(1)}x`} tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<TipRoas />} />
              <Bar dataKey="roas" radius={[3, 3, 0, 0]} maxBarSize={48}>
                {data.map((entry, idx) => (
                  <Cell key={`roas-${idx}`} fill={getRoasColor(entry.roas)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Crescimento YoY */}
      {showYoy && (
        <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm">
          <h4 className="font-display text-sm font-semibold text-evino-ink mb-3">Crescimento YoY</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yoyData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} width={40} />
                <ReferenceLine y={0} stroke="#D4D4D8" strokeWidth={1} />
                <Tooltip content={<TipYoy />} />
                <Bar dataKey="yoyGrowth" radius={[3, 3, 0, 0]} maxBarSize={48}>
                  {yoyData.map((entry, idx) => (
                    <Cell key={`yoy-${idx}`} fill={(entry.yoyGrowth ?? 0) >= 0 ? '#16a34a' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
