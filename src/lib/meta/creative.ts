import { requestMeta } from './client';
import { Campaign, AdSet, Ad } from './types';
import { CAMPAIGN_FIELDS, ADSET_FIELDS, AD_FIELDS } from './fields';

export async function getCampaigns(accountId: string, options: { skipCache?: boolean } = {}): Promise<Campaign[]> {
  try {
    const response = await requestMeta<any>(accountId, `${accountId}/campaigns`, {
      params: { fields: CAMPAIGN_FIELDS, limit: 25 },
      ttlSeconds: 900,
      skipCache: options.skipCache
    });
    return response.data || [];
  } catch (error) {
    console.error(`Erro ao obter campanhas para ${accountId}:`, error);
    return [];
  }
}

export async function getAdSets(accountId: string, options: { skipCache?: boolean } = {}): Promise<AdSet[]> {
  try {
    const response = await requestMeta<any>(accountId, `${accountId}/adsets`, {
      params: { fields: ADSET_FIELDS, limit: 50 },
      ttlSeconds: 900,
      skipCache: options.skipCache
    });
    return response.data || [];
  } catch (error) {
    console.error(`Erro ao obter adsets para ${accountId}:`, error);
    return [];
  }
}

export async function getAds(accountId: string, options: { skipCache?: boolean } = {}): Promise<Ad[]> {
  try {
    const response = await requestMeta<any>(accountId, `${accountId}/ads`, {
      params: { fields: AD_FIELDS, limit: 150, sort: 'created_time_desc' },
      ttlSeconds: 900,
      skipCache: options.skipCache
    });
    return response.data || [];
  } catch (error) {
    console.error(`Erro ao obter ads para ${accountId}:`, error);
    return [];
  }
}

export async function getCampaignDetail(campaignId: string, accountId: string, options: { skipCache?: boolean } = {}): Promise<Campaign | null> {
  try {
    return await requestMeta<Campaign>(accountId, campaignId, {
      params: { fields: CAMPAIGN_FIELDS },
      ttlSeconds: 1800, // 30 min para detalhes estáticos
      skipCache: options.skipCache
    });
  } catch (error) {
    console.error(`Erro ao obter detalhes da campanha ${campaignId}:`, error);
    return null;
  }
}

export async function getAdSetDetail(adsetId: string, accountId: string, options: { skipCache?: boolean } = {}): Promise<AdSet | null> {
  try {
    return await requestMeta<AdSet>(accountId, adsetId, {
      params: { fields: ADSET_FIELDS },
      ttlSeconds: 1800,
      skipCache: options.skipCache
    });
  } catch (error) {
    console.error(`Erro ao obter detalhes do adset ${adsetId}:`, error);
    return null;
  }
}

export async function getAdDetail(adId: string, accountId: string, options: { skipCache?: boolean } = {}): Promise<Ad | null> {
  try {
    return await requestMeta<Ad>(accountId, adId, {
      params: { fields: AD_FIELDS },
      ttlSeconds: 1800,
      skipCache: options.skipCache
    });
  } catch (error) {
    console.error(`Erro ao obter detalhes do ad ${adId}:`, error);
    return null;
  }
}

export async function getAdSetsByCampaign(campaignId: string, accountId: string, options: { skipCache?: boolean } = {}): Promise<AdSet[]> {
  try {
    const response = await requestMeta<any>(accountId, `${campaignId}/adsets`, {
      params: { fields: ADSET_FIELDS, limit: 50 },
      ttlSeconds: 900,
      skipCache: options.skipCache
    });
    return response.data || [];
  } catch (error) {
    console.error(`Erro ao obter adsets da campanha ${campaignId}:`, error);
    return [];
  }
}

export async function getAdsByAdSet(adsetId: string, accountId: string, options: { skipCache?: boolean } = {}): Promise<Ad[]> {
  try {
    const response = await requestMeta<any>(accountId, `${adsetId}/ads`, {
      params: { fields: AD_FIELDS, limit: 100 },
      ttlSeconds: 900,
      skipCache: options.skipCache
    });
    return response.data || [];
  } catch (error) {
    console.error(`Erro ao obter ads do adset ${adsetId}:`, error);
    return [];
  }
}

export async function getAdsByCampaign(campaignId: string, accountId: string, options: { skipCache?: boolean } = {}): Promise<Ad[]> {
  try {
    const response = await requestMeta<any>(accountId, `${campaignId}/ads`, {
      params: { fields: AD_FIELDS, limit: 100 },
      ttlSeconds: 900,
      skipCache: options.skipCache
    });
    return response.data || [];
  } catch (error) {
    console.error(`Erro ao obter ads da campanha ${campaignId}:`, error);
    return [];
  }
}


