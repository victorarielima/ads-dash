import { queryRedshift } from './client';
import { spDateStr } from '../utils/date';

// Períodos passados não mudam → cache padrão (30 min). Mas um range que inclui
// HOJE ainda está recebendo pedidos, então o cache deixaria o valor defasado
// (visto no painel "Hoje", ~R$200 abaixo do Looker ao vivo). Para esses casos
// usamos um TTL curto, deixando o número praticamente em tempo real.
const LIVE_TTL_SECONDS = 60;
function cacheOpts(until: string) {
  return until >= spDateStr() ? { ttlSeconds: LIVE_TTL_SECONDS } : {};
}

// Medidas de receita/CM2 com SUM simples — replicam EXATAMENTE o relatório
// manual (Looker), que não usa agregação simétrica. Obs.: se o LEFT JOIN com
// ev_last_click_full gerar mais de uma linha por pedido, a receita dessas linhas
// é contada repetida — comportamento idêntico ao Looker (que assume o join 1:1).
const REVENUE_SUM = `COALESCE(SUM(f.price_to_pay), 0) + COALESCE(SUM(f.item_shipping_amount), 0)`;
const CM2_SUM = `COALESCE(SUM(f.cm2_realized), 0)`;

// Filtros de qualidade do pedido (valem para QUALQUER canal — mesmos do Looker).
const BASE_WHERE = `
  f.is_paid = 1
  AND COALESCE(UPPER(f.voucher_code), '') NOT ILIKE 'TV%'
  AND COALESCE(f.payment_method, '') <> 'sac'
  AND f.order_increment_id NOT LIKE 'BRI%'
  AND CASE WHEN COALESCE(f.marketplace_provider, '') = 'vivino' THEN 1 ELSE 0 END = 0
`;

// Condição que classifica o pedido como canal Facebook (padrão Looker).
const FACEBOOK_CHANNEL = `
  (CASE WHEN lc.utm_medium = 'Ads' AND lc.utm_campaign = 'ADVANTAGEROAS.PURCHASE'
        THEN 'Facebook' ELSE lc.channel END) = 'Facebook'
`;

// Filtro padrão para pedidos Facebook reais (canal Facebook + qualidade).
const FACEBOOK_WHERE = `${FACEBOOK_CHANNEL} AND ${BASE_WHERE}`;

// Filtro opcional por segmento, pelo nome do conjunto de anúncios (utm_campaign):
// 'ecom' → nomes com "Ecomm"; 'clube' → nomes com "Clube". Os padrões são fixos
// (não interpolam entrada do usuário), então é seguro concatenar na SQL.
function segmentWhere(segment?: string): string {
  const seg = (segment || '').toLowerCase();
  if (seg === 'ecom') return ` AND lc.utm_campaign ILIKE '%ecom%'`;
  if (seg === 'clube') return ` AND lc.utm_campaign ILIKE '%clube%'`;
  return '';
}

// `created_at_datetime` já está no horário local (mesma referência do relatório
// manual), então usamos a data como está — sem CONVERT_TIMEZONE. Converter para
// outro fuso deslocaria os pedidos das bordas do dia e divergiria do manual.
const ORDER_DATE = `DATE(f.created_at_datetime::timestamp)`;

export interface RedshiftCampaignRow {
  utm_campaign: string;
  total_revenue: number;
  total_orders: number;
  total_activations: number; // primeiras compras (is_first_order = 1)
  total_cm2: number;
}

export interface RedshiftCreativeRow {
  utm_content: string;
  utm_campaign: string;
  total_revenue: number;
  total_orders: number;
  total_cm2: number;
}

// Receita real + pedidos agrupados por campanha (utm_campaign)
export async function getOrdersByCampaign(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftCampaignRow[]> {
  const sql = `
    SELECT
      COALESCE(lc.utm_campaign, '(sem utm_campaign)') AS utm_campaign,
      ${REVENUE_SUM} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders,
      COUNT(DISTINCT CASE WHEN f.is_first_order = 1 THEN f.order_increment_id END) AS total_activations,
      ${CM2_SUM} AS total_cm2
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}${segmentWhere(segment)}
    GROUP BY 1
    ORDER BY total_revenue DESC
  `;

  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    utm_campaign: r.utm_campaign,
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
    total_activations: parseInt(r.total_activations) || 0,
    total_cm2: parseFloat(r.total_cm2) || 0,
  }));
}

