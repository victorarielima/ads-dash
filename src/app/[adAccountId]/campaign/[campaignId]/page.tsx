import React, { Suspense } from 'react';
import Link from 'next/link';
import { getCampaignDetail, getAdSets } from '@/lib/meta/creative';
import { getInsights } from '@/lib/meta/insights';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';
import { parseActions } from '@/lib/meta/actionTypes';
import { MetricCard } from '@/components/cards/MetricCard';
import { ArrowLeft, Layers, Landmark, Sparkles, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface CampaignPageProps {
  params: Promise<{
    adAccountId: string;
    campaignId: string;
  }>;
  searchParams: Promise<{
    since?: string;
    until?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function CampaignDrilldownPage({ params, searchParams }: CampaignPageProps) {
  const { adAccountId, campaignId } = await params;
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
      
      {/* Voltar */}
      <div className="flex items-center gap-2">
        <Link
          href={`/${adAccountId}?since=${currentSince}&until=${currentUntil}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-evino-gray-500 hover:text-evino-red transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Overview da Conta</span>
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CampaignLoader
          accountId={adAccountId}
          campaignId={campaignId}
          range={range}
        />
      </Suspense>
    </div>
  );
}

async function CampaignLoader({
  accountId,
  campaignId,
  range,
}: {
  accountId: string;
  campaignId: string;
  range: { since: string; until: string };
}) {
  const campaign = await getCampaignDetail(campaignId, accountId);

  if (!campaign) {
    return (
      <div className="bg-white border border-evino-gray-200 rounded-evino p-6 text-center">
        <p className="text-evino-gray-500 font-semibold">Campanha não encontrada na Meta API.</p>
      </div>
    );
  }

  // Puxa adsets filhos e insights da campanha
  const [adSetsList, campaignInsights] = await Promise.all([
    getAdSets(accountId),
    getInsights(campaignId, { level: 'campaign', timeRange: range }),
  ]);

  const adsetsInCampaign = adSetsList.filter(s => s.campaign_id === campaignId);
  const insights = campaignInsights[0] || null;

  // Métricas acumuladas
  const spend = insights ? parseFloat(insights.spend || '0') : 0;
  const impressions = insights ? parseFloat(insights.impressions || '0') : 0;
  const clicks = insights ? parseFloat(insights.clicks || '0') : 0;
  const purchases = insights ? parseActions(insights.actions, 'purchase') : 0;
  const revenue = insights ? parseActions(insights.action_values, 'purchase') : 0;
  const roas = spend > 0 ? revenue / spend : 0;

  // Puxa insights individuais de cada adset para calcular o share e métricas na tabela
  const adsetsInsightsPromises = adsetsInCampaign.map(s => getInsights(s.id, { level: 'adset', timeRange: range }));
  const adsetsInsightsResults = await Promise.all(adsetsInsightsPromises);

  const adsetsData = adsetsInCampaign.map((set, idx) => {
    const setIns = adsetsInsightsResults[idx]?.[0] || null;
    const setSpend = setIns ? parseFloat(setIns.spend || '0') : 0;
    const setPurchases = setIns ? parseActions(setIns.actions, 'purchase') : 0;
    const setRevenue = setIns ? parseActions(setIns.action_values, 'purchase') : 0;
    const setRoas = setSpend > 0 ? setRevenue / setSpend : 0;
    const share = spend > 0 ? (setSpend / spend) * 100 : 0;

    return {
      id: set.id,
      name: set.name,
      status: set.status,
      spend: setSpend,
      purchases: setPurchases,
      roas: setRoas,
      share,
      optimization: set.optimization_goal,
    };
  }).sort((a, b) => b.spend - a.spend);

  // Determina CBO
  const isCbo = !!campaign.daily_budget || !!campaign.lifetime_budget;
  const budgetVal = campaign.daily_budget || campaign.lifetime_budget || '0';
  const isDaily = !!campaign.daily_budget;

  const getObjectiveLabel = (obj: string) => {
    switch (obj) {
      case 'OUTCOME_SALES': return 'Vendas (Purchase)';
      case 'OUTCOME_TRAFFIC': return 'Tráfego de Site';
      case 'OUTCOME_LEADS': return 'Geração de Leads';
      case 'OUTCOME_AWARENESS': return 'Reconhecimento de Marca';
      case 'OUTCOME_ENGAGEMENT': return 'Engajamento';
      default: return obj;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Campanha */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] bg-evino-red-50 border border-evino-red-100 rounded px-1.5 py-0.5 font-mono text-evino-red font-bold">
              CAMPANHA METAS ADS
            </span>
            <h1 className="font-display text-2xl font-bold text-evino-ink tracking-tight mt-1.5">
              {campaign.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-evino-gray-500 mt-1.5">
              <span>Objetivo: <span className="font-bold text-evino-ink">{getObjectiveLabel(campaign.objective)}</span></span>
              <span>•</span>
              <span>Tipo de Compra: <span className="font-mono text-evino-ink">{campaign.buying_type}</span></span>
            </div>
          </div>
          <span className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border leading-none self-start md:self-auto',
            campaign.status === 'ACTIVE'
              ? 'bg-success/5 text-success border-success/20'
              : 'bg-evino-gray-100 text-evino-gray-500 border-evino-gray-200'
          )}>
            {campaign.status === 'ACTIVE' ? 'ATIVO' : 'PAUSADO'}
          </span>
        </div>
      </div>

      {/* Cards Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Investido" value={formatCurrency(spend)} />
        <MetricCard label="Impressões" value={formatNumber(impressions)} />
        <MetricCard label="Compras" value={formatNumber(purchases)} highlight />
        <MetricCard label="ROAS da Campanha" value={`${roas.toFixed(2)}x`} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bloco Orçamento e CBO */}
        <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-evino-gray-100 pb-3">
            <Landmark className="w-5 h-5 text-evino-burgundy" />
            <h3 className="font-display text-lg font-bold text-evino-ink">Orçamento da Campanha</h3>
          </div>
          
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-evino-gray-500 font-semibold uppercase">Otimização de Orçamento (CBO / Advantage+)</span>
              <span className={clsx(
                'font-bold px-1.5 py-0.5 rounded text-[10px] border',
                isCbo ? 'bg-success/5 text-success border-success/20' : 'bg-evino-gray-100 text-evino-gray-500 border-evino-gray-200'
              )}>
                {isCbo ? 'ATIVO (CBO)' : 'DESATIVO (ABO)'}
              </span>
            </div>

            <div className="border-t border-evino-gray-100 pt-3 flex justify-between items-center">
              <span className="text-evino-gray-500 font-semibold uppercase">Tipo de Limite</span>
              <span className="font-bold text-evino-ink">{isDaily ? 'Limite Diário' : 'Orçamento Vitalício'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-evino-gray-500 font-semibold uppercase">Valor Configurado</span>
              <span className="font-mono font-bold text-sm text-evino-ink">
                {isCbo ? formatCurrency(parseFloat(budgetVal) / 100) : 'Configurado nos Adsets'}
              </span>
            </div>

            {campaign.budget_remaining && parseFloat(campaign.budget_remaining) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-evino-gray-500 font-semibold uppercase">Orçamento Restante</span>
                <span className="font-mono font-bold text-evino-ink">{formatCurrency(parseFloat(campaign.budget_remaining) / 100)}</span>
              </div>
            )}
            
            <div className="bg-evino-cream/40 border border-evino-gray-150 rounded p-2.5 text-[10px] text-evino-gray-500 flex items-start gap-1">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-evino-gold" />
              <span>O Advantage+ (CBO) distribui automaticamente o orçamento diário entre os adsets com melhor custo-benefício.</span>
            </div>
          </div>
        </div>

        {/* Tabela de Adsets Filhos */}
        <div className="lg:col-span-2 bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-display text-lg font-bold text-evino-ink">Conjuntos de Anúncios Filhos</h3>
            <p className="text-xs text-evino-gray-500">Distribuição do investimento e retornos individuais</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase">
                  <th className="p-3 rounded-l-evino">Conjunto (Ad Set)</th>
                  <th className="p-3 text-right">Investimento</th>
                  <th className="p-3 text-right">Share</th>
                  <th className="p-3 text-right">Compras</th>
                  <th className="p-3 text-right rounded-r-evino">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-evino-gray-100">
                {adsetsData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-evino-gray-400">Nenhum conjunto sob esta campanha.</td>
                  </tr>
                ) : (
                  adsetsData.map(set => (
                    <tr key={set.id} className="hover:bg-evino-gray-50 transition-colors">
                      <td className="p-3">
                        <Link
                          href={`/${accountId}/adset/${set.id}`}
                          className="font-medium text-evino-ink hover:text-evino-red hover:underline block truncate max-w-xs"
                        >
                          {set.name}
                        </Link>
                        <span className="text-[10px] text-evino-gray-400 font-mono">{set.id}</span>
                      </td>
                      <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">{formatCurrency(set.spend)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-xs tabular-nums text-evino-gray-600">{set.share.toFixed(1)}%</span>
                          <div className="w-16 bg-evino-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-evino-red rounded-full" style={{ width: `${set.share}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-600">{formatNumber(set.purchases)}</td>
                      <td className="p-3 text-right font-mono text-xs font-bold text-evino-ink">{set.roas.toFixed(2)}x</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
