import { supabase } from './server';

export interface ReportMetrics {
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  revenue: number;
  roas: number;
  cpa: number;
}

export interface ReportData {
  accountId: string;
  entityId: string;
  entityType: 'account' | 'campaign' | 'adset';
  dateSince: string;
  dateUntil: string;
  metrics: ReportMetrics;
}

export async function saveReport(data: ReportData): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('ad_reports')
      .upsert(
        {
          account_id: data.accountId,
          entity_id: data.entityId,
          entity_type: data.entityType,
          date_since: data.dateSince,
          date_until: data.dateUntil,
          metrics: data.metrics,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id,entity_id,date_since,date_until' }
      );

    if (error) {
      console.error('[Supabase Report Save Error]:', error);
    }
  } catch (e) {
    console.error('[Supabase Report Exception]:', e);
  }
}

export async function getReportUpdatedAt(
  accountId: string,
  entityId: string,
  dateSince: string,
  dateUntil: string
): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('ad_reports')
      .select('updated_at')
      .eq('account_id', accountId)
      .eq('entity_id', entityId)
      .eq('date_since', dateSince)
      .eq('date_until', dateUntil)
      .maybeSingle();

    if (error || !data) return null;

    return data.updated_at as string;
  } catch {
    return null;
  }
}