// ── Grand Cru ────────────────────────────────────────────────────────────────

// Expression que classifica o plano pela SKU (padrão Looker)
const GC_SKU_TYPE = `CASE
  WHEN gc_sub.master_sku LIKE '%con-grand2500%'      THEN 'Grand 2500'
  WHEN gc_sub.master_sku LIKE '%con-grand1000%'      THEN 'Grand 1000'
  WHEN gc_sub.master_sku LIKE '%con-grand500%'       THEN 'Grand 500'
  WHEN gc_sub.master_sku LIKE '%con-grand200%'       THEN 'Grand 200'
  WHEN gc_sub.master_sku LIKE '%con-experiencia-mais%' THEN 'Experiência +'
  WHEN gc_sub.master_sku LIKE '%con-experiencia%'    THEN 'Experiência'
  WHEN gc_sub.master_sku LIKE '%con-reservaespecial%' THEN 'Reserva Especial'
  WHEN gc_sub.master_sku LIKE '%con-reserva-mais%'   THEN 'Reserva +'
  WHEN gc_sub.master_sku LIKE '%con-reserva%'        THEN 'Reserva'
  WHEN gc_sub.master_sku LIKE '%con-grand-reserva%'  THEN 'Grand Reserva'
  WHEN gc_sub.master_sku LIKE '%con-grandreserva%'   THEN 'Grand Reserva'
  WHEN gc_sub.master_sku LIKE '%con-grandselection%' THEN 'Grand Sélection'
  WHEN gc_sub.master_sku LIKE '%con-grand250-anual-v2%' THEN 'Grand 250'
  WHEN gc_sub.master_sku LIKE '%clube-eternizar%'    THEN 'Clube Itau Eternizar'
  WHEN gc_sub.master_sku LIKE '%clube-explorar%'     THEN 'Clube Itau Explorar'
  WHEN gc_sub.master_sku LIKE '%clube-conhecer%'     THEN 'Clube Itau Conhecer'
  WHEN gc_sub.master_sku LIKE '%clube-apreciar%'     THEN 'Clube Itau Apreciar'
  ELSE NULL
END`;

// Subquery de assinaturas excluindo planos Itaú e Grand 250 anual
const GC_SUB_QUERY = `
  SELECT * FROM dora_red_aggregations.vw_gc_fact_subscription
  WHERE master_sku IS NULL OR (
    master_sku NOT LIKE '%con-grand250-anual-v2%' AND
    master_sku NOT LIKE '%clube-eternizar%'        AND
    master_sku NOT LIKE '%clube-explorar%'         AND
    master_sku NOT LIKE '%clube-conhecer%'         AND
    master_sku NOT LIKE '%clube-apreciar%'
  )`;

// Filtros padrão Grand Cru — apenas pedidos Clube Evino tipo "Vinho" via Facebook
const GC_WHERE = `
  f.is_flash_paid = 1
  AND f.business_sales_channel = 'Clube Evino'
  AND (
    CASE
      WHEN (${GC_SKU_TYPE}) LIKE '%Grand 200%'
        OR (${GC_SKU_TYPE}) LIKE '%Grand 500%'
        OR (${GC_SKU_TYPE}) LIKE '%Grand 1000%'
        OR (${GC_SKU_TYPE}) LIKE '%Grand 2500%'
      THEN 'Crédito' ELSE 'Vinho'
    END
  ) = 'Vinho'
  AND (
    CASE WHEN lc.utm_medium = 'Ads' AND lc.utm_campaign = 'ADVANTAGEROAS.PURCHASE'
    THEN 'Facebook' ELSE lc.channel END
  ) = 'Facebook'
`;

