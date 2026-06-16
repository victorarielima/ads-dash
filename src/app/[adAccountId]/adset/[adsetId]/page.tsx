import React, { Suspense } from 'react';
import Link from 'next/link';
import { getAdSetDetail, getCampaignDetail, getAdsByAdSet } from '@/lib/meta/creative';
import { getInsights } from '@/lib/meta/insights';
import { TableSkeleton, MetricCardsGridSkeleton } from '@/components/LoadingSkeleton';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters';
import { parseActions } from '@/lib/meta/actionTypes';
import { calculateDelta } from '@/lib/utils/delta';
import { MetricCard } from '@/components/cards/MetricCard';
import { ArrowLeft, Target, Award, Sparkles, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { clsx } from 'clsx';

interface AdsetPageProps {
  params: Promise<{
    adAccountId: string;
    adsetId: string;
  }>;
  searchParams: Promise<{
    since?: string;
    until?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function AdsetDrilldownPage({ params, searchParams }: AdsetPageProps) {
  const { adAccountId, adsetId } = await params;
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
        <AdsetLoader
          accountId={adAccountId}
          adsetId={adsetId}
          range={range}
        />
      </Suspense>
    </div>
  );
}

async function AdsetLoader({
  accountId,
  adsetId,
  range,
}: {
  accountId: string;
  adsetId: string;
  range: { since: string; until: string };
}) {
  const adset = await getAdSetDetail(adsetId, accountId);

  if (!adset) {
    return (
      <div className="bg-white border border-evino-gray-200 rounded-evino p-6 text-center">
        <p className="text-evino-gray-500 font-semibold">Conjunto de anúncios não encontrado na Meta API.</p>
      </div>
    );
  }

  // Puxa campanha associada, criativos filhos específicos deste adset e insights de performance em lote
  // Fazemos uma chamada consolidada de insights no nível 'ad' para o adset_id.
  // A Meta API responde com o spend/dados de TODOS os ads daquele adset em uma única request ultraleve!
  const [campaign, adsInSet, adsetInsights, adsInsights] = await Promise.all([
    getCampaignDetail(adset.campaign_id, accountId),
    getAdsByAdSet(adsetId, accountId),
    getInsights(adsetId, { level: 'adset', timeRange: range }),
    getInsights(adsetId, { level: 'ad', timeRange: range }).catch(() => []),
  ]);

  const insights = adsetInsights[0] || null;

  // Métricas do adset
  const spend = insights ? parseFloat(insights.spend || '0') : 0;
  const impressions = insights ? parseFloat(insights.impressions || '0') : 0;
  const clicks = insights ? parseFloat(insights.clicks || '0') : 0;
  const purchases = insights ? parseActions(insights.actions, 'purchase') : 0;
  const revenue = insights ? parseActions(insights.action_values, 'purchase') : 0;
  const roas = spend > 0 ? revenue / spend : 0;

  // Dados dos anúncios filhos para spend share, cruzando estrutural + insights agregados
  const adsData = adsInSet.map((ad) => {
    const adIns = adsInsights.find((i) => i.ad_id === ad.id) || null;
    const adSpend = adIns ? parseFloat(adIns.spend || '0') : 0;
    const adPurchases = adIns ? parseActions(adIns.actions, 'purchase') : 0;
    const adRevenue = adIns ? parseActions(adIns.action_values, 'purchase') : 0;
    const adRoas = adSpend > 0 ? adRevenue / adSpend : 0;
    const share = spend > 0 ? (adSpend / spend) * 100 : 0;
    const creative = (ad.creative || {}) as any;

    return {
      id: ad.id,
      name: ad.name,
      thumbnail: creative.thumbnail_url || creative.image_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=100&auto=format&fit=crop&q=80',
      spend: adSpend,
      purchases: adPurchases,
      roas: adRoas,
      share,
    };
  }).sort((a, b) => b.spend - a.spend);

  // Informações de Aprendizado (Learning Phase)
  const learningInfo = adset.learning_stage_info || { status: 'SUFFICIENT', conversions: 50 };
  const learningConversions = learningInfo.conversions || purchases;
  const learningProgress = Math.min(100, (learningConversions / 50) * 100);

  // Tradução do Objetivo
  const getOptimizationGoalLabel = (goal: string) => {
    switch (goal) {
      case 'OFFSITE_CONVERSIONS': return 'Conversões de Site (Venda)';
      case 'LANDING_PAGE_VIEWS': return 'Visualizações de Página';
      case 'LINK_CLICKS': return 'Cliques no Link';
      case 'REACH': return 'Alcance de Pessoas';
      default: return goal;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header do Ad Set */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] bg-evino-cream border border-evino-gray-200 rounded px-1.5 py-0.5 font-mono text-evino-burgundy font-bold">
              CONJUNTO DE ANÚNCIOS
            </span>
            <h1 className="font-display text-2xl font-bold text-evino-ink tracking-tight mt-1.5">
              {adset.name}
            </h1>
            <p className="text-xs text-evino-gray-500 mt-1">
              Campanha-Mãe: <Link href={`/${accountId}/campaign/${adset.campaign_id}`} className="text-evino-red font-semibold hover:underline">{campaign?.name || adset.campaign_id}</Link>
            </p>
          </div>
          <span className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border leading-none self-start md:self-auto',
            adset.status === 'ACTIVE'
              ? 'bg-success/5 text-success border-success/20'
              : 'bg-evino-gray-100 text-evino-gray-500 border-evino-gray-200'
          )}>
            {adset.status === 'ACTIVE' ? 'ATIVO' : 'PAUSADO'}
          </span>
        </div>
      </div>

      {/* Cards Rápidos de Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Investido" value={formatCurrency(spend)} />
        <MetricCard label="Impressões" value={formatNumber(impressions)} />
        <MetricCard label="Compras" value={formatNumber(purchases)} highlight />
        <MetricCard label="ROAS do Ad Set" value={`${roas.toFixed(2)}x`} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bloco Targeting */}
        <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-evino-gray-100 pb-3">
            <Target className="w-5 h-5 text-evino-red" />
            <h3 className="font-display text-lg font-bold text-evino-ink">Configurações de Targeting</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-evino-gray-500 font-semibold block uppercase">Faixa Etária</span>
              <span className="text-sm font-bold text-evino-ink font-mono">
                {adset.targeting?.age_min || 18} - {adset.targeting?.age_max || '65+'} anos
              </span>
            </div>
            <div>
              <span className="text-evino-gray-500 font-semibold block uppercase">Gênero</span>
              <span className="text-sm font-bold text-evino-ink">
                {adset.targeting?.genders?.includes(1) && adset.targeting?.genders?.includes(2) ? 'Ambos' : (adset.targeting?.genders?.includes(1) ? 'Homens' : (adset.targeting?.genders?.includes(2) ? 'Mulheres' : 'Ambos'))}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-evino-gray-500 font-semibold block uppercase">Localizações</span>
              <span className="text-sm font-bold text-evino-ink leading-relaxed">
                {adset.targeting?.geo_locations?.countries?.join(', ') || 'Brasil (Nacional)'}
                {adset.targeting?.geo_locations?.regions && (
                  <span className="block text-xs font-normal text-evino-gray-500 mt-0.5">
                    Regiões: {adset.targeting.geo_locations.regions.map(r => r.name).join(', ')}
                  </span>
                )}
              </span>
            </div>
            
            {adset.targeting?.flexible_spec && adset.targeting.flexible_spec.length > 0 && (
              <div className="col-span-2 border-t border-evino-gray-100 pt-3">
                <span className="text-evino-gray-500 font-semibold block uppercase mb-1.5">Interesses & Comportamentos</span>
                <div className="flex flex-wrap gap-1.5">
                  {adset.targeting.flexible_spec.flatMap(spec => [
                    ...(spec.interests || []),
                    ...(spec.behaviors || []),
                    ...(spec.demographics || [])
                  ]).map((interest: any) => (
                    <span key={interest.id} className="bg-evino-cream text-evino-burgundy border border-evino-gray-200 text-[10px] font-bold px-2 py-0.5 rounded-evino">
                      {interest.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {adset.targeting?.custom_audiences && adset.targeting.custom_audiences.length > 0 && (
              <div className="col-span-2 border-t border-evino-gray-100 pt-3">
                <span className="text-evino-gray-500 font-semibold block uppercase mb-1.5">Público Personalizado (Inclusão)</span>
                <div className="flex flex-wrap gap-1.5">
                  {adset.targeting.custom_audiences.map(aud => (
                    <span key={aud.id} className="bg-blue-50 text-blue-700 border border-blue-150 text-[10px] font-bold px-2 py-0.5 rounded-evino">
                      {aud.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {adset.targeting?.excluded_custom_audiences && adset.targeting.excluded_custom_audiences.length > 0 && (
              <div className="col-span-2 border-t border-evino-gray-100 pt-3">
                <span className="text-evino-gray-500 font-semibold block uppercase mb-1.5">Público Excluído</span>
                <div className="flex flex-wrap gap-1.5">
                  {adset.targeting.excluded_custom_audiences.map(aud => (
                    <span key={aud.id} className="bg-red-50 text-red-700 border border-red-150 text-[10px] font-bold px-2 py-0.5 rounded-evino">
                      {aud.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bloco Otimização & Learning */}
        <div className="space-y-6">
          
          {/* Card Otimização */}
          <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
            <h3 className="font-display text-sm font-bold text-evino-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-evino-gold" /> Otimização e Pacing
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-evino-gray-500 font-semibold block uppercase">Meta de Otimização</span>
                <span className="text-sm font-bold text-evino-ink">{getOptimizationGoalLabel(adset.optimization_goal)}</span>
              </div>
              <div>
                <span className="text-evino-gray-500 font-semibold block uppercase">Evento de Cobrança</span>
                <span className="text-sm font-bold text-evino-ink">{adset.billing_event}</span>
              </div>
              <div>
                <span className="text-evino-gray-500 font-semibold block uppercase">Estratégia de Lance (Bid)</span>
                <span className="text-sm font-bold text-evino-ink">{adset.bid_strategy || 'Menor Custo'}</span>
              </div>
              <div>
                <span className="text-evino-gray-500 font-semibold block uppercase">Orçamento Diário</span>
                <span className="text-sm font-bold text-evino-ink font-mono">
                  {adset.daily_budget ? formatCurrency(parseFloat(adset.daily_budget) / 100) : 'Usando CBO'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Learning Phase */}
          <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
            <h3 className="font-display text-sm font-bold text-evino-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-evino-red" /> Learning Phase Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-evino-gray-600">Status do Aprendizado:</span>
                <span className={clsx(
                  'font-bold px-2 py-0.5 rounded text-[10px] border',
                  learningInfo.status === 'SUFFICIENT' 
                    ? 'bg-success/5 text-success border-success/20' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                )}>
                  {learningInfo.status === 'SUFFICIENT' ? 'SUFICIENTE / ATIVO' : 'EM APRENDIZADO'}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-evino-gray-500">
                  <span>Conclusões do Evento (Compras):</span>
                  <span className="font-mono font-bold text-evino-ink">{learningConversions} / 50</span>
                </div>
                <div className="w-full bg-evino-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-500', learningInfo.status === 'SUFFICIENT' ? 'bg-success' : 'bg-evino-red')}
                    style={{ width: `${learningProgress}%` }}
                  />
                </div>
              </div>
              
              <div className="text-[10px] text-evino-gray-400 flex items-start gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-evino-gray-400 mt-0.5" />
                <span>O pixel precisa registrar 50 conversões em até 7 dias para concluir a fase de aprendizado e estabilizar o CPA.</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Tabela de Ads (Criativos) dentro do Ad Set */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="font-display text-lg font-bold text-evino-ink">Criativos neste Conjunto</h3>
          <p className="text-xs text-evino-gray-500">Rateio do investimento (Spend Share) e ROAS individual por criativo</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase">
                <th className="p-3 rounded-l-evino">Criativo</th>
                <th className="p-3 text-right">Investimento</th>
                <th className="p-3 text-right">Spend Share</th>
                <th className="p-3 text-right">Compras</th>
                <th className="p-3 text-right rounded-r-evino">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-evino-gray-100">
              {adsData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-evino-gray-400">Nenhum criativo vinculado sob este conjunto.</td>
                </tr>
              ) : (
                adsData.map(ad => (
                  <tr key={ad.id} className="hover:bg-evino-gray-50 transition-colors">
                    <td className="p-3 flex items-center gap-3">
                      <img
                        src={ad.thumbnail}
                        alt={ad.name}
                        className="w-10 h-10 object-cover rounded-evino border border-evino-gray-200 shrink-0"
                      />
                      <div>
                        <Link
                          href={`/${accountId}/ad/${ad.id}`}
                          className="font-medium text-evino-ink hover:text-evino-red hover:underline block truncate max-w-xs"
                        >
                          {ad.name}
                        </Link>
                        <span className="text-[10px] text-evino-gray-400 font-mono">{ad.id}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink">{formatCurrency(ad.spend)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-xs tabular-nums text-evino-gray-600">{ad.share.toFixed(1)}%</span>
                        <div className="w-16 bg-evino-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-evino-red rounded-full" style={{ width: `${ad.share}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-600">{formatNumber(ad.purchases)}</td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-evino-ink">{ad.roas.toFixed(2)}x</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
