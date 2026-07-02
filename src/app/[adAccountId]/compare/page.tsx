import React, { Suspense } from 'react';
import { getAds } from '@/lib/meta/creative';
import { getInsights } from '@/lib/meta/insights';
import { CompareComponent } from '@/components/CompareComponent';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { parseActions } from '@/lib/meta/actionTypes';
import { spDateStr } from '@/lib/utils/date';

interface ComparePageProps {
  params: Promise<{
    adAccountId: string;
  }>;
  searchParams: Promise<{
    since?: string;
    until?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function ComparePage({ params, searchParams }: ComparePageProps) {
  const { adAccountId } = await params;
  
  if (!adAccountId.startsWith('act_')) {
    return null;
  }
  
  const { since, until } = await searchParams;

  // Datas padrão: dia de hoje (fuso de São Paulo, igual ao painel principal).
  const defaultUntil = spDateStr();
  const defaultSince = spDateStr();

  const currentSince = since || defaultSince;
  const currentUntil = until || defaultUntil;
  const range = { since: currentSince, until: currentUntil };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-evino-ink tracking-tight">Comparador de Performance</h1>
        <p className="text-sm text-evino-gray-500 mt-1">
          Selecione múltiplos criativos de vinho para analisar métricas sobrepostas e identificar os melhores desempenhos
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CompareLoader
          accountId={adAccountId}
          timeRange={range}
        />
      </Suspense>
    </div>
  );
}

async function CompareLoader({
  accountId,
  timeRange,
}: {
  accountId: string;
  timeRange: { since: string; until: string };
}) {
  // Puxa anúncios da conta
  const ads = await getAds(accountId);

  if (ads.length === 0) {
    return (
      <div className="bg-white border border-evino-gray-200 rounded-evino p-6 text-center">
        <p className="text-evino-gray-500 font-semibold">Nenhum anúncio localizado na conta para comparação.</p>
      </div>
    );
  }

  // Puxa insights acumulados de todos os anúncios em paralelo
  // Para evitar sobrecarregar rate limits, limitamos aos primeiros 20 criativos ativos ou disponíveis
  const adsToCompare = ads.slice(0, 20);

  const accumulatedPromises = adsToCompare.map(ad => getInsights(ad.id, { level: 'ad', timeRange }));
  const dailyPromises = adsToCompare.map(ad => getInsights(ad.id, { level: 'ad', timeRange, timeIncrement: 1 }));

  const [accumulatedResults, dailyResults] = await Promise.all([
    Promise.all(accumulatedPromises),
    Promise.all(dailyPromises),
  ]);

  const comparisonData = adsToCompare.map((ad, idx) => {
    const acc = accumulatedResults[idx]?.[0] || null;
    const daily = dailyResults[idx] || [];

    const spend = acc ? parseFloat(acc.spend || '0') : 0;
    const impressions = acc ? parseFloat(acc.impressions || '0') : 0;
    const clicks = acc ? parseFloat(acc.clicks || '0') : 0;
    const purchases = acc ? parseActions(acc.actions, 'purchase') : 0;
    const revenue = acc ? parseActions(acc.action_values, 'purchase') : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;

    const dailyInsights = daily.map(d => ({
      date: d.date_start,
      spend: parseFloat(d.spend || '0'),
      revenue: parseActions(d.action_values, 'purchase'),
      roas: parseFloat(d.spend || '0') > 0 ? parseActions(d.action_values, 'purchase') / parseFloat(d.spend || '0') : 0,
    }));

    return {
      id: ad.id,
      name: ad.name,
      thumbnail: ad.creative?.thumbnail_url || ad.creative?.image_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=100&auto=format&fit=crop&q=80',
      spend,
      impressions,
      clicks,
      purchases,
      revenue,
      roas,
      ctr,
      cpa,
      creative: {
        id: ad.creative?.id || '',
        name: ad.creative?.name || '',
        title: ad.creative?.title || '',
        body: ad.creative?.body || '',
        object_type: ad.creative?.object_type || 'IMAGE',
        call_to_action_type: ad.creative?.call_to_action_type || 'SHOP_NOW',
        image_url: ad.creative?.image_url || '',
        thumbnail_url: ad.creative?.thumbnail_url || '',
        video_id: ad.creative?.video_id || '',
        source_url: ad.creative?.source_url || '',
        instagram_permalink_url: ad.creative?.instagram_permalink_url || '',
        link_url: ad.creative?.link_url || '',
        carousel_cards: ad.creative?.carousel_cards || []
      },
      dailyInsights,
    };
  }).filter(ad => ad.spend > 0); // Mostra apenas os que de fato gastaram algum valor no período para comparar de forma real

  // Caso todos tenham spend 0 no período selecionado, mostra os primeiros anúncios sem filtro de spend
  const finalData = comparisonData.length > 0 
    ? comparisonData 
    : adsToCompare.map((ad, idx) => {
        const acc = accumulatedResults[idx]?.[0] || null;
        const daily = dailyResults[idx] || [];

        const spend = acc ? parseFloat(acc.spend || '0') : 0;
        const impressions = acc ? parseFloat(acc.impressions || '0') : 0;
        const clicks = acc ? parseFloat(acc.clicks || '0') : 0;
        const purchases = acc ? parseActions(acc.actions, 'purchase') : 0;
        const revenue = acc ? parseActions(acc.action_values, 'purchase') : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpa = purchases > 0 ? spend / purchases : 0;

        const dailyInsights = daily.map(d => ({
          date: d.date_start,
          spend: parseFloat(d.spend || '0'),
          revenue: parseActions(d.action_values, 'purchase'),
          roas: parseFloat(d.spend || '0') > 0 ? parseActions(d.action_values, 'purchase') / parseFloat(d.spend || '0') : 0,
        }));

        return {
          id: ad.id,
          name: ad.name,
          thumbnail: ad.creative?.thumbnail_url || ad.creative?.image_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=100&auto=format&fit=crop&q=80',
          spend,
          impressions,
          clicks,
          purchases,
          revenue,
          roas,
          ctr,
          cpa,
          creative: {
            id: ad.creative?.id || '',
            name: ad.creative?.name || '',
            title: ad.creative?.title || '',
            body: ad.creative?.body || '',
            object_type: ad.creative?.object_type || 'IMAGE',
            call_to_action_type: ad.creative?.call_to_action_type || 'SHOP_NOW',
            image_url: ad.creative?.image_url || '',
            thumbnail_url: ad.creative?.thumbnail_url || '',
            video_id: ad.creative?.video_id || '',
            source_url: ad.creative?.source_url || '',
            instagram_permalink_url: ad.creative?.instagram_permalink_url || '',
            link_url: ad.creative?.link_url || '',
            carousel_cards: ad.creative?.carousel_cards || []
          },
          dailyInsights,
        };
      });

  return <CompareComponent adsList={finalData} />;
}
