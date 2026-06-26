export interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  amount_spent: string;
  balance: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective: string;
  buying_type: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  bid_strategy?: string;
  special_ad_categories?: string[];
  created_time: string;
  updated_time: string;
  start_time?: string;
  stop_time?: string;
}

export interface AdSet {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  campaign_id: string;
  optimization_goal: string;
  billing_event: string;
  bid_strategy?: string;
  bid_amount?: number;
  daily_budget?: string;
  lifetime_budget?: string;
  targeting: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
      regions?: Array<{ key: string; name: string }>;
      cities?: Array<{ key: string; name: string; radius?: number; distance_unit?: string }>;
    };
    languages?: string[];
    flexible_spec?: Array<{
      interests?: Array<{ id: string; name: string }>;
      behaviors?: Array<{ id: string; name: string }>;
      demographics?: Array<{ id: string; name: string }>;
    }>;
    custom_audiences?: Array<{ id: string; name: string }>;
    excluded_custom_audiences?: Array<{ id: string; name: string }>;
  };
  promoted_object?: {
    pixel_id?: string;
    custom_event_type?: string;
  };
  start_time: string;
  end_time?: string;
  learning_stage_info?: {
    status: string;
    conversions?: number;
  };
}

export interface CreativeAsset {
  id: string;
  name: string;
  title?: string;
  body?: string;
  object_type: string;
  call_to_action_type?: string;
  image_url?: string;
  thumbnail_url?: string;
  video_id?: string;
  source_url?: string; // para video player
  instagram_permalink_url?: string;
  link_url?: string;
  // Estruturas adicionais para Carousel
  carousel_cards?: Array<{
    id: string;
    image_url: string;
    title: string;
    description?: string;
    link_url: string;
  }>;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  adset_id: string;
  campaign_id: string;
  created_time: string;
  updated_time: string;
  creative: CreativeAsset;
}

export interface ActionValue {
  action_type: string;
  value: string;
}

export interface Action {
  action_type: string;
  value: string;
}

export interface Insight {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start: string;
  date_stop: string;
  
  impressions: string;
  reach: string;
  frequency: string;
  spend: string;
  cpm: string;
  cpp: string;
  
  clicks: string;
  unique_clicks?: string;
  inline_link_clicks?: string;
  outbound_clicks?: Action[];
  ctr: string;
  unique_ctr?: string;
  cpc: string;
  cost_per_unique_click?: string;
  
  actions?: Action[];
  action_values?: ActionValue[];
  purchase_roas?: Action[];
  website_purchase_roas?: Action[];
  
  video_play_actions?: Action[];
  video_thruplay_watched_actions?: Action[];
  video_p25_watched_actions?: Action[];
  video_p50_watched_actions?: Action[];
  video_p75_watched_actions?: Action[];
  video_p95_watched_actions?: Action[];
  video_p100_watched_actions?: Action[];
  video_avg_time_watched_actions?: Action[];
  cost_per_thruplay?: Action[];
  
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
  
  // Para breakdowns
  age?: string;
  gender?: string;
  country?: string;
  region?: string;
  publisher_platform?: string;
  platform_position?: string;
  impression_device?: string;
  device_platform?: string;
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
}
