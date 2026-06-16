// Campos para Ad Accounts
export const ACCOUNT_FIELDS = [
  'id',
  'name',
  'account_status',
  'currency',
  'timezone_name',
  'amount_spent',
  'balance'
].join(',');

// Campos para Campanhas
export const CAMPAIGN_FIELDS = [
  'id',
  'name',
  'status',
  'effective_status',
  'objective',
  'buying_type',
  'daily_budget',
  'lifetime_budget',
  'budget_remaining',
  'bid_strategy',
  'special_ad_categories',
  'created_time',
  'updated_time',
  'start_time',
  'stop_time'
].join(',');

// Campos para Ad Sets
export const ADSET_FIELDS = [
  'id',
  'name',
  'status',
  'effective_status',
  'campaign_id',
  'optimization_goal',
  'billing_event',
  'bid_strategy',
  'bid_amount',
  'daily_budget',
  'lifetime_budget',
  'targeting',
  'promoted_object',
  'start_time',
  'end_time',
  'learning_stage_info'
].join(',');

// Campos para Ads e seus Creatives associados
export const AD_FIELDS = [
  'id',
  'name',
  'status',
  'effective_status',
  'adset_id',
  'campaign_id',
  'created_time',
  'updated_time',
  'creative{id,name,title,body,object_type,call_to_action_type,image_url,thumbnail_url,video_id,instagram_permalink_url,effective_object_story_id,link_url}'
].join(',');

// Campos para Insights (Performance)
export const INSIGHT_FIELDS = [
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'date_start',
  'date_stop',
  'impressions',
  'reach',
  'frequency',
  'spend',
  'cpm',
  'cpp',
  'clicks',
  'ctr',
  'cpc',
  'actions',
  'action_values',
  'purchase_roas',
  'website_purchase_roas',
  'video_play_actions',
  'video_thruplay_watched_actions',
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p95_watched_actions',
  'video_p100_watched_actions',
  'video_avg_time_watched_actions',
  'cost_per_thruplay',
  'quality_ranking',
  'engagement_rate_ranking',
  'conversion_rate_ranking'
].join(',');
