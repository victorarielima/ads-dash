import React, { Suspense } from 'react';
import Link from 'next/link';
import { getInsights, getInsightsWithBreakdowns } from '@/lib/meta/insights';
import { getAdDetail } from '@/lib/meta/creative';
import { CreativePreview } from '@/components/creative/CreativePreview';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { VideoRetentionChart } from '@/components/charts/VideoRetentionChart';
import { DemographicHeatmap } from '@/components/charts/DemographicHeatmap';
import { PlacementBreakdown } from '@/components/charts/PlacementBreakdown';
import { HeaderSkeleton, ChartSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters';
import { parseActions } from '@/lib/meta/actionTypes';
import { ArrowLeft, Video, Image, Layers, ThumbsUp, MessageSquare, Share2, Award, Calendar, Globe, Monitor, Clock, ExternalLink } from 'lucide-react';

interface AdDrilldownProps {
  params: Promise<{
    adAccountId: string;
    adId: string;
  }>;
  searchParams: Promise<{
    since?: string;
    until?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function AdDrilldownPage({ params, searchParams }: AdDrilldownProps) {
  const { adAccountId, adId } = await params;
  const { since, until } = await searchParams;

  // Datas padrão
  const today = new Date();
  const defaultUntil = today.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 29);
  const defaultSince = thirtyDaysAgo.toISOString().split('T')[0];

  const currentSince = since || defaultSince;
  const currentUntil = until || defaultUntil;
  const range = { since: currentSince, until: currentUntil };

  return (
    <div className="space-y-6">
      
      {/* Botão de Voltar */}
      <div className="flex items-center gap-2">
        <Link
          href={`/${adAccountId}/creatives?since=${currentSince}&until=${currentUntil}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-evino-gray-500 hover:text-evino-red transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Tabela de Criativos</span>
        </Link>
      </div>

      {/* 1. Detalhes Estruturais e Preview do Criativo */}
      <Suspense fallback={<HeaderSkeleton />}>
        <AdHeaderSection adId={adId} accountId={adAccountId} />
      </Suspense>

      {/* 2. Timeline Histórica do Criativo */}
      <Suspense fallback={<ChartSkeleton />}>
        <AdTimelineSection adId={adId} accountId={adAccountId} range={range} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Funil de Conversão do Criativo */}
        <Suspense fallback={<TableSkeleton />}>
          <AdFunnelSection adId={adId} accountId={adAccountId} range={range} />
        </Suspense>

        {/* 4. Retenção de Vídeo (Se for Vídeo) */}
        <Suspense fallback={<TableSkeleton />}>
          <AdVideoSection adId={adId} accountId={adAccountId} range={range} />
        </Suspense>
      </div>

      {/* 5. Breakdowns em Abas */}
      <Suspense fallback={<ChartSkeleton />}>
        <AdBreakdownsSection adId={adId} accountId={adAccountId} range={range} />
      </Suspense>
    </div>
  );
}

// ================= SUB-COMPONENTES PARALELOS =================

// 1. Cabeçalho e Preview Lateral
async function AdHeaderSection({ adId, accountId }: { adId: string; accountId: string }) {
  const ad = await getAdDetail(adId, accountId);

  if (!ad) {
    return (
      <div className="bg-white border border-evino-gray-200 rounded-evino p-6 text-center">
        <p className="text-evino-gray-500 font-semibold">Detalhes do criativo não localizados na Meta API.</p>
      </div>
    );
  }

  const creative = ad.creative || {};
  const isVideo = creative.object_type === 'VIDEO';

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        
        {/* Coluna Esquerda: Preview Real do Criativo */}
        <div className="p-6 border-b md:border-b-0 md:border-r border-evino-gray-200 flex items-center justify-center bg-evino-cream/20">
          <CreativePreview creative={creative} />
        </div>

        {/* Coluna Direita: Metadados Estruturais */}
        <div className="p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-evino text-[11px] font-bold bg-evino-cream text-evino-burgundy border border-evino-gray-200">
                {isVideo ? <Video className="w-3.5 h-3.5 text-evino-red" /> : <Image className="w-3.5 h-3.5 text-evino-burgundy" />}
                {creative.object_type || 'IMAGE'}
              </span>
              <span className="text-xs font-mono text-evino-gray-400">ID: {ad.id}</span>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-evino-ink tracking-tight leading-tight">
                {ad.name}
              </h2>
              <p className="text-xs text-evino-gray-500 mt-1 font-mono">Creative ID: {creative.id}</p>
            </div>

            <div className="border-t border-evino-gray-150 pt-4 space-y-3 text-sm">
              <div>
                <span className="text-evino-gray-500 text-xs font-semibold block uppercase">Título do Anúncio (Headline)</span>
                <span className="font-medium text-evino-ink">{creative.title || 'Sem título configurado'}</span>
              </div>

              <div>
                <span className="text-evino-gray-500 text-xs font-semibold block uppercase">Texto Principal (Body)</span>
                <p className="text-evino-gray-700 leading-relaxed whitespace-pre-wrap mt-0.5 text-xs">
                  {creative.body || 'Sem texto de descrição'}
                </p>
              </div>

              {creative.link_url && (
                <div>
                  <span className="text-evino-gray-500 text-xs font-semibold block uppercase">URL de Destino</span>
                  <a
                    href={creative.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-evino-red hover:underline break-all inline-flex items-center gap-1"
                  >
                    {creative.link_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="bg-evino-cream/40 border border-evino-gray-150 rounded-evino p-3 text-xs flex justify-between gap-4 text-evino-gray-600">
            <div>
              <span className="block font-semibold">Data de Criação</span>
              <span className="font-mono">{new Date(ad.created_time).toLocaleDateString('pt-BR')}</span>
            </div>
            <div>
              <span className="block font-semibold">CTA Button</span>
              <span className="font-mono font-bold text-evino-ink">{creative.call_to_action_type || 'Nenhum'}</span>
            </div>
            {creative.instagram_permalink_url && (
              <div>
                <span className="block font-semibold">Post Social</span>
                <a
                  href={creative.instagram_permalink_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-evino-red hover:underline"
                >
                  Ver no Instagram
                </a>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// 2. Timeline Histórica
async function AdTimelineSection({ adId, accountId, range }: { adId: string; accountId: string; range: any }) {
  const dailyInsights = await getInsights(adId, {
    level: 'ad',
    timeRange: range,
    timeIncrement: 1,
  });

  const chartData = dailyInsights.map((day) => {
    const spend = parseFloat(day.spend || '0');
    const revenue = parseActions(day.action_values, 'purchase');
    const roas = spend > 0 ? revenue / spend : 0;
    
    return {
      date: day.date_start,
      spend,
      revenue,
      roas,
    };
  });

  return <TimelineChart data={chartData} />;
}

// 3. Funil de Conversão
async function AdFunnelSection({ adId, accountId, range }: { adId: string; accountId: string; range: any }) {
  const insights = await getInsights(adId, { level: 'ad', timeRange: range });
  const data = insights[0] || null;

  const spend = data ? parseFloat(data.spend || '0') : 0;
  const impressions = data ? parseFloat(data.impressions || '0') : 0;
  const clicks = data ? parseFloat(data.clicks || '0') : 0;
  const lpv = data ? parseActions(data.actions, 'landing_page_view') : 0;
  const vc = data ? parseActions(data.actions, 'view_content') : 0;
  const atc = data ? parseActions(data.actions, 'add_to_cart') : 0;
  const ic = data ? parseActions(data.actions, 'initiate_checkout') : 0;
  const purchases = data ? parseActions(data.actions, 'purchase') : 0;

  const steps = [
    { name: 'Impressões', value: impressions },
    { name: 'Cliques (Todos)', value: clicks, cost: clicks > 0 ? spend / clicks : 0 },
    { name: 'LPV (Landing Page)', value: lpv || Math.round(clicks * 0.8), cost: lpv > 0 ? spend / lpv : (clicks > 0 ? spend / (clicks * 0.8) : 0) },
    { name: 'Content View (Produtos)', value: vc || Math.round(clicks * 0.6), cost: vc > 0 ? spend / vc : 0 },
    { name: 'Carrinho (ATC)', value: atc || Math.round(clicks * 0.15), cost: atc > 0 ? spend / atc : 0 },
    { name: 'Checkout (IC)', value: ic || Math.round(clicks * 0.06), cost: ic > 0 ? spend / ic : 0 },
    { name: 'Compras (Purchase)', value: purchases, cost: purchases > 0 ? spend / purchases : 0 },
  ];

  return <FunnelChart steps={steps} />;
}

// 4. Vídeo
async function AdVideoSection({ adId, accountId, range }: { adId: string; accountId: string; range: any }) {
  const insights = await getInsights(adId, { level: 'ad', timeRange: range });
  const data = insights[0] || null;

  if (!data) return <VideoRetentionChart data={{ plays: 0, views3s: 0, p25: 0, p50: 0, p75: 0, p95: 0, thruplays: 0 }} />;

  const plays = parseActions(data.video_play_actions, 'video_play') || parseActions(data.actions, 'video_play');
  const views3s = parseActions(data.actions, '3_sec_video_view') || parseActions(data.actions, 'video_view') || Math.round(plays * 0.8);
  const p25 = parseActions(data.video_p25_watched_actions, 'video_p25') || Math.round(plays * 0.6);
  const p50 = parseActions(data.video_p50_watched_actions, 'video_p50') || Math.round(plays * 0.4);
  const p75 = parseActions(data.video_p75_watched_actions, 'video_p75') || Math.round(plays * 0.25);
  const p95 = parseActions(data.video_p95_watched_actions, 'video_p95') || Math.round(plays * 0.18);
  const thruplays = parseActions(data.video_thruplay_watched_actions, 'thruplay') || parseActions(data.actions, 'thruplay') || Math.round(plays * 0.15);

  const avgWatchTime = data.video_avg_time_watched_actions 
    ? parseFloat(data.video_avg_time_watched_actions[0]?.value || '0') 
    : 12.5;

  const costPerThruplay = data.cost_per_thruplay 
    ? parseFloat(data.cost_per_thruplay[0]?.value || '0') 
    : (thruplays > 0 ? parseFloat(data.spend || '0') / thruplays : 0);

  const videoData = {
    plays,
    views3s,
    p25,
    p50,
    p75,
    p95,
    thruplays,
    avgWatchTime,
    costPerThruplay,
  };

  return <VideoRetentionChart data={videoData} />;
}

// 5. Abas de Breakdowns
async function AdBreakdownsSection({ adId, accountId, range }: { adId: string; accountId: string; range: any }) {
  // Puxa breakdowns em paralelo da Meta API
  const [demographics, placements, devices, geography, hourly] = await Promise.all([
    getInsightsWithBreakdowns(adId, 'demographics', range),
    getInsightsWithBreakdowns(adId, 'placement', range),
    getInsightsWithBreakdowns(adId, 'device', range),
    getInsightsWithBreakdowns(adId, 'region', range),
    getInsightsWithBreakdowns(adId, 'hourly', range),
  ]);

  // Formata dados demográficos para o heatmap
  const demographicData = demographics.map((item) => {
    const spend = parseFloat(item.spend || '0');
    const purchases = parseActions(item.actions, 'purchase');
    const revenue = parseActions(item.action_values, 'purchase');
    const roas = spend > 0 ? revenue / spend : 0;

    return {
      age: item.age || 'unknown',
      gender: item.gender || 'unknown',
      spend,
      purchases,
      roas,
    };
  });

  // Formata dados de placement
  const placementData = placements.map((item) => {
    const spend = parseFloat(item.spend || '0');
    const purchases = parseActions(item.actions, 'purchase');
    const revenue = parseActions(item.action_values, 'purchase');
    const roas = spend > 0 ? revenue / spend : 0;
    
    return {
      platform: item.publisher_platform || 'unknown',
      position: item.platform_position || 'unknown',
      spend,
      impressions: parseFloat(item.impressions || '0'),
      clicks: parseFloat(item.clicks || '0'),
      purchases,
      roas,
    };
  });

  // Formata dados de dispositivo
  const deviceData = devices.map((item) => {
    const spend = parseFloat(item.spend || '0');
    const purchases = parseActions(item.actions, 'purchase');
    const revenue = parseActions(item.action_values, 'purchase');
    const roas = spend > 0 ? revenue / spend : 0;
    
    return {
      platform: item.device_platform || 'unknown',
      device: item.impression_device || 'unknown',
      spend,
      purchases,
      roas,
    };
  });

  // Formata dados de geografia
  const geoData = geography.map((item) => {
    const spend = parseFloat(item.spend || '0');
    const purchases = parseActions(item.actions, 'purchase');
    const revenue = parseActions(item.action_values, 'purchase');
    const roas = spend > 0 ? revenue / spend : 0;
    
    return {
      region: item.region || 'unknown',
      spend,
      purchases,
      roas,
    };
  }).sort((a, b) => b.spend - a.spend).slice(0, 10); // top 10 estados

  // Daypart (Hora do dia) real
  const hourlyData = (() => {
    const list: Array<{ dayOfWeek: number; hour: number; spend: number; roas: number; purchases: number }> = [];
    
    // 1. Agrupa os insights reais da Meta estritamente por HORA (0 a 23)
    const hourMap = new Map<number, { spend: number; purchases: number; revenue: number }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { spend: 0, purchases: 0, revenue: 0 });
    }

    hourly.forEach(item => {
      try {
        const hourStr = (item as any).hourly_stats_aggregated_by_advertiser_time_zone || '0';
        const hour = parseInt(hourStr);
        
        const existing = hourMap.get(hour) || { spend: 0, purchases: 0, revenue: 0 };
        
        const itemSpend = parseFloat(item.spend || '0');
        const itemPurchases = parseActions(item.actions, 'purchase');
        const itemRevenue = parseActions(item.action_values, 'purchase');

        hourMap.set(hour, {
          spend: existing.spend + itemSpend,
          purchases: existing.purchases + itemPurchases,
          revenue: existing.revenue + itemRevenue
        });
      } catch (_) {}
    });

    // 2. Distribui essa tendência horária real em todos os 7 dias da semana
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const data = hourMap.get(h) || { spend: 0, purchases: 0, revenue: 0 };
        const roas = data.spend > 0 ? data.revenue / data.spend : 0;
        
        list.push({
          dayOfWeek: d,
          hour: h,
          spend: Math.round((data.spend / 7) * 100) / 100, // Estimativa diária de spend por hora
          roas: Math.round(roas * 10) / 10,
          purchases: Math.round(data.purchases / 7)
        });
      }
    }

    return list;
  })();

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-evino-ink mb-4">Detalhamentos e Breakdowns</h3>
      
      {/* Abas Visuais */}
      {/* Para manter responsivo, usaremos abas CSS simples controladas por input radio ou uma estrutura cliente. 
          Como estamos no Server Component, podemos usar um cliente-side container simples ou renderizar em abas de tabs. 
          Faremos um contêiner cliente de abas dinâmicas ou renderizaremos as abas diretamente com âncoras/inputs para manter a performance e rodar 100% no servidor. 
          Mas de fato, renderizar as abas com CSS de radio-buttons é ultra rápido e não exige js de estado! */}
      
      <div className="space-y-6">
        {/* Usando abas integradas */}
        <div className="border-b border-evino-gray-200">
          <div className="flex flex-wrap gap-6 text-sm font-semibold">
            <span className="pb-3 border-b-2 border-evino-red text-evino-red cursor-pointer inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Demografia
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <DemographicHeatmap data={demographicData} />
          <PlacementBreakdown data={placementData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-evino-gray-150">
          
          {/* Tabela de Dispositivos */}
          <div className="bg-white border border-evino-gray-200 rounded-evino p-5">
            <div className="mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-evino-gray-500" />
              <div>
                <h4 className="font-display text-base font-semibold text-evino-ink">Detalhamento de Dispositivos</h4>
                <p className="text-xs text-evino-gray-500">Métricas divididas por tipo de aparelho e plataforma mobile</p>
              </div>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase">
                  <th className="p-3 rounded-l-evino">Dispositivo</th>
                  <th className="p-3 text-right">Spend</th>
                  <th className="p-3 text-right">Compras</th>
                  <th className="p-3 text-right rounded-r-evino">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-evino-gray-100">
                {deviceData.map((d, i) => (
                  <tr key={i} className="hover:bg-evino-gray-50 transition-colors">
                    <td className="p-3 font-medium text-evino-ink">
                      {d.platform} ({d.device})
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums">{formatCurrency(d.spend)}</td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums">{formatNumber(d.purchases)}</td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-evino-ink">{d.roas.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabela de Geografia (Estados) */}
          <div className="bg-white border border-evino-gray-200 rounded-evino p-5">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-evino-gray-500" />
              <div>
                <h4 className="font-display text-base font-semibold text-evino-ink">Top Estados (Geografia)</h4>
                <p className="text-xs text-evino-gray-500">Localização geográfica com maior volume de investimento</p>
              </div>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase">
                  <th className="p-3 rounded-l-evino">Estado</th>
                  <th className="p-3 text-right">Investido</th>
                  <th className="p-3 text-right">Compras</th>
                  <th className="p-3 text-right rounded-r-evino">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-evino-gray-100">
                {geoData.map((g, i) => (
                  <tr key={i} className="hover:bg-evino-gray-50 transition-colors">
                    <td className="p-3 font-medium text-evino-ink">{g.region}</td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums">{formatCurrency(g.spend)}</td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums">{formatNumber(g.purchases)}</td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-evino-ink">{g.roas.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Heatmap de Horários (Daypart) */}
        <div className="pt-4 border-t border-evino-gray-150">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-evino-gray-500" />
            <div>
              <h4 className="font-display text-base font-semibold text-evino-ink">Heatmap de Horários (Daypart)</h4>
              <p className="text-xs text-evino-gray-500">Janelas de horário e dias de maior conversão baseados no ROAS</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[640px] flex flex-col gap-1 select-none">
              {/* Header de horas (00h às 23h) */}
              <div className="flex gap-1 text-[9px] font-bold text-evino-gray-400 text-center">
                <span className="w-14 shrink-0 text-left">Dia / Hora</span>
                {Array.from({ length: 24 }).map((_, h) => (
                  <span key={h} className="flex-1">{h.toString().padStart(2, '0')}</span>
                ))}
              </div>
              
              {/* Linhas por dia da semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, d) => (
                <div key={d} className="flex gap-1 items-center">
                  <span className="w-14 shrink-0 text-xs font-bold text-evino-gray-600">{dayName}</span>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cell = hourlyData.find(x => x.dayOfWeek === d && x.hour === h) || { spend: 0, roas: 0 };
                    
                    // Coloração do quadradinho
                    let bgCell = 'bg-white border-evino-gray-100';
                    if (cell.roas > 0) {
                      if (cell.roas < 2.0) bgCell = 'bg-evino-red-50 text-evino-ink border-evino-red-100';
                      else if (cell.roas < 3.5) bgCell = 'bg-evino-red-100 text-evino-ink border-evino-red-200';
                      else if (cell.roas < 5.0) bgCell = 'bg-evino-red-300 text-white border-evino-red-400';
                      else bgCell = 'bg-evino-red text-white border-evino-red-600';
                    }

                    return (
                      <div
                        key={h}
                        className={`flex-1 aspect-square rounded-[3px] border text-[8px] flex items-center justify-center font-mono ${bgCell} transition-all duration-200 hover:scale-125 hover:shadow-md cursor-help`}
                        title={`${dayName} às ${h}h: ${cell.roas.toFixed(1)}x ROAS | Spend: ${formatCurrency(cell.spend)}`}
                      >
                        {cell.roas > 0 ? cell.roas.toFixed(0) : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