export interface GrandCruCampaignRow {
  utm_campaign: string;
  total_orders: number;
}

export interface GrandCruCreativeRow {
  utm_content: string;
  utm_campaign: string;
  total_orders: number;
}

// Ativações Grand Cru agrupadas por campanha
export async function getGrandCruOrdersByCampaign(
  since: string,
  until: string
): Promise<GrandCruCampaignRow[]> {
  const sql = `
    SELECT
      COALESCE(lc.utm_campaign, '(sem utm_campaign)') AS utm_campaign,
      COUNT(DISTINCT f.order_increment_id)             AS total_orders
    FROM dora_red_aggregations.gc_fact_order_item AS f
    LEFT JOIN (${GC_SUB_QUERY}) AS gc_sub
      ON f.recurrency_id = gc_sub.recurrency_id
    LEFT JOIN dora_red_aggregations.gc_last_click_full AS lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE} BETWEEN $1 AND $2
      AND ${GC_WHERE}
    GROUP BY 1
    ORDER BY total_orders DESC
  `;

  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    utm_campaign: r.utm_campaign,
    total_orders: parseInt(r.total_orders) || 0,
  }));
}

// Ativações Grand Cru agrupadas por criativo (utm_content)
export async function getGrandCruOrdersByCreative(
  since: string,
  until: string
): Promise<GrandCruCreativeRow[]> {
  const sql = `
    SELECT
      COALESCE(lc.utm_content,  '(sem utm_content)')  AS utm_content,
      COALESCE(lc.utm_campaign, '')                    AS utm_campaign,
      COUNT(DISTINCT f.order_increment_id)             AS total_orders
    FROM dora_red_aggregations.gc_fact_order_item AS f
    LEFT JOIN (${GC_SUB_QUERY}) AS gc_sub
      ON f.recurrency_id = gc_sub.recurrency_id
    LEFT JOIN dora_red_aggregations.gc_last_click_full AS lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE} BETWEEN $1 AND $2
      AND ${GC_WHERE}
    GROUP BY 1, 2
    ORDER BY total_orders DESC
  `;

  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    utm_content:  r.utm_content,
    utm_campaign: r.utm_campaign,
    total_orders: parseInt(r.total_orders) || 0,
  }));
}

// ── Clube (Evino): receita de assinatura via tabelas gc_* ────────────────────
//
// Diferente do e-commerce: o Clube é assinatura e mora nas tabelas gc_*. Replica
// o relatório do Looker (store_full LIKE '%Clube%', match com assinatura por
// recurrency_id, canal Facebook). A receita usa "dedup por item de pedido" via
// SELECT DISTINCT (src_id_order_item + valor) — equivalente à agregação simétrica
// do Looker, evitando duplicar receita quando os JOINs multiplicam linhas.
//
// Obs.: o filtro do Looker `sales_order_status.label <> 'Pedido realizado com
// sucesso!'` foi omitido porque o schema dora_magento_gc não é acessível por este
// usuário — e, na prática, todos os pedidos Clube via Facebook no escopo estão em
// status 'signature_created'/'complete', que aquele filtro não exclui.

const CLUBE_VALUE = `CASE
  WHEN f.price_to_pay = 0 AND f.is_online_refund = 1 THEN 0
  ELSE COALESCE(f.price_to_pay, 0) + COALESCE(f.item_shipping_amount, 0)
END`;

const CLUBE_FROM = `
  FROM dora_red_aggregations.gc_fact_order_item AS f
  LEFT JOIN (${GC_SUB_QUERY}) AS gs
    ON f.recurrency_id = gs.recurrency_id
  LEFT JOIN dora_red_aggregations.gc_last_click_full AS lc
    ON lc.src_id_order = f.src_id_order
`;

