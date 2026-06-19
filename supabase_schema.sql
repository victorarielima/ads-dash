-- Executar este script no SQL Editor do Supabase

-- 1. Tabela para Armazenamento de Cache da Meta API
create table if not exists public.meta_cache (
  cache_key text primary key,
  account_id text not null,
  endpoint text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Índices para melhorar a performance de consultas e limpeza de cache
create index if not exists idx_cache_account_expires on public.meta_cache(account_id, expires_at);
create index if not exists idx_cache_expires on public.meta_cache(expires_at);

-- 2. Tabela de Observabilidade e Telemetria de Chamadas de API
create table if not exists public.meta_api_calls (
  id bigserial primary key,
  endpoint text not null,
  account_id text not null,
  cache_hit boolean not null,
  status_code int not null,
  duration_ms int not null,
  called_at timestamptz default now()
);

-- Habilitar RLS (Row Level Security) se desejar, mas como as chamadas usam
-- service_role_key no servidor, o acesso direto de clients públicos já é bloqueado por padrão.

-- 3. Tabela de Relatórios Persistidos (snapshots de métricas computadas)
create table if not exists public.ad_reports (
  id bigserial primary key,
  account_id text not null,
  entity_id text not null,
  entity_type text not null,       -- 'account', 'campaign' ou 'adset'
  date_since text not null,
  date_until text not null,
  metrics jsonb not null,          -- métricas computadas (spend, roas, ctr, etc.)
  updated_at timestamptz not null default now()
);

-- Índice único para upsert eficiente por entidade e período
create unique index if not exists idx_reports_entity_date
  on public.ad_reports(account_id, entity_id, date_since, date_until);

-- Índice para consulta por conta ordenada por data de atualização
create index if not exists idx_reports_account_updated
  on public.ad_reports(account_id, updated_at desc);
