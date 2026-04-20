import { test, expect } from "@playwright/test";
import { CFDPage } from "../../pages/cfd-page";
import { CFD_PASSWORD, CFD_USERNAME } from "../../src/helpers/user-helper";
import {
  closeDatabasePool,
  daysAgo,
  getDashboardMetrics,
  getTopFraudSources,
  getTopThreatVectors,
  getTrendData,
  getTrendHourly,
  getTrendLast7Days,
  parseUINumber,
  yesterday,
  withinTolerance,
} from "../../src/helpers/db-helper";

test.describe("CFD Login Tests", () => {
  test.describe.configure({ mode: "serial" });
  let cfdPage: CFDPage;

  test.beforeEach(async ({ page }) => {
    cfdPage = new CFDPage(page);

    await cfdPage.login(CFD_USERNAME, CFD_PASSWORD);

    await cfdPage.page.waitForLoadState("networkidle");
  });

  test.afterAll(async () => {
    await closeDatabasePool();
    await cfdPage.page.close();
  });

  test("Dashboard - heading verification", async () => {
    const heading = await cfdPage.page.getByRole("heading", {
      name: "Executive Dashboard",
    });
    await expect(heading).toBeVisible();
  });

  // ── Headline KPI cards ─────────────────────────────────────────────────────

  test.describe("Dashboard KPI cards vs database", () => {
    const getKpiValue = async (title: string): Promise<number> => {
      const card = cfdPage.page.locator(".kpi-card").filter({ hasText: title });
      await card.waitFor({ state: "visible", timeout: 15000 });
      const uiText =
        (await card.locator(".kpi-value").textContent())?.trim() ?? "";
      return parseUINumber(uiText);
    };

    test("Total Clicks matches database", async () => {
      const metrics = await getDashboardMetrics(yesterday());
      const uiValue = await getKpiValue("Total Clicks");
      console.log(`Total Clicks: UI=${uiValue} DB=${metrics.totalClicks}`);
      expect(
        withinTolerance(uiValue, metrics.totalClicks),
        `Total Clicks: UI=${uiValue}, DB=${metrics.totalClicks}`,
      ).toBe(true);
    });

    test("Legitimate Clicks matches database", async () => {
      const metrics = await getDashboardMetrics(yesterday());
      const uiValue = await getKpiValue("Legitimate Clicks");
      console.log(
        `Legitimate Clicks: UI=${uiValue} DB=${metrics.legitimateClicks}`,
      );
      expect(
        withinTolerance(uiValue, metrics.legitimateClicks),
        `Legitimate Clicks: UI=${uiValue}, DB=${metrics.legitimateClicks}`,
      ).toBe(true);
    });

    test("Blocked (Fraud) matches database", async () => {
      const metrics = await getDashboardMetrics(yesterday());
      const uiValue = await getKpiValue("Blocked");
      console.log(`Blocked Fraud: UI=${uiValue} DB=${metrics.blockedFraud}`);
      expect(
        withinTolerance(uiValue, metrics.blockedFraud),
        `Blocked Fraud: UI=${uiValue}, DB=${metrics.blockedFraud}`,
      ).toBe(true);
    });

    test("Suspicious (Warning) matches database", async () => {
      const metrics = await getDashboardMetrics(yesterday());
      const uiValue = await getKpiValue("Suspicious");
      console.log(`Suspicious: UI=${uiValue} DB=${metrics.suspicious}`);
      expect(
        withinTolerance(uiValue, metrics.suspicious),
        `Suspicious: UI=${uiValue}, DB=${metrics.suspicious}`,
      ).toBe(true);
    });
  });

  // ── Top Threat Vectors table ───────────────────────────────────────────────

  test.describe("Top Threat Vectors vs database", () => {
    test("All threat vector block counts match database", async () => {
      const dbRows = await getTopThreatVectors(yesterday());
      // DB group_rule_name matches UI labels exactly (e.g. "SITE VELOCITY")
      const dbMap = new Map(dbRows.map((r) => [r.category, r.blocks]));

      // DOM uses .threat-vec-row (not <table>) — wait for first data row
      const rows = cfdPage.page.locator(
        ".threat-vec-row:not(.threat-vec-header)",
      );
      await rows.first().waitFor({ state: "visible", timeout: 15000 });
      const rowCount = await rows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const categoryText =
          (await row.locator(".tv-category").textContent())
            ?.trim()
            .toUpperCase() ?? "";
        const blocksText =
          (await row.locator(".tv-count").textContent())?.trim() ?? "";

        const dbValue = dbMap.get(categoryText) ?? 0;
        const uiValue = parseUINumber(blocksText);

        console.log(`[${categoryText}] UI=${uiValue} DB=${dbValue}`);

        expect(
          withinTolerance(uiValue, dbValue),
          `Threat vector "${categoryText}": UI=${uiValue}, DB=${dbValue}`,
        ).toBe(true);
      }
    });
  });

  // ── Top Fraud Sources table ────────────────────────────────────────────────

  test.describe("Top Fraud Sources vs database", () => {
    test("Block counts match database", async () => {
      const dbRows = await getTopFraudSources(yesterday(), 10);
      const dbMap = new Map(dbRows.map((r) => [String(r.siteId), r]));

      // DOM uses .fraud-source-row (not <table>)
      const rows = cfdPage.page.locator(
        ".fraud-source-row:not(.fraud-source-header)",
      );
      await rows.first().waitFor({ state: "visible", timeout: 15000 });
      const rowCount = await rows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        // .site-id contains "• 35610" — strip the bullet
        const rawSiteId =
          (await row.locator(".site-id").textContent())?.trim() ?? "";
        const siteId = rawSiteId.replace(/^[•\s]+/, "").trim();
        const blocksText =
          (await row.locator(".fs-count").textContent())?.trim() ?? "";
        const blockRateText =
          (await row.locator(".fs-pct").textContent())
            ?.trim()
            .replace("%", "") ?? "";

        const dbRow = dbMap.get(siteId);
        if (!dbRow) continue;

        const uiBlocks = parseUINumber(blocksText);
        const uiRate = parseFloat(blockRateText);

        console.log(
          `[${siteId}] Blocks UI=${uiBlocks} DB=${dbRow.blocks} | Rate UI=${uiRate}% DB=${dbRow.blockRate}%`,
        );

        expect(
          withinTolerance(uiBlocks, dbRow.blocks),
          `Fraud source "${siteId}" blocks: UI=${uiBlocks}, DB=${dbRow.blocks}`,
        ).toBe(true);

        expect(Math.abs(uiRate - dbRow.blockRate)).toBeLessThanOrEqual(1);
      }
    });

    test("Block recommendation is 'Block' for 100% block-rate sources", async () => {
      const dbRows = await getTopFraudSources(yesterday(), 10);
      const dbMap = new Map(dbRows.map((r) => [String(r.siteId), r]));

      const rows = cfdPage.page.locator(
        ".fraud-source-row:not(.fraud-source-header)",
      );
      await rows.first().waitFor({ state: "visible", timeout: 15000 });
      const rowCount = await rows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const rawSiteId =
          (await row.locator(".site-id").textContent())?.trim() ?? "";
        const siteId = rawSiteId.replace(/^[•\s]+/, "").trim();
        const blockRateText =
          (await row.locator(".fs-pct").textContent())
            ?.trim()
            .replace("%", "") ?? "";
        const recommendationText =
          (await row.locator(".fs-reco-label").textContent())?.trim() ?? "";

        const dbRow = dbMap.get(siteId);
        if (!dbRow) continue;

        if (dbRow.blockRate === 100) {
          expect(recommendationText).toBe("Block");
        }

        console.log(
          `[${siteId}] blockRate=${blockRateText}% rec=${recommendationText}`,
        );
      }
    });
  });
  // ── Live Traffic & Fraud Trend chart ──────────────────────────────────────

  test.describe("Live Traffic & Fraud Trend vs database", () => {
    /** Extract Plotly trace data from the chart on the page. */
    const getChartData = async (): Promise<
      Array<{ hour: string; clicks: number; fraudPct: number }>
    > => {
      return cfdPage.page.evaluate(() => {
        const plotDiv = document.querySelector(
          '[data-testid="stPlotlyChart"] .js-plotly-plot',
        ) as HTMLElement & {
          data: Array<{ name: string; x: string[]; y: number[] }>;
        };
        if (!plotDiv?.data) return [];
        const clicks = plotDiv.data.find((t) => t.name === "Clicks")!;
        const fraud = plotDiv.data.find((t) => t.name === "Fraud %")!;
        return clicks.x.map((x, i) => ({
          hour: x,
          clicks: clicks.y[i],
          fraudPct: fraud.y[i],
        }));
      });
    };

    test("Yesterday: each hourly clicks matches database", async () => {
      await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
      await cfdPage.page.waitForLoadState("networkidle");

      const chartData = await getChartData();
      expect(chartData.length).toBe(24); // 24 hourly data points

      // DB: one row per hour for yesterday
      const dbRows = await getTrendHourly(yesterday());
      expect(dbRows.length).toBe(24);
      const dbMap = new Map(dbRows.map((r) => [r.hourBucket, r]));

      for (const point of chartData) {
        // Chart x: "2026-04-19T00:00:00" — matches DB hourBucket format
        const dbRow = dbMap.get(point.hour);
        expect(dbRow, `No DB row for hour ${point.hour}`).toBeDefined();

        console.log(
          `[Yesterday ${point.hour}] Chart clicks=${point.clicks} DB=${dbRow!.totalClicks}`,
        );
        expect(point.clicks).toBe(dbRow!.totalClicks);
      }
    });

    test("Yesterday: each hourly fraud % matches database", async () => {
      await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
      await cfdPage.page.waitForLoadState("networkidle");

      const chartData = await getChartData();
      const dbRows = await getTrendHourly(yesterday());
      const dbMap = new Map(dbRows.map((r) => [r.hourBucket, r]));

      for (const point of chartData) {
        const dbRow = dbMap.get(point.hour);
        if (!dbRow) continue;

        console.log(
          `[Yesterday ${point.hour}] Chart fraud%=${point.fraudPct} DB=${dbRow.blockedRatePct}`,
        );
        // Allow ±2% tolerance for fraud rate comparison
        expect(
          Math.abs(point.fraudPct - dbRow.blockedRatePct),
          `Hour ${point.hour}: chart fraud%=${point.fraudPct}, DB=${dbRow.blockedRatePct}`,
        ).toBeLessThanOrEqual(2);
      }
    });

    test("Last 7 Days: each day's total clicks matches database", async () => {
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      // Wait until Plotly re-renders with exactly 7 daily points
      await cfdPage.page.waitForFunction(() => {
        const el = document.querySelector(
          '[data-testid="stPlotlyChart"] .js-plotly-plot',
        ) as HTMLElement & { data: Array<{ x: string[] }> };
        return el?.data?.[0]?.x?.length === 7;
      });

      const chartData = await getChartData();
      expect(chartData.length).toBe(7);

      // DB: daily SUM per day for CURRENT_DATE-7 to CURRENT_DATE-1
      const dbRows = await getTrendLast7Days();
      const dbMap = new Map(dbRows.map((r) => [r.requestDate, r]));

      for (const point of chartData) {
        // Chart x is ISO datetime "2026-04-19T00:00:00" → extract date part
        const dateKey = point.hour.split("T")[0];
        const dbRow = dbMap.get(dateKey);
        if (!dbRow) {
          console.log(
            `[Last7Days] No DB row for ${dateKey} (may be zero-data day)`,
          );
          expect(point.clicks).toBe(0);
          continue;
        }

        console.log(
          `[Last7Days ${dateKey}] Chart=${point.clicks} DB=${dbRow.totalClicks}`,
        );
        expect(point.clicks).toBe(dbRow.totalClicks);
      }
    });

    test("Last 7 Days: fraud % per day within expected range", async () => {
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      // Wait until Plotly re-renders with exactly 7 daily points
      await cfdPage.page.waitForFunction(() => {
        const el = document.querySelector(
          '[data-testid="stPlotlyChart"] .js-plotly-plot',
        ) as HTMLElement & { data: Array<{ x: string[] }> };
        return el?.data?.[0]?.x?.length === 7;
      });

      const chartData = await getChartData();
      const dbRows = await getTrendLast7Days();
      const dbMap = new Map(dbRows.map((r) => [r.requestDate, r]));

      for (const point of chartData) {
        const dateKey = point.hour.split("T")[0];
        const dbRow = dbMap.get(dateKey);
        if (!dbRow) continue;

        console.log(
          `[Last7Days ${dateKey}] Chart fraud%=${point.fraudPct} DB blocked_rate=${dbRow.blockedRatePct}`,
        );
        // Allow ±2% tolerance for fraud rate comparison
        expect(
          Math.abs(point.fraudPct - dbRow.blockedRatePct),
          `Last 7 Days ${dateKey} fraud%: chart=${point.fraudPct}, DB=${dbRow.blockedRatePct}`,
        ).toBeLessThanOrEqual(2);
      }
    });
  });
});