const CLUBE_WHERE = `
  f.is_solid = 1
  AND ((f.payment_method NOT IN ('ActenzoPayment', 'anymarket_payment', 'mkplaceitau')) OR f.payment_method IS NULL)
  AND ((f.salesrules_names NOT LIKE '%SAC%' AND f.salesrules_names NOT LIKE '%Influencers%') OR f.salesrules_names IS NULL)
  AND f.store_full LIKE '%Clube%'
  AND ${FACEBOOK_CHANNEL}
  AND (CASE WHEN gs.order_increment_id = f.order_increment_id THEN 1 ELSE 0 END) = 1
  AND gs.recurrency_id IS NOT NULL
  AND COALESCE(f.item_store_credit_amount, 0) <= 0
`;

// Receita Clube agrupada por campanha (utm_campaign = nome do conjunto de anúncios)
export async function getClubeOrdersByCampaign(
  since: string,
  until: string
): Promise<RedshiftCampaignRow[]> {
  const sql = `
    SELECT
      utm_campaign,
      COALESCE(SUM(value), 0)             AS total_revenue,
      COUNT(DISTINCT order_increment_id)  AS total_orders
    FROM (
      SELECT DISTINCT
        f.src_id_order_item,
        f.order_increment_id,
        COALESCE(lc.utm_campaign, '(sem utm_campaign)') AS utm_campaign,
        ${CLUBE_VALUE} AS value
      ${CLUBE_FROM}
      WHERE ${ORDER_DATE} BETWEEN $1 AND $2 AND ${CLUBE_WHERE}
    ) t
    GROUP BY 1
    ORDER BY total_revenue DESC
  `;
  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    utm_campaign: r.utm_campaign,
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
    // Clube não tem coluna de primeira compra/CM2; cada assinatura conta como ativação.
    total_activations: parseInt(r.total_orders) || 0,
    total_cm2: 0,
  }));
}

// Receita Clube agrupada por criativo (utm_content)
export async function getClubeOrdersByCreative(
  since: string,
  until: string
): Promise<RedshiftCreativeRow[]> {
  const sql = `
    SELECT
      utm_content,
      utm_campaign,
      COALESCE(SUM(value), 0)             AS total_revenue,
      COUNT(DISTINCT order_increment_id)  AS total_orders
    FROM (
      SELECT DISTINCT
        f.src_id_order_item,
        f.order_increment_id,
        COALESCE(lc.utm_content, '(sem utm_content)') AS utm_content,
        COALESCE(lc.utm_campaign, '') AS utm_campaign,
        ${CLUBE_VALUE} AS value
      ${CLUBE_FROM}
      WHERE ${ORDER_DATE} BETWEEN $1 AND $2 AND ${CLUBE_WHERE}
    ) t
    GROUP BY 1, 2
    ORDER BY total_revenue DESC
  `;
  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    utm_content: r.utm_content,
    utm_campaign: r.utm_campaign,
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
    total_cm2: 0,
  }));
}

// Receita Clube por mês
export async function getClubeOrdersByMonth(
  since: string,
  until: string
): Promise<RedshiftMonthRow[]> {
  const sql = `
    SELECT
      month,
      COALESCE(SUM(value), 0)             AS total_revenue,
      COUNT(DISTINCT order_increment_id)  AS total_orders
    FROM (
      SELECT DISTINCT
        f.src_id_order_item,
        f.order_increment_id,
        LEFT(CAST(DATE_TRUNC('month', ${ORDER_DATE}) AS VARCHAR), 7) AS month,
        ${CLUBE_VALUE} AS value
      ${CLUBE_FROM}
      WHERE ${ORDER_DATE} BETWEEN $1 AND $2 AND ${CLUBE_WHERE}
    ) t
    GROUP BY 1
    ORDER BY 1
  `;
  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    month: String(r.month),
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
  }));
}

// Receita Clube por hora do dia
export async function getClubeOrdersByHour(
  since: string,
  until: string
): Promise<RedshiftHourRow[]> {
  const sql = `
    SELECT
      hour,
      COALESCE(SUM(value), 0)             AS total_revenue,
      COUNT(DISTINCT order_increment_id)  AS total_orders
    FROM (
      SELECT DISTINCT
        f.src_id_order_item,
        f.order_increment_id,
        EXTRACT(HOUR FROM f.created_at_datetime::timestamp) AS hour,
        ${CLUBE_VALUE} AS value
      ${CLUBE_FROM}
      WHERE ${ORDER_DATE} BETWEEN $1 AND $2 AND ${CLUBE_WHERE}
    ) t
    GROUP BY 1
    ORDER BY 1
  `;
  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    hour: parseInt(r.hour) || 0,
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
  }));
}

