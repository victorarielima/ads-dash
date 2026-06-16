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
