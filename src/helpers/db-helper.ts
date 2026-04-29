import { Pool, PoolClient } from "pg";
import users from "./users.json";

// ── Country type ─────────────────────────────────────────────────────────────

export type Country = "id" | "th";

const DB_KEY: Record<Country, "cfd-id-db" | "cfd-th-db"> = {
  id: "cfd-id-db",
  th: "cfd-th-db",
};

// ── Connection pools (lazy-initialised, one per country) ─────────────────────

const pools = new Map<Country, Pool>();

function getPool(country: Country = "id"): Pool {
  if (!pools.has(country)) {
    const shared = users["cfd-db"];
    const { database } = users[DB_KEY[country]];
    pools.set(
      country,
      new Pool({
        host: shared.host,
        port: shared.port,
        database,
        user: shared.user,
        password: shared.password,
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      }),
    );
  }
  return pools.get(country)!;
}

/** Run after all tests to release connections for one or all countries. */
export async function closeDatabasePool(country?: Country): Promise<void> {
  if (country) {
    const p = pools.get(country);
    if (p) {
      await p.end();
      pools.delete(country);
    }
  } else {
    await Promise.all([...pools.values()].map((p) => p.end()));
    pools.clear();
  }
}

/** Execute a single query and return all rows. */
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  country: Country = "id",
): Promise<T[]> {
  const client: PoolClient = await getPool(country).connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/** Execute a query and return the single first row (throws if none). */
export async function queryOne<T extends object = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  country: Country = "id",
): Promise<T> {
  const rows = await query<T>(sql, params, country);
  if (rows.length === 0)
    throw new Error(`Query returned no rows.\nSQL: ${sql}`);
  return rows[0];
}

// ── Dashboard metric queries ─────────────────────────────────────────────────
// Adjust table/column names to match your actual schema.

/** Today's date string in YYYY-MM-DD (UTC). */
export function today(): string {
  return new Date().toISOString().split("T")[0];
}

/** Yesterday's date string in YYYY-MM-DD (UTC). */
export function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

export interface DashboardMetrics {
  totalClicks: number;
  legitimateClicks: number;
  blockedFraud: number;
  suspicious: number;
}

/**
 * Returns the four headline KPIs shown in the Executive Dashboard for a given
 * date (defaults to today).
 *
 * ⚠️  Adjust the table name and column names to match your actual schema.
 */
export async function getDashboardMetrics(
  date: string = yesterday(),
  country: Country = "id",
): Promise<DashboardMetrics> {
  const sql = `
    SELECT
      SUM(total_clicks)                                              AS "totalClicks",
      SUM(total_block_count)                                         AS "blockedFraud",
      SUM(total_warning_count)                                       AS "suspicious",
      SUM(total_clicks - total_block_count - total_warning_count)    AS "legitimateClicks"
    FROM hourly_summary
    WHERE request_date = $1
  `;
  const row = await queryOne<DashboardMetrics>(sql, [date], country);
  return {
    totalClicks: Number(row.totalClicks),
    legitimateClicks: Number(row.legitimateClicks),
    blockedFraud: Number(row.blockedFraud),
    suspicious: Number(row.suspicious),
  };
}

/**
 * Calculates the % change of each KPI: (yesterday - dayBefore) / dayBefore * 100.
 * Returns null for a metric when dayBefore value is 0 (avoid division by zero).
 */
export async function getDashboardMetricsDelta(
  country: Country = "id",
): Promise<{
  totalClicks: number | null;
  legitimateClicks: number | null;
  blockedFraud: number | null;
  suspicious: number | null;
}> {
  const yest = await getDashboardMetrics(yesterday(), country);
  const prev = await getDashboardMetrics(daysAgo(2), country);

  const pct = (cur: number, old: number): number | null => {
    if (old === 0) return null;
    return Math.round(((cur - old) / old) * 1000) / 10; // 1 decimal place
  };

  return {
    totalClicks: pct(yest.totalClicks, prev.totalClicks),
    legitimateClicks: pct(yest.legitimateClicks, prev.legitimateClicks),
    blockedFraud: pct(yest.blockedFraud, prev.blockedFraud),
    suspicious: pct(yest.suspicious, prev.suspicious),
  };
}