// Receita Clube total (snapshot, ex.: hoje)
export async function getClubeOrdersTotals(
  since: string,
  until: string
): Promise<RedshiftTotalsRow> {
  const sql = `
    SELECT
      COALESCE(SUM(value), 0)             AS total_revenue,
      COUNT(DISTINCT order_increment_id)  AS total_orders
    FROM (
      SELECT DISTINCT
        f.src_id_order_item,
        f.order_increment_id,
        ${CLUBE_VALUE} AS value
      ${CLUBE_FROM}
      WHERE ${ORDER_DATE} BETWEEN $1 AND $2 AND ${CLUBE_WHERE}
    ) t
  `;
  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  const r = rows[0] || {};
  return {
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
  };
}

// ── Evino: agrupamento por mês ───────────────────────────────────────────────

export interface RedshiftMonthRow {
  month: string; // 'YYYY-MM'
  total_revenue: number;
  total_orders: number;
}

export async function getOrdersByMonth(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftMonthRow[]> {
  const sql = `
    SELECT
      LEFT(CAST(DATE_TRUNC('month', ${ORDER_DATE}) AS VARCHAR), 7) AS month,
      ${REVENUE_SUM} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}${segmentWhere(segment)}
    GROUP BY 1
    ORDER BY 1
  `;

  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    month: String(r.month),
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
  }));
}

// ── Evino: receita por hora do dia ───────────────────────────────────────────

export interface RedshiftHourRow {
  hour: number; // 0–23 (fuso local, mesma referência do relatório manual)
  total_revenue: number;
  total_orders: number;
}

// Receita real agregada por hora do dia, somando todas as datas do período. Ex.:
// em "últimos 7 dias", a hora 14 traz a soma da receita das 14h dos 7 dias. Útil
// para ver a curva de ROAS ao longo do dia (combinado com o spend horário da Meta).
export async function getOrdersByHour(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftHourRow[]> {
  const sql = `
    SELECT
      EXTRACT(HOUR FROM f.created_at_datetime::timestamp) AS hour,
      ${REVENUE_SUM} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}${segmentWhere(segment)}
    GROUP BY 1
    ORDER BY 1
  `;

  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    hour: parseInt(r.hour) || 0,
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
  }));
}

// ── Evino: totais agregados (sem agrupamento) ────────────────────────────────

export interface RedshiftTotalsRow {
  total_revenue: number;
  total_orders: number;
}

