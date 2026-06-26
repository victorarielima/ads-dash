import { Suspense } from 'react';
import Link from 'next/link';
import { getInsights, getInsightsWithBreakdowns } from '@/lib/meta/insights';
import { getCampaigns, getAds, getAdDetail, getAdSetsByCampaign } from '@/lib/meta/creative';
import { MetricCard } from '@/components/cards/MetricCard';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { MetricCardsGridSkeleton, ChartSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils/formatters';
import { calculateDelta } from '@/lib/utils/delta';
import { spDateStr, spOffsetDateStr } from '@/lib/utils/date';
import { parseActions } from '@/lib/meta/actionTypes';
import { HierarchyFilters } from '@/components/HierarchyFilters';
import { SegmentFilter } from '@/components/SegmentFilter';
import { CreativeRangeSelector } from '@/components/creative/CreativeRangeSelector';
import { saveReport } from '@/lib/supabase/reports';
import { getOrdersByCampaign, getOrdersByCreative, getGrandCruOrdersByCampaign, getGrandCruOrdersByCreative, getOrdersByMonth, getOrdersByHour, getOrdersTotals, getOrdersTotalsAllChannels } from '@/lib/redshift/queries';
import { RevenueMonthlyCharts, type MonthlyChartPoint } from '@/components/charts/RevenueMonthlyCharts';
import { HourlyRoasChart, type HourlyRoasPoint } from '@/components/charts/HourlyRoasChart';
import { ResizableTable } from '@/components/ResizableTable';
import { listAdAccounts } from '@/lib/meta/accounts';

interface OverviewPageProps {
  params: Promise<{
    adAccountId: string;
  }>;
  searchParams: Promise<{
    since?: string;
    until?: string;
    campaign_id?: string;
    adset_id?: string;
    creative_range?: string;
    segment?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function AccountOverviewPage({ params, searchParams }: OverviewPageProps) {
  const { adAccountId } = await params;
  
  if (!adAccountId.startsWith('act_')) {
    return null;
  }
  
  const { since, until, campaign_id, adset_id, creative_range, segment } = await searchParams;

  // 1. Define as datas padrão (últimos 30 dias se ausente na URL).
  // Datas no fuso de São Paulo para casar com o filtro local do Redshift.
  const defaultUntil = spDateStr();
  const defaultSince = spOffsetDateStr(29);

  const currentSince = since || defaultSince;
  const currentUntil = until || defaultUntil;

  // Coluna "ROAS LC (período anterior)": aparece em todos os presets de período
  // (hoje, ontem, 7/30/90 dias) e some no "Personalizado". O rótulo descreve o
  // período anterior equivalente (ex.: "Ontem" quando o filtro é "Hoje").
  const prevPeriod = getPrevPeriodColumn(currentSince, currentUntil, defaultUntil);

  // 2. Calcula o período de duração equivalente anterior para cálculo do delta
  const sDate = new Date(currentSince + 'T00:00:00');
  const uDate = new Date(currentUntil + 'T00:00:00');
  const diffDays = Math.ceil(Math.abs(uDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prevUntilDate = new Date(sDate.getTime());
  prevUntilDate.setDate(sDate.getDate() - 1);
  const prevUntil = prevUntilDate.toISOString().split('T')[0];

  const prevSinceDate = new Date(prevUntilDate.getTime());
  prevSinceDate.setDate(prevUntilDate.getDate() - (diffDays - 1));
  const prevSince = prevSinceDate.toISOString().split('T')[0];

  // 3. Determina o período de data local para os criativos
  let creativeSince = currentSince;
  let creativeUntil = currentUntil;

  if (creative_range && creative_range !== 'default') {
    const cToday = new Date();
    creativeUntil = cToday.toISOString().split('T')[0];
    
    if (creative_range === 'today') {
      creativeSince = creativeUntil;
    } else if (creative_range === 'yesterday') {
      const yest = new Date();
      yest.setDate(cToday.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      creativeSince = yestStr;
      creativeUntil = yestStr;
    } else if (creative_range === 'last_7d') {
      const sDate = new Date();
      sDate.setDate(cToday.getDate() - 6);
      creativeSince = sDate.toISOString().split('T')[0];
    } else if (creative_range === 'last_30d') {
      const sDate = new Date();
      sDate.setDate(cToday.getDate() - 29);
      creativeSince = sDate.toISOString().split('T')[0];
    } else if (creative_range === 'last_90d') {
      const sDate = new Date();
      sDate.setDate(cToday.getDate() - 89);
      creativeSince = sDate.toISOString().split('T')[0];
    }
  }

  // 4. Resolução de Entidade para Lógica Hierárquica
  let activeEntityId = adAccountId;
  let activeLevel: 'account' | 'campaign' | 'adset' = 'account';

  if (adset_id) {
    activeEntityId = adset_id;
    activeLevel = 'adset';
  } else if (campaign_id) {
    activeEntityId = campaign_id;
    activeLevel = 'campaign';
  }

  // 5. Busca campanhas, adsets e nome da conta (para detectar brand)
  const [campaignsList, adSetsForCampaign, accounts] = await Promise.all([
    getCampaigns(adAccountId),
    campaign_id ? getAdSetsByCampaign(campaign_id, adAccountId) : Promise.resolve([]),
    listAdAccounts(),
  ]);

  const activeAccountName = accounts.find((a) => a.id === adAccountId)?.name?.toLowerCase() || '';
  const isGrandCru = activeAccountName.includes('grand') || activeAccountName.includes('cru');

  return (
    <div className="space-y-6">
      {/* Filtros Hierárquicos (Campanha e Conjunto de Anúncios) no topo */}
      <HierarchyFilters
        campaigns={campaignsList}
        adSets={adSetsForCampaign}
        selectedCampaignId={campaign_id}
        selectedAdSetId={adset_id}
      />

      {!campaign_id ? (
        // VISÃO GERAL DA CONTA — todas campanhas e criativos
        <div className="space-y-6">
          <Suspense fallback={<ChartSkeleton />}>
            {/* Gráficos de receita/ROAS/YoY: sempre últimos 6 meses, não seguem o filtro */}
            <RevenueChartsSection
              accountId={adAccountId}
              isGrandCru={isGrandCru}
            />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            {/* ROAS por hora do dia — segue o filtro de período selecionado */}
            <HourlyRoasSection
              accountId={adAccountId}
              isGrandCru={isGrandCru}
              currentRange={{ since: currentSince, until: currentUntil }}
            />
          </Suspense>
          {/* Filtro de segmento (Ecom / Clube) — aplica às tabelas abaixo */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-bold text-evino-gray-400 uppercase tracking-wider">Segmento</span>
            <SegmentFilter />
          </div>
          <Suspense fallback={<TableSkeleton />}>
            <AllCampaignsTable
              accountId={adAccountId}
              isGrandCru={isGrandCru}
              currentRange={{ since: currentSince, until: currentUntil }}
              prevRange={{ since: prevSince, until: prevUntil }}
              showPrevRoas={prevPeriod.show}
              prevLabel={prevPeriod.label}
              segment={segment}
            />
          </Suspense>
          <Suspense fallback={<TableSkeleton />}>
            <AllCreativesTable
              accountId={adAccountId}
              isGrandCru={isGrandCru}
              currentRange={{ since: currentSince, until: currentUntil }}
              segment={segment}
            />
          </Suspense>
        </div>
      ) : (
        // RELATÓRIO COMPLETO (SÓ EXIBE APÓS SELECIONAR A CAMPANHA)
        <>
          {/* 1. Grade de Métricas Principais (Acumulado da Entidade Ativa) */}
          <Suspense fallback={<MetricCardsGridSkeleton count={12} />}>
            <MetricsGrid
              accountId={adAccountId}
              entityId={activeEntityId}
              level={activeLevel}
              currentRange={{ since: currentSince, until: currentUntil }}
              prevRange={{ since: prevSince, until: prevUntil }}
            />
          </Suspense>

          {/* 2. Gráfico Timeline Dupla */}
          <Suspense fallback={<ChartSkeleton />}>
            <TimelineSection
              accountId={adAccountId}
              entityId={activeEntityId}
              level={activeLevel}
              timeRange={{ since: currentSince, until: currentUntil }}
            />
          </Suspense>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3. Tabela Top Campanhas ou Top Conjuntos */}
            <Suspense fallback={<TableSkeleton />}>
              <TopCampaignsOrAdSetsTable
                accountId={adAccountId}
                campaignId={campaign_id}
                timeRange={{ since: currentSince, until: currentUntil }}
              />
            </Suspense>

            {/* 4. Tabela Top 10 Criativos */}
            <Suspense fallback={<TableSkeleton />}>
              <TopCreativesTable
                accountId={adAccountId}
                entityId={activeEntityId}
                level={activeLevel}
                timeRange={{ since: creativeSince, until: creativeUntil }}
              />
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
}

// Subcomponente: Busca e renderização da grade de métricas
async function MetricsGrid({
  accountId,
  entityId,
  level,
  currentRange,
  prevRange,
}: {
  accountId: string;
  entityId: string;
  level: 'account' | 'campaign' | 'adset';
  currentRange: { since: string; until: string };
  prevRange: { since: string; until: string };
}) {
  const [currentInsights, prevInsights] = await Promise.all([
    getInsights(entityId, { level, timeRange: currentRange }).catch(() => []),
    getInsights(entityId, { level, timeRange: prevRange }).catch(() => []),
  ]);

  const current = currentInsights[0] || null;
  const prev = prevInsights[0] || null;

  const currentSpend = current ? parseFloat(current.spend || '0') : 0;
  const currentImpressions = current ? parseFloat(current.impressions || '0') : 0;
  const currentReach = current ? parseFloat(current.reach || '0') : 0;
  const currentClicks = current ? parseFloat(current.clicks || '0') : 0;
  const currentPurchases = current ? parseActions(current.actions, 'purchase') : 0;
  const currentRevenue = current ? parseActions(current.action_values, 'purchase') : 0;

  const currentCtr = currentImpressions > 0 ? (currentClicks / currentImpressions) * 100 : 0;
  const currentCpc = currentClicks > 0 ? currentSpend / currentClicks : 0;
  const currentCpm = currentImpressions > 0 ? (currentSpend / currentImpressions) * 1000 : 0;
  const currentCpa = currentPurchases > 0 ? currentSpend / currentPurchases : 0;
  const currentRoas = currentSpend > 0 ? currentRevenue / currentSpend : 0;
  const currentFreq = currentReach > 0 ? currentImpressions / currentReach : 1;

  // Persiste o snapshot das métricas no Supabase para histórico e atualização futura
  await saveReport({
    accountId,
    entityId,
    entityType: level,
    dateSince: currentRange.since,
    dateUntil: currentRange.until,
    metrics: {
      spend: currentSpend,
      impressions: currentImpressions,
      reach: currentReach,
      frequency: currentFreq,
      clicks: currentClicks,
      ctr: currentCtr,
      cpc: currentCpc,
      cpm: currentCpm,
      purchases: currentPurchases,
      revenue: currentRevenue,
      roas: currentRoas,
      cpa: currentCpa,
    },
  });

  const prevSpend = prev ? parseFloat(prev.spend || '0') : 0;
  const prevImpressions = prev ? parseFloat(prev.impressions || '0') : 0;
  const prevReach = prev ? parseFloat(prev.reach || '0') : 0;
  const prevClicks = prev ? parseFloat(prev.clicks || '0') : 0;
  const prevPurchases = prev ? parseActions(prev.actions, 'purchase') : 0;
  const prevRevenue = prev ? parseActions(prev.action_values, 'purchase') : 0;

  const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
  const prevCpc = prevClicks > 0 ? prevSpend / prevClicks : 0;
  const prevCpm = prevImpressions > 0 ? (prevSpend / prevImpressions) * 1000 : 0;
  const prevCpa = prevPurchases > 0 ? prevSpend / prevPurchases : 0;
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
  const prevFreq = prevReach > 0 ? prevImpressions / prevReach : 1;

  const deltaSpend = calculateDelta(currentSpend, prevSpend);
  const deltaImpressions = calculateDelta(currentImpressions, prevImpressions);
  const deltaReach = calculateDelta(currentReach, prevReach);
  const deltaFreq = calculateDelta(currentFreq, prevFreq);
  const deltaClicks = calculateDelta(currentClicks, prevClicks);
  const deltaCtr = calculateDelta(currentCtr, prevCtr);
  const deltaCpc = calculateDelta(currentCpc, prevCpc);
  const deltaCpm = calculateDelta(currentCpm, prevCpm);
  const deltaPurchases = calculateDelta(currentPurchases, prevPurchases);
  const deltaRevenue = calculateDelta(currentRevenue, prevRevenue);
  const deltaRoas = calculateDelta(currentRoas, prevRoas);
  const deltaCpa = calculateDelta(currentCpa, prevCpa);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-bold text-evino-gray-400 uppercase tracking-wider mb-3">Métricas de Mídia e Entrega</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Investimento" value={formatCurrency(currentSpend)} delta={deltaSpend} />
          <MetricCard label="Impressões" value={formatNumber(currentImpressions)} delta={deltaImpressions} />
          <MetricCard label="Alcance" value={formatNumber(currentReach)} delta={deltaReach} />
          <MetricCard label="Frequência" value={`${currentFreq.toFixed(2)}x`} delta={deltaFreq} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-evino-gray-400 uppercase tracking-wider mb-3">Engajamento</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Cliques (Todos)" value={formatNumber(currentClicks)} delta={deltaClicks} />
          <MetricCard label="CTR (Todos)" value={`${currentCtr.toFixed(2)}%`} delta={deltaCtr} />
          <MetricCard label="CPC" value={formatCurrency(currentCpc)} delta={deltaCpc} />
          <MetricCard label="CPM" value={formatCurrency(currentCpm)} delta={deltaCpm} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-evino-gray-400 uppercase tracking-wider mb-3">Conversões e Vendas (Vinho)</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Compras" value={formatNumber(currentPurchases)} delta={deltaPurchases} highlight />
          <MetricCard label="Receita" value={formatCurrency(currentRevenue)} delta={deltaRevenue} highlight />
          <MetricCard label="ROAS" value={`${currentRoas.toFixed(2)}x`} delta={deltaRoas} highlight />
          <MetricCard label="CPA / Custo por Compra" value={formatCurrency(currentCpa)} delta={deltaCpa} highlight />
        </div>
      </div>
    </div>
  );
}

// Subcomponente: Busca e renderização da Timeline diária
async function TimelineSection({
  accountId,
  entityId,
  level,
  timeRange,
}: {
  accountId: string;
  entityId: string;
  level: 'account' | 'campaign' | 'adset';
  timeRange: { since: string; until: string };
}) {
  const dailyInsights = await getInsights(entityId, {
    level,
    timeRange,
    timeIncrement: 1,
  }).catch(() => []);

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

// Subcomponente: Tabela de ranking das top 5 campanhas por spend (ou top adsets de uma campanha)
async function TopCampaignsOrAdSetsTable({
  accountId,
  campaignId,
  timeRange,
}: {
  accountId: string;
  campaignId?: string;
  timeRange: { since: string; until: string };
}) {
  if (campaignId) {
    const [adSetsList, adSetInsights] = await Promise.all([
      getAdSetsByCampaign(campaignId, accountId),
      getInsights(campaignId, { level: 'adset', timeRange }).catch(() => []),
    ]);

    const adSetsData = adSetInsights
      .map((ins) => {
        const struct = adSetsList.find((s) => s.id === ins.adset_id) as any || {};
        const spend = parseFloat(ins.spend || '0');
        const purchases = parseActions(ins.actions, 'purchase');
        const revenue = parseActions(ins.action_values, 'purchase');
        const roas = spend > 0 ? revenue / spend : 0;

        return {
          id: ins.adset_id || '',
          name: ins.adset_name || struct.name || 'Conjunto Desconhecido',
          status: struct.status || 'ACTIVE',
          spend,
          purchases,
          roas,
        };
      })
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    return (
      <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-evino-ink">Top 5 Conjuntos de Anúncios</h3>
            <p className="text-xs text-evino-gray-500">Conjuntos desta campanha ordenados por investimento</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase">
                <th className="p-3 rounded-l-evino">Conjunto de Anúncios</th>
                <th className="p-3 text-right">Investido</th>
                <th className="p-3 text-right">Compras</th>
                <th className="p-3 text-right rounded-r-evino">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-evino-gray-100">
              {adSetsData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-evino-gray-400">Nenhum conjunto rodou no período.</td>
                </tr>
              ) : (
                adSetsData.map((s) => (
                  <tr key={s.id} className="hover:bg-evino-gray-50 transition-colors">
                    <td className="p-3">
                      <Link
                        href={`/${accountId}/adset/${s.id}`}
                        className="font-medium text-evino-ink hover:text-evino-red hover:underline block truncate max-w-xs"
                      >
                        {s.name}
                      </Link>
                      <span className="text-[10px] text-evino-gray-400 font-mono">{s.id}</span>
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                      {formatCurrency(s.spend)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-600">
                      {formatNumber(s.purchases)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-evino-ink">
                      {s.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  } else {
    const [campaignsList, campaignInsights] = await Promise.all([
      getCampaigns(accountId),
      getInsights(accountId, { level: 'campaign', timeRange }).catch(() => []),
    ]);

    const campaignsData = campaignInsights
      .map((ins) => {
        const struct = campaignsList.find((c) => c.id === ins.campaign_id) as any || {};
        const spend = parseFloat(ins.spend || '0');
        const purchases = parseActions(ins.actions, 'purchase');
        const revenue = parseActions(ins.action_values, 'purchase');
        const roas = spend > 0 ? revenue / spend : 0;

        return {
          id: ins.campaign_id || '',
          name: ins.campaign_name || struct.name || 'Campanha Desconhecida',
          objective: struct.objective || 'OUTCOME_SALES',
          status: struct.status || 'ACTIVE',
          spend,
          purchases,
          roas,
        };
      })
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    return (
      <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-evino-ink">Top 5 Campanhas</h3>
            <p className="text-xs text-evino-gray-500">Ranking das campanhas ordenado por maior investimento</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase">
                <th className="p-3 rounded-l-evino">Campanha</th>
                <th className="p-3 text-right">Investido</th>
                <th className="p-3 text-right">Compras</th>
                <th className="p-3 text-right rounded-r-evino">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-evino-gray-100">
              {campaignsData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-evino-gray-400">Nenhuma campanha rodou no período.</td>
                </tr>
              ) : (
                campaignsData.map((c) => (
                  <tr key={c.id} className="hover:bg-evino-gray-50 transition-colors">
                    <td className="p-3">
                      <Link
                        href={`/${accountId}/campaign/${c.id}`}
                        className="font-medium text-evino-ink hover:text-evino-red hover:underline block truncate max-w-xs"
                      >
                        {c.name}
                      </Link>
                      <span className="text-[10px] text-evino-gray-400 font-mono">{c.id}</span>
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                      {formatCurrency(c.spend)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-600">
                      {formatNumber(c.purchases)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-evino-ink">
                      {c.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

// Subcomponente: Tabela de ranking dos top 10 criativos por spend (com lógica de resiliência e filtro local)
async function TopCreativesTable({
  accountId,
  entityId,
  level,
  timeRange,
}: {
  accountId: string;
  entityId: string;
  level: 'account' | 'campaign' | 'adset';
  timeRange: { since: string; until: string };
}) {
  const adInsights = await getInsights(entityId, { level: 'ad', timeRange }).catch(() => []);

  const top10Insights = [...adInsights]
    .sort((a, b) => parseFloat(b.spend || '0') - parseFloat(a.spend || '0'))
    .slice(0, 10);

  const hasNoSpend = top10Insights.length === 0 || top10Insights.every(i => parseFloat(i.spend || '0') === 0);

  let adsData = [];

  if (hasNoSpend) {
    const allRecentAds = await getAds(accountId).catch(() => []);
    
    const filteredRecentAds = allRecentAds.filter((ad: any) => {
      if (level === 'campaign') return ad.campaign_id === entityId;
      if (level === 'adset') return ad.adset_id === entityId;
      return true;
    }).slice(0, 10);

    adsData = filteredRecentAds.map((ad: any) => {
      const ins = adInsights.find(i => i.ad_id === ad.id) || null;
      const creative = (ad.creative || {}) as any;
      
      const spend = ins ? parseFloat(ins.spend || '0') : 0;
      const clicks = ins ? parseFloat(ins.clicks || '0') : 0;
      const impressions = ins ? parseFloat(ins.impressions || '0') : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const purchases = ins ? parseActions(ins.actions, 'purchase') : 0;
      const revenue = ins ? parseActions(ins.action_values, 'purchase') : 0;
      const roas = spend > 0 ? revenue / spend : 0;

      return {
        id: ad.id,
        name: ad.name,
        thumbnail: creative.thumbnail_url || creative.image_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=150&auto=format&fit=crop&q=80',
        spend,
        ctr,
        roas,
        fatigueStatus: 'Ativo Recente',
        fatigueColor: 'bg-evino-cream text-evino-ink border-evino-gray-300',
      };
    });
  } else {
    const adsDetails = await Promise.all(
      top10Insights.map((ins) => 
        getAdDetail(ins.ad_id!, accountId).catch(() => null)
      )
    );

    adsData = top10Insights.map((ins, idx) => {
      const struct = adsDetails[idx] || null;
      const creative = (struct?.creative || {}) as any;
      
      const spend = parseFloat(ins.spend || '0');
      const impressions = parseFloat(ins.impressions || '0');
      const clicks = parseFloat(ins.clicks || '0');
      const purchases = parseActions(ins.actions, 'purchase');
      const revenue = parseActions(ins.action_values, 'purchase');
      const roas = spend > 0 ? revenue / spend : 0;
      
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const frequency = parseFloat(ins.frequency || '1');

      let fatigueStatus = 'Saudável';
      let fatigueColor = 'bg-success/10 text-success border-success/20';

      if (frequency >= 3.5 && ctr < 1.5) {
        fatigueStatus = 'Fatigado';
        fatigueColor = 'bg-danger/10 text-danger border-danger/20';
      } else if (frequency >= 2.5 && ctr < 2.0) {
        fatigueStatus = 'Atenção';
        fatigueColor = 'bg-amber-50 text-amber-700 border-amber-200';
      }

      return {
        id: ins.ad_id || '',
        name: ins.ad_name || struct?.name || 'Criativo Desconhecido',
        thumbnail: creative.thumbnail_url || creative.image_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=150&auto=format&fit=crop&q=80',
        spend,
        ctr,
        roas,
        fatigueStatus,
        fatigueColor,
      };
    });
  }

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-semibold text-evino-ink">Top 10 Criativos</h3>
          <p className="text-xs text-evino-gray-500">Ranking baseado no período de prazo selecionado</p>
        </div>
        <CreativeRangeSelector />
      </div>

      <div className="overflow-y-auto max-h-[360px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase sticky top-0 z-10">
              <th className="p-3 rounded-l-evino">Criativo</th>
              <th className="p-3 text-right">Spend</th>
              <th className="p-3 text-right">ROAS</th>
              <th className="p-3 text-center rounded-r-evino">Fadiga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-evino-gray-100">
            {adsData.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-evino-gray-400">Nenhum criativo rodou no período.</td>
              </tr>
            ) : (
              adsData.map((ad) => (
                <tr key={ad.id} className="hover:bg-evino-gray-50 transition-colors">
                  <td className="p-3 flex items-center gap-3">
                    <img
                      src={ad.thumbnail}
                      alt={ad.name}
                      className="w-10 h-10 object-cover rounded-evino border border-evino-gray-200 shrink-0"
                    />
                    <div className="truncate max-w-[160px]">
                      <Link
                        href={`/${accountId}/ad/${ad.id}`}
                        className="font-medium text-evino-ink hover:text-evino-red hover:underline block truncate"
                        title={ad.name}
                      >
                        {ad.name}
                      </Link>
                      <span className="text-[10px] text-evino-gray-400 font-mono">{ad.id}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                    {formatCurrency(ad.spend)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-bold text-evino-ink">
                    {ad.roas.toFixed(2)}x
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-evino text-[10px] font-semibold border ${ad.fatigueColor}`}>
                      {ad.fatigueStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Helpers de cor ────────────────────────────────────────────────────────────

function getRoasColorClass(roas: number): string {
  if (roas <= 0) return 'bg-evino-gray-100 text-evino-gray-400';
  if (roas >= 8) return 'bg-green-600 text-white';
  if (roas >= 4) return 'bg-green-400 text-green-950';
  if (roas >= 3) return 'bg-lime-300 text-lime-950';
  if (roas >= 2) return 'bg-amber-300 text-amber-900';
  return 'bg-orange-400 text-white';
}

function getCacColorClass(cac: number): string {
  if (cac <= 0) return 'bg-evino-gray-100 text-evino-gray-400';
  if (cac <= 380) return 'bg-green-400 text-green-950';
  if (cac <= 520) return 'bg-lime-300 text-lime-950';
  if (cac <= 700) return 'bg-amber-300 text-amber-900';
  return 'bg-red-400 text-white';
}

function getCm2ColorClass(pct: number): string {
  if (pct <= 0) return 'bg-evino-gray-100 text-evino-gray-400';
  if (pct >= 35) return 'bg-green-500 text-white';
  if (pct >= 28) return 'bg-lime-300 text-lime-950';
  if (pct >= 22) return 'bg-amber-300 text-amber-900';
  return 'bg-orange-400 text-white';
}

function getTicketColorClass(ticket: number): string {
  if (ticket <= 0) return 'bg-evino-gray-100 text-evino-gray-400';
  if (ticket >= 600) return 'bg-green-500 text-white';
  if (ticket >= 400) return 'bg-lime-300 text-lime-950';
  if (ticket >= 280) return 'bg-amber-300 text-amber-900';
  return 'bg-orange-400 text-white';
}

// Define se a coluna "ROAS LC (período anterior)" deve aparecer e seu rótulo.
// Regra: em qualquer preset de período (hoje, ontem, 7/30/90 dias) a coluna
// mostra o ROAS do período imediatamente anterior de MESMA duração — hoje→ontem,
// 7 dias→7 dias anteriores, etc. No "Personalizado" não há período anterior
// canônico, então a coluna é omitida. (todayStr é a data local de SP.)
function getPrevPeriodColumn(
  since: string,
  until: string,
  todayStr: string
): { show: boolean; label: string } {
  const diffDays = Math.round(
    (new Date(until + 'T00:00:00').getTime() - new Date(since + 'T00:00:00').getTime()) / 86_400_000
  );

  if (diffDays === 0 && since === todayStr) return { show: true, label: 'Ontem' };
  if (diffDays === 0 && since === spOffsetDateStr(1)) return { show: true, label: 'Anteontem' };
  if (diffDays === 6 && until === todayStr) return { show: true, label: '7d ant.' };
  if (diffDays === 29 && until === todayStr) return { show: true, label: '30d ant.' };
  if (diffDays === 89 && until === todayStr) return { show: true, label: '90d ant.' };
  return { show: false, label: '' };
}

// Classifica/filtra pelo segmento embutido no nome do conjunto de anúncios:
// "Evino-Ecomm-…" (ecom) vs "Evino-Clube-…" (clube). segment vazio = todos.
function matchesSegment(name: string, segment?: string): boolean {
  const seg = (segment || '').toLowerCase();
  if (seg !== 'ecom' && seg !== 'clube') return true;
  const n = (name || '').toLowerCase();
  if (seg === 'ecom') return n.includes('ecom');
  return n.includes('clube');
}

// ── Tabela: Visão geral de todas as campanhas ────────────────────────────────

async function AllCampaignsTable({
  accountId,
  isGrandCru,
  currentRange,
  prevRange,
  showPrevRoas,
  prevLabel,
  segment,
}: {
  accountId: string;
  isGrandCru: boolean;
  currentRange: { since: string; until: string };
  prevRange: { since: string; until: string };
  showPrevRoas: boolean;
  prevLabel: string;
  segment?: string;
}) {
  // Meta: invest + ROAS período anterior; Redshift: receita real / ativações.
  // IMPORTANTE: o que chamamos de "campanha" aqui é, na verdade, o conjunto de
  // anúncios (ad group/adset) da Meta. O Looker/Redshift expõe o nome do adset na
  // coluna utm_campaign, então puxamos os insights no nível 'adset' e casamos a
  // receita por adset_name (não campaign_name) — isso evita divergências quando
  // uma campanha tem mais de um adset (ex.: "premium" e "premium v2").
  const [currentInsights, prevInsights, rsRows] = await Promise.all([
    getInsights(accountId, { level: 'adset', timeRange: currentRange, paginate: true, limit: 500 }).catch(() => []),
    getInsights(accountId, { level: 'adset', timeRange: prevRange, paginate: true, limit: 500 }).catch(() => []),
    isGrandCru
      ? getGrandCruOrdersByCampaign(currentRange.since, currentRange.until).catch(() => [])
      : getOrdersByCampaign(currentRange.since, currentRange.until).catch(() => []),
  ]);

  const prevRoasByAdset = new Map<string, number>();
  for (const ins of prevInsights) {
    const spend = parseFloat(ins.spend || '0');
    const revenue = parseActions(ins.action_values, 'purchase');
    const roas = spend > 0 ? revenue / spend : 0;
    if (ins.adset_id) prevRoasByAdset.set(ins.adset_id, roas);
  }

  const rsMap = new Map(rsRows.map((r) => [r.utm_campaign, r]));

  const rows = currentInsights
    .map((ins) => {
      const spend = parseFloat(ins.spend || '0');
      const name = ins.adset_name || 'Conjunto Desconhecido';
      const rs = rsMap.get(name) as any;

      const revenue = isGrandCru ? 0 : (rs?.total_revenue ?? 0);
      // Ativação = primeira compra do cliente (is_first_order). Grand Cru: sem coluna, usa pedidos.
      const activations = isGrandCru ? (rs?.total_orders ?? 0) : (rs?.total_activations ?? 0);
      const cm2 = isGrandCru ? 0 : (rs?.total_cm2 ?? 0);
      // ROAS: real (Evino) ou da Meta (Grand Cru — sem receita no Redshift)
      const metaRevenue = parseActions(ins.action_values, 'purchase');
      const roas = isGrandCru
        ? (spend > 0 && metaRevenue > 0 ? metaRevenue / spend : 0)
        : (spend > 0 && revenue > 0 ? revenue / spend : 0);
      // CAC = custo por aquisição de cliente = investimento / ativações
      const cac = activations > 0 ? spend / activations : 0;

      return {
        id: ins.adset_id || '',
        name,
        spend,
        revenue,
        activations,
        cm2,
        roas,
        prevRoas: prevRoasByAdset.get(ins.adset_id || '') ?? null,
        cac,
      };
    })
    .filter((r) => matchesSegment(r.name, segment))
    .sort((a, b) => b.spend - a.spend);

  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  // A coluna "ROAS LC (período anterior)" aparece em todos os presets de período
  // e some no "Personalizado" (showPrevRoas).
  const campaignColSpan = (isGrandCru ? 7 : 9) - (showPrevRoas ? 0 : 1);

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-evino-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-evino-ink">Campanhas</h3>
          <p className="text-xs text-evino-gray-500">{currentRange.since} até {currentRange.until}</p>
        </div>
      </div>
      <ResizableTable className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-[#1a2744] text-white text-xs font-semibold uppercase tracking-wider">
              <th className="p-3 min-w-[220px]">Campanha</th>
              <th className="p-3 text-right whitespace-nowrap">Invest</th>
              <th className="p-3 text-right whitespace-nowrap">% Invest</th>
              {!isGrandCru && (
                <>
                  <th className="p-3 text-right whitespace-nowrap">Receita LC</th>
                  <th className="p-3 text-right whitespace-nowrap">% Receita LC</th>
                </>
              )}
              <th className="p-3 text-center whitespace-nowrap">{isGrandCru ? 'ROAS Meta' : 'ROAS LC'}</th>
              {showPrevRoas && (
                <th className="p-3 text-center whitespace-nowrap capitalize">{isGrandCru ? `ROAS Meta ${prevLabel}` : `ROAS LC ${prevLabel}`}</th>
              )}
              <th className="p-3 text-right whitespace-nowrap">Ativações</th>
              <th className="p-3 text-center whitespace-nowrap">{isGrandCru ? 'CAC' : 'CAC LC'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-evino-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={campaignColSpan} className="p-6 text-center text-evino-gray-400">
                  Nenhuma campanha rodou no período.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const pctSpend = totalSpend > 0 ? (row.spend / totalSpend) * 100 : 0;
                const pctRevenue = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
                return (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-evino-gray-50/50'}>
                    <td className="p-3 max-w-[300px]">
                      <Link
                        href={`/${accountId}/adset/${row.id}?since=${currentRange.since}&until=${currentRange.until}`}
                        className="font-medium text-evino-ink hover:text-evino-red hover:underline block truncate"
                        title={row.name}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                      {formatCurrency(row.spend)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-500">
                      {pctSpend.toFixed(1)}%
                    </td>
                    {!isGrandCru && (
                      <>
                        <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-500">
                          {pctRevenue.toFixed(1)}%
                        </td>
                      </>
                    )}
                    <td className="p-3 text-center">
                      <span className={`inline-block min-w-[52px] px-2 py-0.5 rounded text-xs font-bold ${getRoasColorClass(row.roas)}`}>
                        {row.roas > 0 ? row.roas.toFixed(2) : '0.00'}
                      </span>
                    </td>
                    {showPrevRoas && (
                      <td className="p-3 text-center font-mono text-xs tabular-nums text-evino-gray-600">
                        {row.prevRoas !== null ? row.prevRoas.toFixed(2) : '-'}
                      </td>
                    )}
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                      {formatNumber(row.activations)}
                    </td>
                    <td className="p-3 text-center">
                      {row.cac > 0 ? (
                        <span className={`inline-block min-w-[72px] px-2 py-0.5 rounded text-xs font-bold ${getCacColorClass(row.cac)}`}>
                          {formatCurrency(row.cac)}
                        </span>
                      ) : (
                        <span className="text-evino-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ResizableTable>
    </div>
  );
}

// ── Gráficos de receita mensais (todas as campanhas) ─────────────────────────

async function RevenueChartsSection({
  accountId,
  isGrandCru,
}: {
  accountId: string;
  isGrandCru: boolean;
}) {
  // Estes gráficos são fixos nos últimos 6 meses e NÃO seguem o filtro de datas.
  // Datas no fuso de São Paulo para casar com o filtro local do Redshift.
  const todayStr = spDateStr();
  const [spYear, spMonth] = todayStr.split('-').map((n) => parseInt(n)); // spMonth: 1-12
  // Primeiro dia do mês 5 meses atrás → janela de 6 meses incluindo o mês atual.
  const sixMonthRange = {
    since: `${spMonth - 5 <= 0 ? spYear - 1 : spYear}-${String(((spMonth - 5 + 11) % 12) + 1).padStart(2, '0')}-01`,
    until: todayStr,
  };

  const yoySince = (() => {
    const d = new Date(sixMonthRange.since + 'T00:00:00');
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  })();
  const yoyUntil = (() => {
    const d = new Date(sixMonthRange.until + 'T00:00:00');
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  })();

  // Snapshot do dia atual (receita real LC + investimento Meta de hoje).
  const todayRange = { since: todayStr, until: todayStr };

  const [monthlyInsights, rsMonthly, yoyRsMonthly, todayInsights, rsToday, rsTodayAllChannels] = await Promise.all([
    getInsights(accountId, { level: 'account', timeRange: sixMonthRange, timeIncrement: 'monthly' }).catch(() => []),
    !isGrandCru ? getOrdersByMonth(sixMonthRange.since, sixMonthRange.until).catch(() => []) : Promise.resolve([]),
    !isGrandCru ? getOrdersByMonth(yoySince, yoyUntil).catch(() => []) : Promise.resolve([]),
    getInsights(accountId, { level: 'account', timeRange: todayRange }).catch(() => []),
    !isGrandCru ? getOrdersTotals(todayStr, todayStr).catch(() => ({ total_revenue: 0, total_orders: 0 })) : Promise.resolve({ total_revenue: 0, total_orders: 0 }),
    !isGrandCru ? getOrdersTotalsAllChannels(todayStr, todayStr).catch(() => 0) : Promise.resolve(0),
  ]);

  // Métricas de hoje: receita LC (Redshift) p/ Evino, receita Meta p/ Grand Cru.
  const todayIns = todayInsights[0] || null;
  const todaySpend = todayIns ? parseFloat(todayIns.spend || '0') : 0;
  const todayMetaRevenue = todayIns ? parseActions(todayIns.action_values, 'purchase') : 0;
  const todayRevenue = isGrandCru ? todayMetaRevenue : rsToday.total_revenue;
  const todayRoas = todaySpend > 0 ? todayRevenue / todaySpend : 0;
  // Share de receita: Facebook / total de todos os canais (só Evino tem o dado LC).
  const todayRevenueShare = !isGrandCru && rsTodayAllChannels > 0
    ? (rsToday.total_revenue / rsTodayAllChannels) * 100
    : null;

  const spendByMonth = new Map<string, number>();
  const metaRevenueByMonth = new Map<string, number>();
  for (const ins of monthlyInsights) {
    const mk = (ins.date_start || '').slice(0, 7);
    if (!mk) continue;
    spendByMonth.set(mk, (spendByMonth.get(mk) || 0) + parseFloat(ins.spend || '0'));
    metaRevenueByMonth.set(mk, (metaRevenueByMonth.get(mk) || 0) + parseActions(ins.action_values, 'purchase'));
  }

  const rsRevenueByMonth = new Map<string, number>();
  for (const r of rsMonthly as any[]) {
    const mk = String(r.month || '').slice(0, 7);
    if (mk) rsRevenueByMonth.set(mk, r.total_revenue ?? 0);
  }

  const yoyRevenueByMonth = new Map<string, number>();
  for (const r of yoyRsMonthly as any[]) {
    const mk = String(r.month || '').slice(0, 7);
    if (mk) yoyRevenueByMonth.set(mk, r.total_revenue ?? 0);
  }

  const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const chartData: MonthlyChartPoint[] = Array.from(spendByMonth.keys())
    .sort()
    .map((mk) => {
      const [yearStr, monthStr] = mk.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const spend = spendByMonth.get(mk) || 0;
      const metaRevenue = metaRevenueByMonth.get(mk) || 0;
      const rsRevenue = rsRevenueByMonth.get(mk) || 0;
      const revenue = isGrandCru ? metaRevenue : rsRevenue;
      const roas = spend > 0 ? revenue / spend : 0;

      const yoyMk = `${year - 1}-${String(month).padStart(2, '0')}`;
      const yoyRev = !isGrandCru && yoyRevenueByMonth.has(yoyMk) ? yoyRevenueByMonth.get(yoyMk)! : null;
      const yoyGrowth = yoyRev !== null && yoyRev > 0 ? ((revenue - yoyRev) / yoyRev) * 100 : null;

      return {
        monthKey: mk,
        label: `${PT_MONTHS[month - 1]}/${String(year).slice(2)}`,
        revenue,
        spend,
        roas,
        yoyGrowth,
      };
    });

  return (
    <div className="space-y-4">
      <RevenueMonthlyCharts data={chartData} isGrandCru={isGrandCru} />

      {/* Snapshot do dia atual — receita e ROAS especificamente de hoje */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm">
        <h4 className="font-display text-sm font-semibold text-evino-ink mb-0.5">Hoje</h4>
        <p className="text-xs text-evino-gray-500 mb-3">
          {isGrandCru ? 'Receita Meta Ads' : 'Receita LC (Redshift)'} e ROAS · {todayStr}
        </p>
        <div className={`grid gap-4 ${todayRevenueShare !== null ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'}`}>
          <MetricCard label="Receita (hoje)" value={formatCurrency(todayRevenue)} highlight />
          <MetricCard label="ROAS (hoje)" value={`${todayRoas.toFixed(2)}x`} highlight />
          {todayRevenueShare !== null && (
            <MetricCard label="Share de Receita (hoje)" value={`${todayRevenueShare.toFixed(1)}%`} highlight />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gráfico: ROAS por hora do dia (segue o filtro de período) ─────────────────

async function HourlyRoasSection({
  accountId,
  isGrandCru,
  currentRange,
}: {
  accountId: string;
  isGrandCru: boolean;
  currentRange: { since: string; until: string };
}) {
  // Spend por hora (Meta, breakdown horário) + receita por hora (Redshift p/ Evino;
  // Meta p/ Grand Cru). Sem time_increment, a Meta já agrega o spend de cada hora
  // somando todas as datas do período — mesma lógica do getOrdersByHour no Redshift.
  const [hourlyInsights, rsHours] = await Promise.all([
    getInsightsWithBreakdowns(accountId, 'hourly', { timeRange: currentRange }, 'account').catch(() => []),
    isGrandCru ? Promise.resolve([]) : getOrdersByHour(currentRange.since, currentRange.until).catch(() => []),
  ]);

  // Agrega spend (e receita Meta) por hora 0–23 a partir do bucket "HH:00:00 - HH:59:59".
  const spendByHour = new Map<number, number>();
  const metaRevenueByHour = new Map<number, number>();
  for (const ins of hourlyInsights) {
    const bucket = ins.hourly_stats_aggregated_by_advertiser_time_zone;
    if (!bucket) continue;
    const hour = parseInt(bucket.slice(0, 2));
    if (Number.isNaN(hour)) continue;
    spendByHour.set(hour, (spendByHour.get(hour) || 0) + parseFloat(ins.spend || '0'));
    metaRevenueByHour.set(hour, (metaRevenueByHour.get(hour) || 0) + parseActions(ins.action_values, 'purchase'));
  }

  const rsRevenueByHour = new Map<number, number>();
  for (const r of rsHours as any[]) {
    rsRevenueByHour.set(r.hour, r.total_revenue ?? 0);
  }

  const data: HourlyRoasPoint[] = Array.from({ length: 24 }, (_, hour) => {
    const spend = spendByHour.get(hour) || 0;
    const revenue = isGrandCru ? (metaRevenueByHour.get(hour) || 0) : (rsRevenueByHour.get(hour) || 0);
    const roas = spend > 0 ? revenue / spend : 0;
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}h`,
      roas,
      revenue,
      spend,
    };
  });

  // Sem nenhum spend no período → não renderiza o gráfico.
  if (data.every((d) => d.spend === 0)) return null;

  return (
    <HourlyRoasChart
      data={data}
      isGrandCru={isGrandCru}
      rangeLabel={`${currentRange.since} até ${currentRange.until}`}
    />
  );
}

// ── Tabela: Visão geral de todos os criativos (dados reais do Redshift) ──────

async function AllCreativesTable({
  accountId,
  isGrandCru,
  currentRange,
  segment,
}: {
  accountId: string;
  isGrandCru: boolean;
  currentRange: { since: string; until: string };
  segment?: string;
}) {
  // Receita real (Redshift, por utm_content) + investimento da Meta (por ad_name).
  const [rsRows, adInsights] = await Promise.all([
    isGrandCru
      ? getGrandCruOrdersByCreative(currentRange.since, currentRange.until).catch(() => [])
      : getOrdersByCreative(currentRange.since, currentRange.until).catch(() => []),
    isGrandCru
      ? Promise.resolve([])
      : getInsights(accountId, { level: 'ad', timeRange: currentRange, paginate: true, limit: 500 }).catch(() => []),
  ]);

  // Investimento por criativo: casa (utm_campaign + utm_content) do Redshift com
  // (adset_name + ad_name) da Meta. O utm_campaign do Looker/Redshift é, na verdade,
  // o nome do conjunto de anúncios (adset), por isso casamos por adset_name e não
  // campaign_name. Usar o adset além do nome do criativo evita somar/duplicar o
  // spend quando o mesmo criativo roda em + de 1 conjunto.
  const norm = (s?: string) => (s || '').trim();
  const spendKey = (adset: string, creative: string) => `${norm(adset)}|||${norm(creative)}`;
  const spendByContent = new Map<string, number>();
  for (const ins of adInsights) {
    const name = norm(ins.ad_name);
    if (!name) continue;
    const key = spendKey(ins.adset_name || '', name);
    spendByContent.set(key, (spendByContent.get(key) || 0) + parseFloat(ins.spend || '0'));
  }

  const rows = (rsRows as any[]).map((r) => {
    const revenue = r.total_revenue ?? 0;
    const spend = spendByContent.get(spendKey(r.utm_campaign || '', r.utm_content || '')) ?? 0;
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    return {
      name: r.utm_content,
      campaign: r.utm_campaign || '',
      revenue,
      spend,
      roas,
      orders: r.total_orders ?? 0,
      cm2: r.total_cm2 ?? 0,
      ticketMedio: (r.total_orders ?? 0) > 0 ? (r.total_revenue ?? 0) / r.total_orders : 0,
      cm2Pct: (r.total_revenue ?? 0) > 0 ? ((r.total_cm2 ?? 0) / r.total_revenue) * 100 : 0,
    };
  }).filter((row) => matchesSegment(row.campaign, segment));

  const colSpanCount = isGrandCru ? 3 : 8;

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-evino-gray-200 flex items-center gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-evino-red">Criativos</h3>
          <p className="text-xs text-evino-gray-500">{currentRange.since} até {currentRange.until} · Fonte: Redshift (last-click)</p>
        </div>
      </div>
      <ResizableTable className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-[#1a2744] text-white text-xs font-semibold uppercase tracking-wider">
              <th className="p-3 w-10 text-center">#</th>
              <th className="p-3 min-w-[300px]">Utm Content</th>
              <th className="p-3 text-right whitespace-nowrap">Pedidos</th>
              {!isGrandCru && (
                <>
                  <th className="p-3 text-right whitespace-nowrap">Investido</th>
                  <th className="p-3 text-center min-w-[240px] whitespace-nowrap">Receita Total c/ Frete</th>
                  <th className="p-3 text-center whitespace-nowrap">ROAS LC</th>
                  <th className="p-3 text-center whitespace-nowrap">Ticket Médio</th>
                  <th className="p-3 text-center whitespace-nowrap">CM2 (%)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-evino-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="p-6 text-center text-evino-gray-400">
                  Nenhum criativo encontrado no Redshift para o período.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                return (
                  <tr key={`${row.name}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-evino-gray-50/50'}>
                    <td className="p-3 text-center text-evino-gray-400 text-xs font-mono">{idx + 1}</td>
                    <td className="p-3 max-w-[380px]">
                      <span
                        className="font-medium text-evino-ink block truncate"
                        title={row.name}
                      >
                        {row.name}
                      </span>
                      {row.campaign && (
                        <span className="text-[10px] text-evino-gray-400 block truncate">
                          {row.campaign}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                      {formatNumber(row.orders)}
                    </td>
                    {!isGrandCru && (
                      <>
                        <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">
                          {formatCurrency(row.spend)}
                        </td>
                        <td className="p-3 text-center font-mono text-xs tabular-nums text-evino-ink whitespace-nowrap">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block min-w-[52px] px-2 py-0.5 rounded text-xs font-bold ${getRoasColorClass(row.roas)}`}>
                            {row.roas > 0 ? row.roas.toFixed(2) : '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block min-w-[80px] px-2 py-0.5 rounded text-xs font-bold ${getTicketColorClass(row.ticketMedio)}`}>
                            {formatCurrency(row.ticketMedio)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block min-w-[56px] px-2 py-0.5 rounded text-xs font-bold ${getCm2ColorClass(row.cm2Pct)}`}>
                            {row.cm2Pct.toFixed(1)}%
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ResizableTable>
    </div>
  );
}