// ── Fraud Detection Log queries ───────────────────────────────────────────────

export interface FraudDetectionSummary {
  totalFraud: number; // BLOCK + WARNING
  blocked: number; // final_action_name = 'BLOCK'
  warning: number; // non-ALLOW, non-BLOCK
  fraudRate: number; // (blocked + warning) / totalClicks * 100, 1 decimals
  campaignsAffected: number; // COUNT(DISTINCT campaign_id) with any fraud
}

/**
 * Returns summary bar metrics for the Fraud Detection Log page.
 * date range is inclusive: [fromDate, toDate].
 */
export async function getFraudDetectionSummary(
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<FraudDetectionSummary> {
  const sql = `
    SELECT
      SUM(total_violation_count)                                                  AS "totalFraud",
      SUM(total_block_count)                                                      AS "blocked",
      SUM(total_warning_count)                                                    AS "warning",
      ROUND(
        SUM(total_violation_count) * 100.0 / NULLIF(SUM(total_clicks), 0),
        2
      )                                                                           AS "fraudRate",
      (
        SELECT COUNT(DISTINCT campaign_id)
        FROM click_events
        WHERE DATE(request_date) BETWEEN $1 AND $2
          AND final_action_name != 'ALLOW'
      )                                                                           AS "campaignsAffected"
    FROM hourly_summary
    WHERE request_date BETWEEN $1 AND $2
  `;
  const row = await queryOne<{
    totalFraud: string;
    blocked: string;
    warning: string;
    fraudRate: string;
    campaignsAffected: string;
  }>(sql, [fromDate, toDate], country);
  return {
    totalFraud: Number(row.totalFraud),
    blocked: Number(row.blocked),
    warning: Number(row.warning),
    fraudRate: Number(row.fraudRate),
    campaignsAffected: Number(row.campaignsAffected),
  };
}

export interface ThreatVectorRow {
  category: string;
  blocks: number;
  ruleIds: string[]; // e.g. ["R23", "R24", "R21", ...] ordered by violation_count DESC
}

export async function getTopThreatVectors(
  date: string = yesterday(),
  country: Country = "id",
): Promise<ThreatVectorRow[]> {
  const sql = `
    WITH rule_counts AS (
      SELECT
        group_rule_name,
        'R' || CAST(rule_id AS text)  AS rule_id_text,
        SUM(violation_count)          AS affected_clicks
      FROM rule_summary
      WHERE request_date = $1
      GROUP BY group_rule_name, rule_id
    )
    SELECT
      group_rule_name                                                       AS "category",
      STRING_AGG(rule_id_text, ', ' ORDER BY affected_clicks DESC, rule_id_text) AS "triggeredShortcodes",
      SUM(affected_clicks)                                                  AS "total_violating_clicks"
    FROM rule_counts
    GROUP BY group_rule_name
    ORDER BY "total_violating_clicks" DESC, "category"
  `;
  const rows = await query<{
    category: string;
    triggeredShortcodes: string;
    total_violating_clicks: string;
  }>(sql, [date], country);
  return rows.map((r) => ({
    category: r.category,
    blocks: Number(r.total_violating_clicks),
    ruleIds: r.triggeredShortcodes
      ? r.triggeredShortcodes.split(",").map((s) => s.trim())
      : [],
  }));
}

export interface FraudSourceRow {
  siteId: string;
  publisherName: string;
  blocks: number;
  blockRate: number; // 0-100
}

/**
 * Returns the top fraud sources (publisher-level) for a given date.
 *
 * ⚠️  Adjust table/column names to match your actual schema.
 */
export async function getTopFraudSources(
  date: string = yesterday(),
  limit: number = 10,
  country: Country = "id",
): Promise<FraudSourceRow[]> {
  const sql = `
    SELECT
      site_id                                                    AS "siteId",
      publisher_name                                                  AS "publisherName",
      COUNT(*) FILTER (WHERE final_action_name = 'BLOCK')                  AS "blocks",
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE final_action_name = 'BLOCK')
               / NULLIF(COUNT(*), 0)
      )                                                          AS "blockRate"
    FROM click_events
    WHERE DATE(request_date) = $1
    GROUP BY site_id, publisher_name
    ORDER BY "blocks" DESC
    LIMIT $2
  `;
  const rows = await query<{
    siteId: string;
    publisherName: string;
    blocks: string;
    blockRate: string;
  }>(sql, [date, limit], country);
  return rows.map((r) => ({
    siteId: r.siteId,
    publisherName: r.publisherName,
    blocks: Number(r.blocks),
    blockRate: Number(r.blockRate),
  }));
}

// ── UI text → number conversion ───────────────────────────────────────────────

/**
 * Parse abbreviated UI numbers like "13.2M", "14.4K", "945.3K" → raw number.
 */
export function parseUINumber(text: string): number {
  const clean = text.replace(/,/g, "").trim();
  const match = clean.match(/^([\d.]+)([MKBmkb]?)$/);
  if (!match) return NaN;
  const value = parseFloat(match[1]);
  switch (match[2].toUpperCase()) {
    case "B":
      return value * 1_000_000_000;
    case "M":
      return value * 1_000_000;
    case "K":
      return value * 1_000;
    default:
      return value;
  }
}

/**
 * Returns true if |uiValue - dbValue| / dbValue <= tolerancePct (default 1%).
 * Handles rounding inherent in M/K abbreviations.
 */
export function withinTolerance(
  uiValue: number,
  dbValue: number,
  tolerancePct: number = 5,
): boolean {
  if (dbValue === 0) return uiValue === 0;
  return Math.abs(uiValue - dbValue) / dbValue <= tolerancePct / 100;
}

// ── Live Traffic & Fraud Trend queries ────────────────────────────────────────

export interface TrendHourRow {
  hourBucket: string; // ISO format "YYYY-MM-DDTHH:MI:SS" to match chart x values
  totalClicks: number;
  totalBlocked: number;
  blockedRatePct: number;
}

/**
 * Returns 24 hourly rows from hourly_summary for a single date.
 * Used to verify Yesterday chart points one-to-one against DB.
 */
export async function getTrendHourly(
  date: string = yesterday(),
  country: Country = "id",
): Promise<TrendHourRow[]> {
  const sql = `
    SELECT
      to_char(hour_bucket, 'YYYY-MM-DD"T"HH24:MI:SS') AS "hourBucket",
      total_clicks                                       AS "totalClicks",
      total_block_count                                  AS "totalBlocked",
      ROUND(
        total_block_count * 100.0 / NULLIF(total_clicks, 0),
        2
      )                                                  AS "blockedRatePct"
    FROM hourly_summary
    WHERE request_date = $1
    ORDER BY hour_bucket ASC
  `;
  const rows = await query<{
    hourBucket: string;
    totalClicks: string;
    totalBlocked: string;
    blockedRatePct: string;
  }>(sql, [date], country);
  return rows.map((r) => ({
    hourBucket: r.hourBucket,
    totalClicks: Number(r.totalClicks),
    totalBlocked: Number(r.totalBlocked),
    blockedRatePct: Number(r.blockedRatePct),
  }));
}

export interface TrendDayRow {
  requestDate: string; // YYYY-MM-DD
  totalClicks: number;
  totalBlocked: number;
  blockedRatePct: number;
}

/**
 * Returns daily summary rows from hourly_summary for a date range.
 * Matches the SQL provided for the Live Traffic & Fraud Trend chart.
 */
export async function getTrendData(
  fromDate: string = yesterday(),
  toDate: string = yesterday(),
  country: Country = "id",
): Promise<TrendDayRow[]> {
  const sql = `
    SELECT
      request_date::text                                                          AS "requestDate",
      SUM(total_clicks)                                                           AS "totalClicks",
      SUM(total_block_count)                                                      AS "totalBlocked",
      ROUND(
        SUM(total_block_count) * 100.0 / NULLIF(SUM(total_clicks), 0),
        2
      )                                                                           AS "blockedRatePct"
    FROM hourly_summary
    WHERE request_date BETWEEN $1 AND $2
    GROUP BY request_date
    ORDER BY request_date ASC
  `;
  const rows = await query<{
    requestDate: string;
    totalClicks: string;
    totalBlocked: string;
    blockedRatePct: string;
  }>(sql, [fromDate, toDate], country);
  return rows.map((r) => ({
    requestDate: r.requestDate,
    totalClicks: Number(r.totalClicks),
    totalBlocked: Number(r.totalBlocked),
    blockedRatePct: Number(r.blockedRatePct),
  }));
}

/**
 * Returns daily totals for the last 7 days (CURRENT_DATE-7 to CURRENT_DATE-1).
 * Each Plotly point on the "Last 7 Days" chart is the daily SUM for that date.
 */
export async function getTrendLast7Days(
  country: Country = "id",
): Promise<TrendDayRow[]> {
  const sql = `
    SELECT
      request_date::text                                                          AS "requestDate",
      SUM(total_clicks)                                                           AS "totalClicks",
      SUM(total_block_count)                                                      AS "totalBlocked",
      ROUND(
        SUM(total_block_count) * 100.0 / NULLIF(SUM(total_clicks), 0),
        2
      )                                                                           AS "blockedRatePct"
    FROM hourly_summary
    WHERE request_date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE - 1
    GROUP BY request_date
    ORDER BY request_date ASC
  `;
  const rows = await query<{
    requestDate: string;
    totalClicks: string;
    totalBlocked: string;
    blockedRatePct: string;
  }>(sql, [], country);
  return rows.map((r) => ({
    requestDate: r.requestDate,
    totalClicks: Number(r.totalClicks),
    totalBlocked: Number(r.totalBlocked),
    blockedRatePct: Number(r.blockedRatePct),
  }));
}

/** YYYY-MM-DD string for N days ago (UTC). */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

/**
 * Returns the number of click_events rows between two dates (inclusive).
 * Used to decide whether to skip data-dependent tests when the DB is empty.
 */
export async function getClickCountForRange(
  from: string,
  to: string,
  country: Country = "id",
): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM click_events
     WHERE DATE(request_date) BETWEEN $1 AND $2`,
    [from, to],
    country,
  );
  return Number(row.count);
}

// ── Fraud Detection Log — Campaign Summary table ──────────────────────────────

export interface FraudDetectionTableRow {
  campaignId: string;
  campaignName: string;
  siteQuantity: number;
  fraudDetections: number;
  totalClicks: number;
  fraudPct: number; // integer %, e.g. 100, 99, 33
}

/**
 * Returns the first page (top 10) of the campaign summary table in the Fraud
 * Detection Log, ordered by fraud detections descending — matching UI default.
 */
export async function getFraudDetectionTablePage1(
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<FraudDetectionTableRow[]> {
  const sql = `
    SELECT
      campaign_id::text                                                           AS "campaignId",
      campaign_name                                                               AS "campaignName",
      COUNT(DISTINCT site_id)                                                     AS "siteQuantity",
      COUNT(*) FILTER (WHERE final_action_name != 'ALLOW')                       AS "fraudDetections",
      COUNT(*)                                                                    AS "totalClicks",
      ROUND(
        COUNT(*) FILTER (WHERE final_action_name != 'ALLOW') * 100.0
        / NULLIF(COUNT(*), 0)
      )                                                                           AS "fraudPct"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
    GROUP BY campaign_id, campaign_name
    HAVING COUNT(*) FILTER (WHERE final_action_name != 'ALLOW') > 0
    ORDER BY "fraudDetections" DESC
    LIMIT 10
  `;
  const rows = await query<{
    campaignId: string;
    campaignName: string;
    siteQuantity: string;
    fraudDetections: string;
    totalClicks: string;
    fraudPct: string;
  }>(sql, [fromDate, toDate], country);
  return rows.map((r) => ({
    campaignId: r.campaignId,
    campaignName: r.campaignName,
    siteQuantity: Number(r.siteQuantity),
    fraudDetections: Number(r.fraudDetections),
    totalClicks: Number(r.totalClicks),
    fraudPct: Number(r.fraudPct),
  }));
}

/**
 * Returns the total number of distinct campaigns that match a search term
 * (by campaign name ILIKE or campaign_id text ILIKE) and have at least one
 * fraud detection in the given date range.
 * Mirrors the server-side filtering applied by fdl_sum_search.
 */
export async function getFraudDetectionSearchCount(
  fromDate: string,
  toDate: string,
  term: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(DISTINCT campaign_id) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND (
        LOWER(campaign_name) LIKE '%' || LOWER($3) || '%'
        OR campaign_id::text LIKE '%' || $3 || '%'
      )
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, term],
    country,
  );
  return Number(row.count);
}

// ── Campaign Detail ──────────────────────────────────────────────────────────

export interface CampaignDetailKPIs {
  totalFraud: number;
  blocked: number;
  warned: number;
  uniqueSites: number;
}

/**
 * Returns KPIs for a single campaign's detail page:
 * totalFraud, blocked, warned (non-ALLOW non-BLOCK), uniqueSites.
 */
export async function getCampaignDetailKPIs(
  campaignId: string,
  fromDate: string,
  toDate: string,
  query: string = "default",
  country: Country = "id",
): Promise<CampaignDetailKPIs> {
  const sql1 = `
    SELECT
      COUNT(*)                                                           FILTER (WHERE final_action_name != 'ALLOW')             AS "totalFraud",
      COUNT(*)                                                           FILTER (WHERE final_action_name = 'BLOCK')              AS "blocked",
      COUNT(*)                                                           FILTER (WHERE final_action_name NOT IN ('ALLOW','BLOCK')) AS "warned",
      COUNT(DISTINCT site_id)                                            FILTER (WHERE final_action_name != 'ALLOW')             AS "uniqueSites"
    FROM click_events
    WHERE campaign_id::text = $1
      AND DATE(request_date) BETWEEN $2 AND $3
  `;
  const sql2 = `
    SELECT
      COUNT(*)                                                           FILTER (WHERE final_action_name != 'ALLOW')             AS "totalFraud",
      COUNT(*)                                                           FILTER (WHERE final_action_name = 'BLOCK')              AS "blocked",
      COUNT(*)                                                           FILTER (WHERE final_action_name NOT IN ('ALLOW','BLOCK')) AS "warned",
      COUNT(DISTINCT site_id)                                                         AS "uniqueSites"
    FROM click_events
    WHERE campaign_id::text = $1
      AND DATE(request_date) BETWEEN $2 AND $3
  `;
  const sql = query === "default" ? sql1 : sql2;
  const row = await queryOne<{
    totalFraud: string;
    blocked: string;
    warned: string;
    uniqueSites: string;
  }>(sql, [campaignId, fromDate, toDate], country);
  return {
    totalFraud: Number(row.totalFraud),
    blocked: Number(row.blocked),
    warned: Number(row.warned),
    uniqueSites: Number(row.uniqueSites),
  };
}

// ── Action Fraud Log queries ─────────────────────────────────────────────────

export interface AflSummary {
  totalFraud: number;
  blocked: number;
  warning: number;
  avgScore: number;
}

/**
 * Returns the AFL summary bar KPIs for a given date range.
 */
export async function getAflSummary(
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<AflSummary> {
  const sql = `
    SELECT
  COUNT(*) FILTER (WHERE final_action_name != 'ALLOW') AS "totalFraud",
  COUNT(*) FILTER (WHERE final_action_name = 'BLOCK') AS "blocked",
  COUNT(*) FILTER (WHERE final_action_name NOT IN ('ALLOW','BLOCK')) AS "warning",
  COALESCE(ROUND(AVG(max_score * 100) FILTER (WHERE final_action_name != 'ALLOW'), 1), 0) AS "avgScore"
  FROM click_events
  WHERE request_date::date BETWEEN $1 AND $2;
  `;
  const row = await queryOne<{
    totalFraud: string;
    blocked: string;
    warning: string;
    avgScore: string;
  }>(sql, [fromDate, toDate], country);
  return {
    totalFraud: Number(row.totalFraud),
    blocked: Number(row.blocked),
    warning: Number(row.warning),
    avgScore: Number(row.avgScore),
  };
}

export interface AflRow {
  clickTime: string;
  detectionId: string;
  campaignName: string;
  publisherSite: string;
  score: number;
  rules: string;
  ip: string;
  rec: string;
}

/**
 * Returns the first page (50 rows) of AFL table ordered by click_time DESC.
 */
export async function getAflPage1(
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<AflRow[]> {
  const sql = `
    SELECT
      to_char(request_date, 'YYYY-MM-DD HH24:MI:SS')  AS "clickTime",
      optimizer_uuid                                    AS "detectionId",
      campaign_name                                     AS "campaignName",
      publisher_name || ' • ' || site_id               AS "publisherSite",
      total_scores                                      AS score,
      fraud_rules                                       AS "rules",
      ip_address                                        AS "ip",
      final_action_name                                 AS "rec"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
    ORDER BY request_date DESC
    LIMIT 50
  `;
  const rows = await query<{
    clickTime: string;
    detectionId: string;
    campaignName: string;
    publisherSite: string;
    score: string;
    rules: string;
    ip: string;
    rec: string;
  }>(sql, [fromDate, toDate], country);
  return rows.map((r) => ({
    clickTime: r.clickTime,
    detectionId: r.detectionId,
    campaignName: r.campaignName,
    publisherSite: r.publisherSite,
    score: Number(r.score),
    rules: r.rules,
    ip: r.ip,
    rec: r.rec,
  }));
}

/**
 * Count AFL rows filtered by action (BLOCK or WARNING).
 */
export async function getAflCountByAction(
  fromDate: string,
  toDate: string,
  action: "BLOCK" | "WARNING",
  country: Country = "id",
): Promise<number> {
  const sql =
    action === "BLOCK"
      ? `SELECT COUNT(*) AS "count" FROM click_events WHERE DATE(request_date) BETWEEN $1 AND $2 AND final_action_name = 'BLOCK'`
      : `SELECT COUNT(*) AS "count" FROM click_events WHERE DATE(request_date) BETWEEN $1 AND $2 AND final_action_name NOT IN ('ALLOW','BLOCK')`;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate],
    country,
  );
  return Number(row.count);
}

/**
 * Count AFL rows filtered by IP address substring.
 */
export async function getAflCountByIp(
  fromDate: string,
  toDate: string,
  ipTerm: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND ip_address LIKE '%' || $3 || '%'
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, ipTerm],
    country,
  );
  return Number(row.count);
}

/**
 * Count AFL rows filtered by campaign_id.
 */
export async function getAflCountByCampaign(
  fromDate: string,
  toDate: string,
  campaignId: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND campaign_id::text = $3
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, campaignId],
    country,
  );
  return Number(row.count);
}

/**
 * Count AFL rows filtered by site_id.
 */
export async function getAflCountBySite(
  fromDate: string,
  toDate: string,
  siteId: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND site_id::text = $3
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, siteId],
    country,
  );
  return Number(row.count);
}

/**
 * Count AFL rows filtered by rule_id.
 */
export async function getAflCountByRule(
  fromDate: string,
  toDate: string,
  ruleId: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND fraud_rules LIKE '%R' || $3 || '%'
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, ruleId],
    country,
  );
  return Number(row.count);
}

// ── Sites & IPs tab ──────────────────────────────────────────────────────────

export interface CampaignSiteRow {
  siteId: string;
  publisherName: string;
  detections: number;
  totalClicks: number;
  fraudPct: number;
}

/**
 * Returns all fraud-detected sites for a campaign as a lookup map —
 * used to verify each site row visible in the Sites & IPs tab.
 */
export async function getCampaignSitesPage1(
  campaignId: string,
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<CampaignSiteRow[]> {
  const sql = `
    SELECT
      site_id::text                                                              AS "siteId",
      MAX(publisher_name)                                                        AS "publisherName",
      COUNT(*) FILTER (WHERE final_action_name != 'ALLOW')                      AS "detections",
      COUNT(*)                                                                   AS "totalClicks",
      ROUND(
        COUNT(*) FILTER (WHERE final_action_name != 'ALLOW') * 100.0
        / NULLIF(COUNT(*), 0)
      )                                                                          AS "fraudPct"
    FROM click_events
    WHERE campaign_id::text = $1
      AND DATE(request_date) BETWEEN $2 AND $3
    GROUP BY site_id
    HAVING COUNT(*) FILTER (WHERE final_action_name != 'ALLOW') > 0
  `;
  const rows = await query<{
    siteId: string;
    publisherName: string;
    detections: string;
    totalClicks: string;
    fraudPct: string;
  }>(sql, [campaignId, fromDate, toDate], country);
  return rows.map((r) => ({
    siteId: r.siteId,
    publisherName: r.publisherName,
    detections: Number(r.detections),
    totalClicks: Number(r.totalClicks),
    fraudPct: Number(r.fraudPct),
  }));
}