// Receita real + pedidos totais do período (ex.: snapshot do dia atual)
export async function getOrdersTotals(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftTotalsRow> {
  const sql = `
    SELECT
      ${REVENUE_SUM} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}${segmentWhere(segment)}
  `;

  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  const r = rows[0] || {};
  return {
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
  };
}

// Receita total de TODOS os canais (sem filtro de canal), só com os filtros de
// qualidade do pedido. Usada para o share de receita do Facebook (Facebook /
// total). Mesma lógica do pivô por canal do Looker.
export async function getOrdersTotalsAllChannels(
  since: string,
  until: string
): Promise<number> {
  const sql = `
    SELECT ${REVENUE_SUM} AS total_revenue
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE} BETWEEN $1 AND $2
      AND ${BASE_WHERE}
  `;

  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return parseFloat(rows[0]?.total_revenue) || 0;
}

// ── Evino ─────────────────────────────────────────────────────────────────────

// Receita real + pedidos agrupados por criativo (utm_content)
export async function getOrdersByCreative(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftCreativeRow[]> {
  const sql = `
    SELECT
      COALESCE(lc.utm_content, '(sem utm_content)') AS utm_content,
      COALESCE(lc.utm_campaign, '') AS utm_campaign,
      ${REVENUE_SUM} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders,
      ${CM2_SUM} AS total_cm2
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}${segmentWhere(segment)}
    GROUP BY 1, 2
    ORDER BY total_revenue DESC
  `;

  const rows = await queryRedshift<any>(sql, [since, until], cacheOpts(until));
  return rows.map((r) => ({
    utm_content: r.utm_content,
    utm_campaign: r.utm_campaign,
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
    total_cm2: parseFloat(r.total_cm2) || 0,
  }));
}

// ── Resolvers de receita por segmento (Ecom = ev_*, Clube = gc_*) ─────────────
//
// A receita de Ecom vem das tabelas ev_* e a de Clube das gc_*. Estes wrappers
// escolhem a fonte conforme o segmento e, em "Todos", combinam as duas. Usados
// por TODAS as superfícies da visão geral (tabelas + gráficos) para o Evino.

const isClube = (s?: string) => (s || '').toLowerCase() === 'clube';
const isEcom = (s?: string) => (s || '').toLowerCase() === 'ecom';

export async function getRevenueByCampaign(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftCampaignRow[]> {
  if (isClube(segment)) return getClubeOrdersByCampaign(since, until);
  if (isEcom(segment)) return getOrdersByCampaign(since, until, 'ecom');
  // Todos: e-commerce + clube.
  const [ecom, clube] = await Promise.all([
    getOrdersByCampaign(since, until),
    getClubeOrdersByCampaign(since, until),
  ]);
  return [...ecom, ...clube];
}

export async function getRevenueByCreative(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftCreativeRow[]> {
  if (isClube(segment)) return getClubeOrdersByCreative(since, until);
  if (isEcom(segment)) return getOrdersByCreative(since, until, 'ecom');
  const [ecom, clube] = await Promise.all([
    getOrdersByCreative(since, until),
    getClubeOrdersByCreative(since, until),
  ]);
  return [...ecom, ...clube];
}

// Soma duas séries por chave (mês/hora) preservando a soma das receitas/pedidos.
function mergeByKey<T extends { total_revenue: number; total_orders: number }>(
  a: T[],
  b: T[],
  key: (row: T) => string | number
): T[] {
  const map = new Map<string | number, T>();
  for (const row of [...a, ...b]) {
    const k = key(row);
    const prev = map.get(k);
    if (prev) {
      prev.total_revenue += row.total_revenue;
      prev.total_orders += row.total_orders;
    } else {
      map.set(k, { ...row });
    }
  }
  return Array.from(map.values());
}

export async function getRevenueByMonth(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftMonthRow[]> {
  if (isClube(segment)) return getClubeOrdersByMonth(since, until);
  if (isEcom(segment)) return getOrdersByMonth(since, until, 'ecom');
  const [ecom, clube] = await Promise.all([
    getOrdersByMonth(since, until),
    getClubeOrdersByMonth(since, until),
  ]);
  return mergeByKey(ecom, clube, (r) => r.month).sort((x, y) => x.month.localeCompare(y.month));
}

export async function getRevenueByHour(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftHourRow[]> {
  if (isClube(segment)) return getClubeOrdersByHour(since, until);
  if (isEcom(segment)) return getOrdersByHour(since, until, 'ecom');
  const [ecom, clube] = await Promise.all([
    getOrdersByHour(since, until),
    getClubeOrdersByHour(since, until),
  ]);
  return mergeByKey(ecom, clube, (r) => r.hour).sort((x, y) => x.hour - y.hour);
}

export async function getRevenueTotals(
  since: string,
  until: string,
  segment?: string
): Promise<RedshiftTotalsRow> {
  if (isClube(segment)) return getClubeOrdersTotals(since, until);
  if (isEcom(segment)) return getOrdersTotals(since, until, 'ecom');
  const [ecom, clube] = await Promise.all([
    getOrdersTotals(since, until),
    getClubeOrdersTotals(since, until),
  ]);
  return {
    total_revenue: ecom.total_revenue + clube.total_revenue,
    total_orders: ecom.total_orders + clube.total_orders,
  };
}
