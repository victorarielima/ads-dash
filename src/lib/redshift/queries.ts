import { queryRedshift } from './client';

// Padrão de agregação simétrica do Looker — evita duplicação de valores
// quando a mesma linha aparece múltiplas vezes por causa de JOINs
function symAgg(col: string, pk: string): string {
  const hash = `CAST(STRTOL(LEFT(MD5(CAST(${pk} AS VARCHAR)),15),16) AS DECIMAL(38,0))*1.0e8 + CAST(STRTOL(RIGHT(MD5(CAST(${pk} AS VARCHAR)),15),16) AS DECIMAL(38,0))`;
  return `COALESCE(CAST((
    SUM(DISTINCT CAST(FLOOR(COALESCE(${col},0)*1000000.0) AS DECIMAL(38,0)) + ${hash})
    - SUM(DISTINCT ${hash})
  ) AS DOUBLE PRECISION) / 1000000.0, 0)`;
}

// Filtro padrão para pedidos Facebook reais (mesmos filtros do Looker)
const FACEBOOK_WHERE = `
  (CASE WHEN lc.utm_medium = 'Ads' AND lc.utm_campaign = 'ADVANTAGEROAS.PURCHASE'
        THEN 'Facebook' ELSE lc.channel END) = 'Facebook'
  AND f.is_paid = 1
  AND COALESCE(UPPER(f.voucher_code), '') NOT ILIKE 'TV%'
  AND COALESCE(f.payment_method, '') <> 'sac'
  AND f.order_increment_id NOT LIKE 'BRI%'
  AND CASE WHEN COALESCE(f.marketplace_provider, '') = 'vivino' THEN 1 ELSE 0 END = 0
`;

const pk = 'f.src_id_order_item';

// `created_at_datetime` é gravado em UTC. Convertendo para o fuso de São Paulo,
// o filtro/agrupamento por data passa a representar o dia local inteiro
// (00:00–23:59), batendo com o relatório manual (Looker) em vez de cortar
// pedidos nas bordas do dia por causa do deslocamento UTC.
const ORDER_DATE_LOCAL = `DATE(CONVERT_TIMEZONE('America/Sao_Paulo', f.created_at_datetime))`;

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
  until: string
): Promise<RedshiftCampaignRow[]> {
  const sql = `
    SELECT
      COALESCE(lc.utm_campaign, '(sem utm_campaign)') AS utm_campaign,
      ${symAgg('f.price_to_pay', pk)} + ${symAgg('f.item_shipping_amount', pk)} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders,
      COUNT(DISTINCT CASE WHEN f.is_first_order = 1 THEN f.order_increment_id END) AS total_activations,
      ${symAgg('f.cm2_realized', pk)} AS total_cm2
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE_LOCAL} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}
    GROUP BY 1
    ORDER BY total_revenue DESC
  `;

  const rows = await queryRedshift<any>(sql, [since, until]);
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
      ${ORDER_DATE_LOCAL} BETWEEN $1 AND $2
      AND ${GC_WHERE}
    GROUP BY 1
    ORDER BY total_orders DESC
  `;

  const rows = await queryRedshift<any>(sql, [since, until]);
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
      ${ORDER_DATE_LOCAL} BETWEEN $1 AND $2
      AND ${GC_WHERE}
    GROUP BY 1, 2
    ORDER BY total_orders DESC
  `;

  const rows = await queryRedshift<any>(sql, [since, until]);
  return rows.map((r) => ({
    utm_content:  r.utm_content,
    utm_campaign: r.utm_campaign,
    total_orders: parseInt(r.total_orders) || 0,
  }));
}

// ── Evino: agrupamento por mês ───────────────────────────────────────────────

export interface RedshiftMonthRow {
  month: string; // 'YYYY-MM'
  total_revenue: number;
  total_orders: number;
}

export async function getOrdersByMonth(
  since: string,
  until: string
): Promise<RedshiftMonthRow[]> {
  const sql = `
    SELECT
      LEFT(CAST(DATE_TRUNC('month', ${ORDER_DATE_LOCAL}) AS VARCHAR), 7) AS month,
      ${symAgg('f.price_to_pay', pk)} + ${symAgg('f.item_shipping_amount', pk)} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE_LOCAL} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}
    GROUP BY 1
    ORDER BY 1
  `;

  const rows = await queryRedshift<any>(sql, [since, until]);
  return rows.map((r) => ({
    month: String(r.month),
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
  until: string
): Promise<RedshiftTotalsRow> {
  const sql = `
    SELECT
      ${symAgg('f.price_to_pay', pk)} + ${symAgg('f.item_shipping_amount', pk)} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE_LOCAL} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}
  `;

  const rows = await queryRedshift<any>(sql, [since, until]);
  const r = rows[0] || {};
  return {
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
  };
}

// ── Evino ─────────────────────────────────────────────────────────────────────

// Receita real + pedidos agrupados por criativo (utm_content)
export async function getOrdersByCreative(
  since: string,
  until: string
): Promise<RedshiftCreativeRow[]> {
  const sql = `
    SELECT
      COALESCE(lc.utm_content, '(sem utm_content)') AS utm_content,
      COALESCE(lc.utm_campaign, '') AS utm_campaign,
      ${symAgg('f.price_to_pay', pk)} + ${symAgg('f.item_shipping_amount', pk)} AS total_revenue,
      COUNT(DISTINCT f.order_increment_id) AS total_orders,
      ${symAgg('f.cm2_realized', pk)} AS total_cm2
    FROM dora_red_aggregations.ev_fact_order_item f
    LEFT JOIN dora_red_aggregations.ev_last_click_full lc
      ON lc.src_id_order = f.src_id_order
    WHERE
      ${ORDER_DATE_LOCAL} BETWEEN $1 AND $2
      AND ${FACEBOOK_WHERE}
    GROUP BY 1, 2
    ORDER BY total_revenue DESC
  `;

  const rows = await queryRedshift<any>(sql, [since, until]);
  return rows.map((r) => ({
    utm_content: r.utm_content,
    utm_campaign: r.utm_campaign,
    total_revenue: parseFloat(r.total_revenue) || 0,
    total_orders: parseInt(r.total_orders) || 0,
    total_cm2: parseFloat(r.total_cm2) || 0,
  }));
}
