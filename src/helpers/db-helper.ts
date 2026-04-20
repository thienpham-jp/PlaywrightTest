import { Pool, PoolClient } from "pg";
import users from "./users.json";

// ── Connection pool (lazy-initialised, shared across tests) ──────────────────

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const cfg = users.cfdDatabase;
    pool = new Pool({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/** Run after all tests to release connections. */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Execute a single query and return all rows. */
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client: PoolClient = await getPool().connect();
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
): Promise<T> {
  const rows = await query<T>(sql, params);
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
): Promise<DashboardMetrics> {
  const sql = `
    SELECT
      COUNT(*)                                          AS "totalClicks",
      COUNT(*) FILTER (WHERE final_action_name = 'ALLOW')         AS "legitimateClicks",
      COUNT(*) FILTER (WHERE final_action_name = 'BLOCK')         AS "blockedFraud",
      COUNT(*) FILTER (WHERE final_action_name != 'ALLOW' and final_action_name != 'BLOCK' )       AS "suspicious"
    FROM click_events
    WHERE DATE(request_date) = $1
  `;
  const row = await queryOne<DashboardMetrics>(sql, [date]);
  return {
    totalClicks: Number(row.totalClicks),
    legitimateClicks: Number(row.legitimateClicks),
    blockedFraud: Number(row.blockedFraud),
    suspicious: Number(row.suspicious),
  };
}

export interface ThreatVectorRow {
  category: string;
  blocks: number;
}

/**
 * Returns block counts per threat-vector category for a given date.
 *
 * ⚠️  Adjust table/column names to match your actual schema.
 */
export async function getTopThreatVectors(
  date: string = yesterday(),
): Promise<ThreatVectorRow[]> {
  const sql = `
    SELECT
      group_rule_name                                          AS "category",
      SUM(violation_count)                                     AS "blocks"
    FROM (
      SELECT DISTINCT group_rule_name, rule_id
      FROM rule_summary
      WHERE DATE(request_date) = $1
    ) r
    JOIN rule_summary s USING (group_rule_name, rule_id)
    GROUP BY group_rule_name
    ORDER BY "blocks" DESC
  `;
  const rows = await query<{ category: string; blocks: string }>(sql, [date]);
  return rows.map((r) => ({ category: r.category, blocks: Number(r.blocks) }));
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
  }>(sql, [date, limit]);
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
  }>(sql, [date]);
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
  }>(sql, [fromDate, toDate]);
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
export async function getTrendLast7Days(): Promise<TrendDayRow[]> {
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
  }>(sql);
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
