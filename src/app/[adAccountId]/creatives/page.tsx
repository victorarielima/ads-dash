import React, { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import { getInsights } from '@/lib/meta/insights';
import { getCampaigns, getAdSets, getAds, getAdSetsByCampaign, getAdDetail, getAdsByCampaign, getAdsByAdSet } from '@/lib/meta/creative';
import { listAdAccounts } from '@/lib/meta/accounts';
import { CreativesTable } from '@/components/tables/CreativesTable';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { parseActions } from '@/lib/meta/actionTypes';
import { HierarchyFilters } from '@/components/HierarchyFilters';
import { CreativeRangeSelector } from '@/components/creative/CreativeRangeSelector';
import { spDateStr } from '@/lib/utils/date';

interface CreativesPageProps {
  params: Promise<{
    adAccountId: string;
  }>;
  searchParams: Promise<{
    since?: string;
    until?: string;
    campaign_id?: string;
    adset_id?: string;
    creative_range?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function CreativesPage({ params, searchParams }: CreativesPageProps) {
  const { adAccountId } = await params;
  
  if (!adAccountId.startsWith('act_')) {
    return null;
  }
  
  const { since, until, campaign_id, adset_id, creative_range } = await searchParams;

  // 1. Datas padrão para o painel: dia de hoje (fuso de São Paulo).
  const defaultUntil = spDateStr();
  const defaultSince = spDateStr();

  const currentSince = since || defaultSince;
  const currentUntil = until || defaultUntil;

  // 2. Calcula período local do prazo de criativos
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

  // 3. Resolução de Entidade Ativa
  let activeEntityId = adAccountId;
  let activeLevel: 'account' | 'campaign' | 'adset' = 'account';

  if (adset_id) {
    activeEntityId = adset_id;
    activeLevel = 'adset';
  } else if (campaign_id) {
    activeEntityId = campaign_id;
    activeLevel = 'campaign';
  }

  // 4. Busca dados estruturais das campanhas, adsets e contas
  const [campaignsList, adSetsForCampaign, accounts] = await Promise.all([
    getCampaigns(adAccountId),
    campaign_id ? getAdSetsByCampaign(campaign_id, adAccountId) : Promise.resolve([]),
    listAdAccounts(),
  ]);

  // Identifica se a marca ativa é Grand Cru para estilização consistente do convite
  const activeAccount = accounts.find((a) => a.id === adAccountId);
  const accountName = activeAccount?.name?.toLowerCase() || '';
  const isGrandCru = accountName.includes('grand') || accountName.includes('cru');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-evino-ink tracking-tight">Tabela de Criativos</h1>
          <p className="text-sm text-evino-gray-500 mt-1">Análise detalhada de performance e fadiga de todos os criativos veiculados</p>
        </div>
        {/* Dropdown local de prazo de criativos (só exibe se houver campanha selecionada) */}
        {campaign_id && <CreativeRangeSelector />}
      </div>

      {/* Filtros Hierárquicos */}
      <HierarchyFilters
        campaigns={campaignsList}
        adSets={adSetsForCampaign}
        selectedCampaignId={campaign_id}
        selectedAdSetId={adset_id}
      />

      {!campaign_id ? (
        // TELA DE BOAS-VINDAS / CONVITE SELECIONE UMA CAMPANHA
        <div className="bg-white border border-evino-gray-200 rounded-evino p-8 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto my-12">
          <div className={`w-16 h-16 rounded-full ${isGrandCru ? 'bg-[#C8A95C]/10' : 'bg-evino-red/10'} flex items-center justify-center mb-5`}>
            <Layers className={`w-8 h-8 ${isGrandCru ? 'text-[#C8A95C]' : 'text-evino-red'}`} />
          </div>
          <h2 className="font-display text-2xl font-bold text-evino-ink">Selecione uma Campanha</h2>
          <p className="text-sm text-evino-gray-500 mt-2 max-w-md">
            Para visualizar a listagem densa de criativos, performance detalhada e análise de fadiga, selecione uma das campanhas no menu de fluxo acima.
          </p>

          {campaignsList.length > 0 && (
            <div className="mt-8 w-full border-t border-evino-gray-150 pt-6 text-left">
              <p className="text-xs font-bold text-evino-gray-400 uppercase tracking-wider mb-3">Atalhos rápidos para as campanhas:</p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {campaignsList.map((camp) => (
                  <Link
                    key={camp.id}
                    href={`/${adAccountId}/creatives?campaign_id=${camp.id}`}
                    className="flex items-center justify-between p-3 rounded-evino border border-evino-gray-150 bg-evino-cream/20 hover:bg-evino-cream/50 transition-all group"
                  >
                    <div className="truncate max-w-[85%]">
                      <span className={`font-semibold text-sm text-evino-ink block truncate transition-all ${isGrandCru ? 'group-hover:text-[#C8A95C]' : 'group-hover:text-evino-red'}`}>
                        {camp.name}
                      </span>
                      <span className="text-[10px] text-evino-gray-400 font-mono">{camp.id}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-evino-gray-400 transition-all transform group-hover:translate-x-1 ${isGrandCru ? 'group-hover:text-[#C8A95C]' : 'group-hover:text-evino-red'}`} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Suspense fallback={<TableSkeleton />}>
          <CreativesLoader
            accountId={adAccountId}
            entityId={activeEntityId}
            level={activeLevel}
            timeRange={{ since: creativeSince, until: creativeUntil }}
          />
        </Suspense>
      )}
    </div>
  );
}

async function CreativesLoader({
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
  // Puxa toda a estrutura e insights de forma cirúrgica com base na ramificação selecionada.
  // Se for campanha ou adset ativo, puxamos todos os anúncios estruturais desse escopo da Meta (sem limites baixos!).
  const [campaignsList, adSetsList, adsList, adInsights] = await Promise.all([
    getCampaigns(accountId),
    level === 'campaign' ? getAdSetsByCampaign(entityId, accountId) : getAdSets(accountId),
    level === 'campaign'
      ? getAdsByCampaign(entityId, accountId)
      : (level === 'adset' ? getAdsByAdSet(entityId, accountId) : getAds(accountId)),
    getInsights(entityId, { level: 'ad', timeRange }).catch(() => []),
  ]);

  // Monta as linhas da tabela iterando sobre a lista ESTRUTURAL de anúncios do escopo (garante 100% de exibição!)
  const tableRows = adsList.map((ad: any) => {
    // Busca o insight correspondente para esse anúncio se houver spend no período
    const ins = adInsights.find((i) => i.ad_id === ad.id) || null;
    const creative = (ad.creative || {}) as any;
    
    // Detalhes da campanha e adset associados
    const camp = campaignsList.find((c) => c.id === ad.campaign_id) as any || {};
    const adset = adSetsList.find((s) => s.id === ad.adset_id) as any || {};

    const spend = ins ? parseFloat(ins.spend || '0') : 0;
    const impressions = ins ? parseFloat(ins.impressions || '0') : 0;
    const clicks = ins ? parseFloat(ins.clicks || '0') : 0;
    const purchases = ins ? parseActions(ins.actions, 'purchase') : 0;
    const revenue = ins ? parseActions(ins.action_values, 'purchase') : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const frequency = ins ? parseFloat(ins.frequency || '1') : 1;

    const format = creative.object_type || 'IMAGE';

    let fatigueStatus = 'Saudável';
    let fatigueColor = 'bg-success/5 text-success border-success/20';

    if (frequency >= 3.5 && ctr < 1.5) {
      fatigueStatus = 'Fatigado';
      fatigueColor = 'bg-danger/5 text-danger border-danger/20';
    } else if (frequency >= 2.5 && ctr < 2.0) {
      fatigueStatus = 'Atenção';
      fatigueColor = 'bg-amber-50 text-amber-700 border-amber-200';
    }

    // Status de Veiculação Real baseada em effective_status de forma cirúrgica
    const effectiveStatus = ad.effective_status || ad.status || 'PAUSED';
    const isAdActive = effectiveStatus === 'ACTIVE';

    return {
      id: ad.id || '',
      name: ad.name || 'Criativo Desconhecido',
      status: isAdActive ? 'ACTIVE' : 'PAUSED',
      campaignId: ad.campaign_id || '',
      campaignName: camp.name || 'Campanha Desconhecida',
      adsetName: adset.name || 'Adset Desconhecido',
      format,
      thumbnail: creative.thumbnail_url || creative.image_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=150&auto=format&fit=crop&q=80',
      spend,
      impressions,
      clicks,
      ctr,
      cpc,
      cpm,
      purchases,
      revenue,
      roas,
      frequency,
      createdTime: ad.created_time || '',
      creative: {
        id: creative.id || '',
        name: creative.name || '',
        title: creative.title || '',
        body: creative.body || '',
        object_type: creative.object_type || 'IMAGE',
        call_to_action_type: creative.call_to_action_type || 'SHOP_NOW',
        image_url: creative.image_url || '',
        thumbnail_url: creative.thumbnail_url || '',
        video_id: creative.video_id || '',
        source_url: creative.source_url || '',
        instagram_permalink_url: creative.instagram_permalink_url || '',
        link_url: creative.link_url || '',
        carousel_cards: creative.carousel_cards || []
      },
      fatigueStatus,
      fatigueColor,
    };
  });

  // Ordenação decrescente: Criativos mais recentes primeiro
  const sortedTableRows = [...tableRows].sort((a, b) => {
    if (!a.createdTime) return 1;
    if (!b.createdTime) return -1;
    return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
  });

  return <CreativesTable accountId={accountId} data={sortedTableRows} />;
}
