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
  LabelList,
} from 'recharts';

export interface CampaignChartData {
  name: string;
  revenue: number;
  pctRevenue: number;
  roas: number;
  yoyGrowth: number | null;
}

interface RevenueCampaignChartsProps {
  data: CampaignChartData[];
  isGrandCru: boolean;
}

function truncate(name: string, max = 22): string {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

function getRoasColor(roas: number): string {
  if (roas >= 8) return '#16a34a';
  if (roas >= 4) return '#4ade80';
  if (roas >= 3) return '#a3e635';
  if (roas >= 2) return '#fbbf24';
  if (roas > 0) return '#fb923c';
  return '#e4e4e7';
}

const TooltipShare = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-evino-gray-200 p-2.5 shadow-md rounded text-xs">
      <p className="font-semibold text-evino-ink mb-1 max-w-[200px] truncate">{label}</p>
      <p className="text-evino-gray-600">Share: <span className="font-bold text-evino-ink">{Number(payload[0].value).toFixed(1)}%</span></p>
    </div>
  );
};

const TooltipRoas = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-evino-gray-200 p-2.5 shadow-md rounded text-xs">
      <p className="font-semibold text-evino-ink mb-1 max-w-[200px] truncate">{label}</p>
      <p className="text-evino-gray-600">ROAS: <span className="font-bold text-evino-ink">{Number(payload[0].value).toFixed(2)}x</span></p>
    </div>
  );
};

const TooltipYoy = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0].value);
  return (
    <div className="bg-white border border-evino-gray-200 p-2.5 shadow-md rounded text-xs">
      <p className="font-semibold text-evino-ink mb-1 max-w-[200px] truncate">{label}</p>
      <p className="text-evino-gray-600">YoY: <span className={`font-bold ${v >= 0 ? 'text-green-600' : 'text-red-500'}`}>{v >= 0 ? '+' : ''}{v.toFixed(1)}%</span></p>
    </div>
  );
};

export function RevenueCampaignCharts({ data, isGrandCru }: RevenueCampaignChartsProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 12).map(d => ({ ...d, name: truncate(d.name) }));
  const yoyData = chartData.filter(d => d.yoyGrowth !== null);

  const hasRevenue = chartData.some(d => d.pctRevenue > 0);
  const showRevenue = !isGrandCru && hasRevenue;
  const showYoy = !isGrandCru && yoyData.length > 0;

  const chartCount = (showRevenue ? 1 : 0) + 1 + (showYoy ? 1 : 0);
  const gridClass =
    chartCount === 3 ? 'grid-cols-1 lg:grid-cols-3' :
    chartCount === 2 ? 'grid-cols-1 lg:grid-cols-2' :
    'grid-cols-1 lg:grid-cols-2';

  const barH = 28;
  const chartH = Math.max(200, Math.min(chartData.length * barH + 30, 400));

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {/* Share de Receita */}
      {showRevenue && (
        <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm">
          <h4 className="font-display text-sm font-semibold text-evino-ink mb-0.5">Share de Receita</h4>
          <p className="text-xs text-evino-gray-500 mb-3">% da receita total por campanha (Redshift LC)</p>
          <div style={{ height: `${chartH}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 50, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F4F4F5" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: '#71717A' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={115}
                  tick={{ fontSize: 9, fill: '#3f3f46' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<TooltipShare />} />
                <Bar dataKey="pctRevenue" fill="#7B1A2E" radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="pctRevenue"
                    position="right"
                    formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                    style={{ fontSize: '9px' } as React.CSSProperties}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ROAS por Campanha */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm">
        <h4 className="font-display text-sm font-semibold text-evino-ink mb-0.5">ROAS por Campanha</h4>
        <p className="text-xs text-evino-gray-500 mb-3">{isGrandCru ? 'ROAS (Meta Ads)' : 'ROAS LC (Redshift)'}</p>
        <div style={{ height: `${chartH}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 55, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F4F4F5" />
              <XAxis
                type="number"
                tickFormatter={(v) => `${Number(v).toFixed(1)}x`}
                tick={{ fontSize: 10, fill: '#71717A' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={115}
                tick={{ fontSize: 9, fill: '#3f3f46' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<TooltipRoas />} />
              <Bar dataKey="roas" radius={[0, 3, 3, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={`roas-cell-${idx}`} fill={getRoasColor(entry.roas)} />
                ))}
                <LabelList
                  dataKey="roas"
                  position="right"
                  formatter={(v: any) => `${Number(v).toFixed(2)}x`}
                  style={{ fontSize: '9px' } as React.CSSProperties}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Crescimento YoY */}
      {showYoy && (
        <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm">
          <h4 className="font-display text-sm font-semibold text-evino-ink mb-0.5">Crescimento YoY</h4>
          <p className="text-xs text-evino-gray-500 mb-3">Receita vs. mesmo período do ano anterior</p>
          <div style={{ height: `${chartH}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yoyData} layout="vertical" margin={{ top: 0, right: 60, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F4F4F5" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: '#71717A' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={115}
                  tick={{ fontSize: 9, fill: '#3f3f46' }}
                  tickLine={false}
                  axisLine={false}
                />
                <ReferenceLine x={0} stroke="#D4D4D8" strokeWidth={1} />
                <Tooltip content={<TooltipYoy />} />
                <Bar dataKey="yoyGrowth" radius={[0, 3, 3, 0]}>
                  {yoyData.map((entry, idx) => (
                    <Cell key={`yoy-cell-${idx}`} fill={(entry.yoyGrowth ?? 0) >= 0 ? '#16a34a' : '#ef4444'} />
                  ))}
                  <LabelList
                    dataKey="yoyGrowth"
                    position="right"
                    formatter={(v: any) => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(0)}%`}
                    style={{ fontSize: '9px' } as React.CSSProperties}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Placeholder quando não há dados de receita (ex: Grand Cru sem tracking) */}
      {!showRevenue && !isGrandCru && (
        <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-xs text-evino-gray-400 font-medium">Share de Receita</p>
          <p className="text-[11px] text-evino-gray-400 mt-1">Sem dados de receita no Redshift para o período selecionado.</p>
        </div>
      )}
    </div>
  );
}
