import { requestMeta } from './client';
import { Insight } from './types';
import { INSIGHT_FIELDS } from './fields';

interface InsightParams {
  level: 'account' | 'campaign' | 'adset' | 'ad';
  datePreset?: string;
  timeRange?: { since: string; until: string };
  timeIncrement?: number | string; // '1' para diário, ou não passar para acumulado
  breakdowns?: string;
  actionAttributionWindows?: string[];
}

export async function getInsights(
  entityId: string, // act_id, cmp_id, set_id, ou ad_id
  params: InsightParams,
  options: { skipCache?: boolean; ttlSeconds?: number } = {}
): Promise<Insight[]> {
  const metaParams: Record<string, any> = {
    fields: INSIGHT_FIELDS,
    level: params.level,
    use_unified_attribution_setting: true,
  };

  // Trata período de data
  if (params.timeRange) {
    metaParams['time_range'] = {
      since: params.timeRange.since,
      until: params.timeRange.until,
    };
  } else if (params.datePreset) {
    metaParams['date_preset'] = params.datePreset;
  } else {
    metaParams['date_preset'] = 'last_30d';
  }

  // Trata granularidade de tempo (ex: por dia)
  if (params.timeIncrement) {
    metaParams['time_increment'] = params.timeIncrement;
  }

  // Trata breakdowns
  if (params.breakdowns) {
    metaParams['breakdowns'] = params.breakdowns;
  }

  if (params.actionAttributionWindows) {
    metaParams['action_attribution_windows'] = params.actionAttributionWindows;
  }

  // O endpoint de insights na Meta Graph API é sempre /{entity_id}/insights
  const endpoint = `${entityId}/insights`;
  
  // O id da conta é necessário para o controle de cache / rate limit
  const accountId = entityId.startsWith('act_') ? entityId : 'account_generic';

  try {
    const response = await requestMeta<any>(accountId, endpoint, {
      params: metaParams,
      ttlSeconds: options.ttlSeconds || 900, // 15 minutos
      skipCache: options.skipCache,
    });

    if (response && response.data) {
      return response.data as Insight[];
    }

    return (response || []) as Insight[];
  } catch (error) {
    console.error(`Erro ao buscar insights para a entidade ${entityId}:`, error);
    throw error;
  }
}

export async function getInsightsWithBreakdowns(
  entityId: string,
  breakdownType: 'demographics' | 'placement' | 'device' | 'region' | 'hourly',
  dateParams: { datePreset?: string; timeRange?: { since: string; until: string } },
  level: 'account' | 'campaign' | 'adset' | 'ad' = 'ad',
  options: { skipCache?: boolean } = {}
): Promise<Insight[]> {
  let breakdowns = '';
  
  switch (breakdownType) {
    case 'demographics':
      breakdowns = 'age,gender';
      break;
    case 'placement':
      breakdowns = 'publisher_platform,platform_position';
      break;
    case 'device':
      breakdowns = 'device_platform,impression_device';
      break;
    case 'region':
      breakdowns = 'region';
      break;
    case 'hourly':
      breakdowns = 'hourly_stats_aggregated_by_advertiser_time_zone';
      break;
  }

  return getInsights(
    entityId,
    {
      level,
      breakdowns,
      ...dateParams,
    },
    options
  );
}
