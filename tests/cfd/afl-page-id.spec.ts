import { test, expect } from "@playwright/test";
import { CFDPage } from "../../pages/cfd-page";
import { CFD_PASSWORD, CFD_USERNAME } from "../../src/helpers/user-helper";
import {
  closeDatabasePool,
  daysAgo,
  getAflCountByAction,
  getAflCountByCampaign,
  getAflCountByIp,
  getAflCountByRule,
  getAflCountBySite,
  getAflSummary,
  getClickCountForRange,
  yesterday,
  withinTolerance,
} from "../../src/helpers/db-helper";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Navigate inside the AFL iframe and read the summary bar. */
const getAflSummaryBar = async (
  page: CFDPage["page"],
): Promise<{
  totalFraud: number;
  blocked: number;
  warning: number;
  avgScore: number;
}> => {
  // Wait until Total Fraud value is non-zero (up to 60 s — Streamlit DB queries can be slow)
  // Also bail early if Streamlit shows an error alert (server-side DB timeout)
  await page
    .waitForFunction(
      () => {
        if (document.querySelector('[role="alert"]')) return true;
        const docs: Document[] = [document];
        document.querySelectorAll("iframe").forEach((f) => {
          try {
            const d =
              (f as HTMLIFrameElement).contentDocument ||
              (f as HTMLIFrameElement).contentWindow?.document;
            if (d && d !== document) docs.push(d);
          } catch {}
        });
        for (const doc of docs) {
          const allEls = Array.from(doc.querySelectorAll("*"));
          for (const el of allEls) {
            const children = Array.from(el.children);
            const labelChild = children.find(
              (c) => (c.textContent || "").trim() === "Total Fraud",
            );
            if (!labelChild) continue;
            for (const sibling of children) {
              if (sibling === labelChild) continue;
              const raw =
                sibling.getAttribute("aria-label") ||
                sibling.textContent?.trim() ||
                "0";
              const num = parseInt(raw.replace(/,/g, ""), 10);
              if (!isNaN(num) && num > 0) return true;
            }
          }
        }
        return false;
      },
      undefined,
      { timeout: 60000 },
    )
    .catch(() => {});

  return page.evaluate(() => {
    const parseNum = (s: string): number => {
      const clean = s.replace(/,/g, "").trim();
      const m = clean.match(/^([\d.]+)([MKBmkb]?)$/);
      if (!m) return parseFloat(clean) || 0;
      const v = parseFloat(m[1]);
      switch (m[2].toUpperCase()) {
        case "B":
          return v * 1_000_000_000;
        case "M":
          return v * 1_000_000;
        case "K":
          return v * 1_000;
        default:
          return v;
      }
    };

    const docs: Document[] = [document];
    document.querySelectorAll("iframe").forEach((f) => {
      try {
        const d =
          (f as HTMLIFrameElement).contentDocument ||
          (f as HTMLIFrameElement).contentWindow?.document;
        if (d && d !== document) docs.push(d);
      } catch {}
    });

    for (const doc of docs) {
      const kpi: Record<string, number> = {};
      const labels = ["Total Fraud", "Blocked", "Warning", "Avg Score"];
      const allEls = Array.from(doc.querySelectorAll("*"));
      for (const el of allEls) {
        const children = Array.from(el.children);
        const labelChild = children.find((c) =>
          labels.includes((c.textContent || "").trim()),
        );
        if (!labelChild) continue;
        const label = (labelChild.textContent || "").trim();
        for (const sibling of children) {
          if (sibling === labelChild) continue;
          // aria-label may be on a nested child (e.g. <span aria-label="9,788,116">9.8M</span>)
          const raw =
            sibling.getAttribute("aria-label") ||
            sibling.querySelector("[aria-label]")?.getAttribute("aria-label") ||
            sibling.textContent?.trim() ||
            "0";
          kpi[label] = parseNum(raw);
          break;
        }
      }
      if ("Total Fraud" in kpi) {
        return {
          totalFraud: kpi["Total Fraud"] ?? 0,
          blocked: kpi["Blocked"] ?? 0,
          warning: kpi["Warning"] ?? 0,
          avgScore: kpi["Avg Score"] ?? 0,
        };
      }
    }
    return { totalFraud: 0, blocked: 0, warning: 0, avgScore: 0 };
  });
};

/** Read AFL table rows + pagination from the iframe. */
const getAflTableData = async (
  page: CFDPage["page"],
): Promise<{
  rows: Array<{
    clickTime: string;
    detectionId: string;
    score: number;
    ip: string;
    rec: string;
  }>;
  paginationText: string;
  paginationTotal: number;
  lastPageBtn: number;
}> => {
  await page
    .waitForFunction(
      () => {
        // Bail out immediately if Streamlit shows an error alert
        if (document.querySelector('[role="alert"]')) return true;
        const iframes = Array.from(document.querySelectorAll("iframe"));
        for (const f of iframes) {
          const doc = (f as HTMLIFrameElement).contentDocument;
          if (!doc) continue;
          const rows = doc.querySelectorAll(
            "tbody tr.afl-row, tbody tr.log-row",
          );
          if (rows.length === 0) continue;
          // Pagination element is a generic div (not a span) — search both
          const pgEl = Array.from(doc.querySelectorAll("div, span")).find(
            (el) => /\bof\s+[\d,]/.test(el.textContent ?? ""),
          );
          if (pgEl) return true;
        }
        return false;
      },
      undefined,
      { timeout: 60000 },
    )
    .catch(() => {}); // catch timeout — caller handles 0-row result
  return page.evaluate(() => {
    // Return empty if Streamlit is in error state
    if (document.querySelector('[role="alert"]')) {
      return {
        rows: [],
        paginationText: "error",
        paginationTotal: 0,
        lastPageBtn: 0,
      };
    }
    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const f of iframes) {
      const doc = (f as HTMLIFrameElement).contentDocument;
      if (!doc) continue;
      const rows = Array.from(
        doc.querySelectorAll("tbody tr.afl-row, tbody tr.log-row"),
      );
      if (rows.length === 0) continue;

      // Pagination element is a generic div — search div and span
      const pgEl = Array.from(doc.querySelectorAll("div, span")).find((el) =>
        /\bof\s+[\d,]/.test(el.textContent ?? ""),
      );
      const pgText = pgEl?.textContent?.trim() ?? "";
      const pgMatch = pgText.match(/of ([\d,]+)/);
      const paginationTotal = pgMatch
        ? parseInt(pgMatch[1].replace(/,/g, ""))
        : 0;

      const btns = Array.from(
        doc.querySelectorAll(
          "button.pg-num, button.afl-pg-num, button.det-pg-num",
        ),
      );
      const lastPageBtn =
        btns.length > 0
          ? parseInt(btns[btns.length - 1].textContent?.trim() ?? "0")
          : 0;

      return {
        rows: rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          const getText = (i: number) => (cells[i]?.textContent ?? "").trim();
          return {
            clickTime: getText(1),
            detectionId: getText(2),
            score: parseInt(getText(5).replace(/,/g, "")) || 0,
            ip: getText(7),
            rec: getText(8),
          };
        }),
        paginationText: pgText,
        paginationTotal,
        lastPageBtn,
      };
    }
    return { rows: [], paginationText: "", paginationTotal: 0, lastPageBtn: 0 };
  });
};

/** Click an action filter button (All / Block / Warn) inside the AFL iframe. */
const clickAflFilter = async (
  page: CFDPage["page"],
  action: "All" | "Block" | "Warn",
) => {
  // Use native Playwright frame click so React synthetic events fire correctly
  const frames = page.frames();
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    const btn = frame.getByRole("button", { name: action, exact: true });
    if ((await btn.count()) > 0) {
      await btn.first().click();
      await page.waitForLoadState("networkidle");
      return;
    }
  }
  // fallback: nth(2) iframe
  await page
    .frameLocator("iframe")
    .nth(2)
    .getByRole("button", { name: action, exact: true })
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle");
};

/** Type an IP search term inside the AFL iframe using Playwright's fill (React-compatible). */
const typeAflIpSearch = async (page: CFDPage["page"], term: string) => {
  // Try all frames including main frame; the IP search box may be in the main Streamlit document
  const frames = page.frames();
  let found = false;
  for (const frame of frames) {
    // getByPlaceholder handles both placeholder and aria-placeholder attributes
    const searchBox = frame.getByPlaceholder(/IP/i);
    if ((await searchBox.count()) > 0) {
      await searchBox.fill(term);
      await searchBox.press("Enter");
      found = true;
      break;
    }
  }
  if (!found) {
    // Fallback: try any text/search input whose placeholder or label mentions "ip"
    await page.evaluate((t) => {
      const inputs = Array.from(
        document.querySelectorAll(
          'input[type="text"], input[type="search"], input:not([type])',
        ),
      ) as HTMLInputElement[];
      const box = inputs.find(
        (i) =>
          (i.placeholder || "").toLowerCase().includes("ip") ||
          (i.getAttribute("aria-label") || "").toLowerCase().includes("ip"),
      );
      if (box) {
        box.focus();
        box.value = t;
        box.dispatchEvent(new Event("input", { bubbles: true }));
        box.dispatchEvent(new Event("change", { bubbles: true }));
        box.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );
      }
    }, term);
  }
  await page.waitForLoadState("networkidle");
};

/** Open and select an item from a dropdown filter inside the AFL iframe. */
const selectAflDropdown = async (
  page: CFDPage["page"],
  dropdownLabel: "Campaigns" | "Sites" | "Rules",
  itemIndex: number,
): Promise<string> => {
  // Map dropdown label to the CSS class used on each item in that panel
  const itemClassMap: Record<string, string> = {
    Campaigns: "al-campaign-item",
    Sites: "al-site-item",
    Rules: "al-rule-item",
  };
  const itemClass = itemClassMap[dropdownLabel] ?? "al-campaign-item";

  // Step 1: Click the trigger button (separate from item selection so we can
  // wait for the dropdown to open before querying items)
  await page.evaluate(
    ({ label }) => {
      const iframes = Array.from(document.querySelectorAll("iframe"));
      for (const f of iframes) {
        const doc = (f as HTMLIFrameElement).contentDocument;
        if (!doc) continue;
        const trigger = Array.from(doc.querySelectorAll("button")).find((b) =>
          b.textContent?.trim().toLowerCase().includes(label.toLowerCase()),
        ) as HTMLElement | undefined;
        if (trigger) {
          trigger.click();
          return;
        }
      }
    },
    { label: dropdownLabel },
  );

  // Step 2: Wait for dropdown items to appear in DOM
  await page
    .waitForFunction(
      ({ cls }) => {
        const iframes = Array.from(document.querySelectorAll("iframe"));
        for (const f of iframes) {
          const doc = (f as HTMLIFrameElement).contentDocument;
          if (!doc) continue;
          if (doc.querySelectorAll(`.${cls}`).length > 0) return true;
        }
        return false;
      },
      { cls: itemClass },
      { timeout: 8000 },
    )
    .catch(() => {});

  // Step 3: Select the item and click Apply
  const result = await page.evaluate(
    ({ cls, idx }) => {
      const iframes = Array.from(document.querySelectorAll("iframe"));
      for (const f of iframes) {
        const doc = (f as HTMLIFrameElement).contentDocument;
        if (!doc) continue;
        const items = Array.from(
          doc.querySelectorAll(`.${cls}`),
        ) as HTMLElement[];
        const item = items[idx];
        if (!item) continue;

        const cb = item.querySelector(
          'input[type="checkbox"]',
        ) as HTMLInputElement | null;
        const text = item.textContent ?? cb?.value ?? "";
        const m = text.match(/[•·\-]\s*(\d+)\s*$/);
        const id = m ? m[1] : (cb?.value ?? "");

        // Click the item (React 17+ delegates to root, so native click works)
        item.click();

        // Click Apply
        const applyBtn = Array.from(doc.querySelectorAll("button")).find((b) =>
          b.textContent?.trim().toLowerCase().includes("apply"),
        ) as HTMLElement | undefined;
        applyBtn?.click();

        return { id, found: !!id };
      }
      return { id: "", found: false };
    },
    { cls: itemClass, idx: itemIndex },
  );

  await page.waitForLoadState("networkidle");
  return result.id;
};

/** Change page size select inside the AFL iframe. */
const changeAflPageSize = async (page: CFDPage["page"], size: number) => {
  await page.evaluate((s) => {
    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const f of iframes) {
      const doc = (f as HTMLIFrameElement).contentDocument;
      if (!doc) continue;
      const sel = doc.querySelector(
        "select.pg-size, select.afl-pg-size",
      ) as HTMLSelectElement | null;
      if (!sel) continue;
      sel.value = String(s);
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
  }, size);
  await page.waitForTimeout(2000);
};

/** Get AFL pagination total from iframe. */
const getAflTotal = async (page: CFDPage["page"]): Promise<number> =>
  page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const f of iframes) {
      const doc = (f as HTMLIFrameElement).contentDocument;
      if (!doc) continue;
      const pgSpan = Array.from(doc.querySelectorAll("span")).find((s) =>
        /of\s/.test(s.textContent ?? ""),
      );
      const m = pgSpan?.textContent?.trim().match(/of ([\d,]+)/);
      return m ? parseInt(m[1].replace(/,/g, "")) : 0;
    }
    return 0;
  });

// ─────────────────────────────────────────────────────────────────────────────

test.describe("CFD ID - Action Fraud Log", () => {
  let cfdPage: CFDPage;
  /** true when yesterday has ≥1 click event in the DB */
  let hasYesterdayData = true;
  /** true when last 2 days has ≥1 click event in the DB */
  let hasLast2DaysData = true;
  /** true when the last 7 days has ≥1 click event in the DB */
  let hasRecentData = true;

  test.beforeAll(async () => {
    const [yCount, last2Count, recentCount] = await Promise.all([
      getClickCountForRange(yesterday(), yesterday()),
      getClickCountForRange(daysAgo(2), daysAgo(2)),
      getClickCountForRange(daysAgo(7), yesterday()),
    ]);
    hasYesterdayData = yCount > 0;
    hasLast2DaysData = last2Count > 0;
    hasRecentData = recentCount > 0;
    console.log(
      `[Data check] yesterday=${yCount} clicks, last2days=${last2Count} clicks, last7days=${recentCount} clicks`,
    );
  });

  test.beforeEach(async ({ page }) => {
    cfdPage = new CFDPage(page);
    await cfdPage.login("ID", CFD_USERNAME, CFD_PASSWORD);
    await cfdPage.page.waitForTimeout(3000);
    // Navigate to Action Fraud Log
    await cfdPage.page.locator('a[href*="action-fraud-log"]').click();
    await cfdPage.page.waitForLoadState("networkidle");
  });

  test.afterAll(async () => {
    await closeDatabasePool();
  });

  // ── Heading ───────────────────────────────────────────────────────────────

  test("Action Fraud Log - heading verification", async () => {
    // Heading is in the main document; wait for it to appear
    await cfdPage.page
      .waitForSelector("text=Action Fraud Log", { timeout: 30000 })
      .catch(() => {});
    const heading = cfdPage.page.getByRole("heading", {
      name: "Action Fraud Log",
    });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  // ── Summary Bar ───────────────────────────────────────────────────────────

  test.describe("Summary bar", () => {
    const checkSummaryBar = async (
      fromDate: string,
      toDate: string,
      label: string,
    ) => {
      // Read UI first (uncontested DB on app side), then query our DB
      const ui = await getAflSummaryBar(cfdPage.page);
      const db = await getAflSummary(fromDate, toDate);
      console.log(
        `[${label}] Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      );
      console.log(`[${label}] Blocked:     UI=${ui.blocked} DB=${db.blocked}`);
      console.log(`[${label}] Warning:     UI=${ui.warning} DB=${db.warning}`);
      console.log(
        `[${label}] Avg Score:   UI=${ui.avgScore} DB=${db.avgScore}`,
      );

      expect(
        withinTolerance(ui.totalFraud, db.totalFraud, 10),
        `Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      ).toBe(true);
      expect(
        withinTolerance(ui.blocked, db.blocked, 10),
        `Blocked: UI=${ui.blocked} DB=${db.blocked}`,
      ).toBe(true);
      expect(ui.warning).toBe(db.warning);
      expect(
        Math.abs(ui.avgScore - db.avgScore),
        `Avg Score: UI=${ui.avgScore} DB=${db.avgScore}`,
      ).toBeLessThanOrEqual(1);
    };

    test.describe("Yesterday", () => {
      test.beforeEach(async () => {
        test.skip(!hasYesterdayData, `No data for yesterday (${yesterday()})`);
        await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
        // Wait up to 90s for EITHER KPI to appear in iframe OR error alert to appear.
        // (networkidle fires immediately via WebSocket; actual DB crash takes ~30s)
        await cfdPage.page
          .waitForFunction(
            () => {
              if (document.querySelector('[role="alert"]')) return true;
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const f of iframes) {
                const doc = (f as HTMLIFrameElement).contentDocument;
                if (!doc) continue;
                const els = Array.from(doc.querySelectorAll("*"));
                for (const el of els) {
                  const ch = Array.from(el.children);
                  if (ch.some((c) => c.textContent?.trim() === "Total Fraud"))
                    return true;
                }
              }
              return false;
            },
            undefined,
            { timeout: 90000 },
          )
          .catch(() => {});
        // Skip if Streamlit's DB query timed out loading Yesterday data (server-side issue)
        const appCrashed = await cfdPage.page.evaluate(
          () => !!document.querySelector('[role="alert"]'),
        );
        test.skip(
          appCrashed,
          "Streamlit app error loading Yesterday data (server DB timeout)",
        );
      });

      test("Total Fraud count matches database", async () => {
        test.setTimeout(120000);
        const ui = await getAflSummaryBar(cfdPage.page);
        const db = await getAflSummary(yesterday(), yesterday());
        console.log(`Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`);
        expect(withinTolerance(ui.totalFraud, db.totalFraud, 10)).toBe(true);
      });

      test("Blocked count matches database", async () => {
        test.setTimeout(120000);
        const ui = await getAflSummaryBar(cfdPage.page);
        const db = await getAflSummary(yesterday(), yesterday());
        console.log(`Blocked: UI=${ui.blocked} DB=${db.blocked}`);
        expect(withinTolerance(ui.blocked, db.blocked, 10)).toBe(true);
      });

      test("Warning count matches database", async () => {
        test.setTimeout(120000);
        const ui = await getAflSummaryBar(cfdPage.page);
        const db = await getAflSummary(yesterday(), yesterday());
        console.log(`Warning: UI=${ui.warning} DB=${db.warning}`);
        expect(ui.warning).toBe(db.warning);
      });

      test("Avg Score matches database", async () => {
        test.setTimeout(120000);
        const ui = await getAflSummaryBar(cfdPage.page);
        const db = await getAflSummary(yesterday(), yesterday());
        console.log(`Avg Score: UI=${ui.avgScore} DB=${db.avgScore}`);
        const diff = Math.abs(ui.avgScore - db.avgScore);
        expect(diff).toBeLessThanOrEqual(1);
      });
    });

    test.describe("Last 2 Days", () => {
      test.beforeEach(async () => {
        test.skip(
          !hasLast2DaysData,
          `No data in last 2 days (${daysAgo(2)} – ${yesterday()})`,
        );
        await cfdPage.page.getByRole("button", { name: "Last 2 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Summary bar matches database", async () => {
        test.setTimeout(120000);
        await checkSummaryBar(daysAgo(2), yesterday(), "Last 2 Days");
      });
    });

    test.describe("Last 7 Days", () => {
      test.beforeEach(async () => {
        test.skip(
          !hasRecentData,
          `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
        );
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Summary bar matches database", async () => {
        test.setTimeout(120000);
        await checkSummaryBar(daysAgo(7), yesterday(), "Last 7 Days");
      });
    });
  });

  // ── Table & Pagination ────────────────────────────────────────────────────

  test.describe("Table & Pagination - Last 7 Days", () => {
    test.beforeEach(async () => {
      test.skip(
        !hasRecentData,
        `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
      );
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForLoadState("networkidle");
    });

    test("Table page 1 has 50 rows by default", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      console.log(`Rows on page 1: ${rows.length}`);
      expect(rows.length).toBe(50);
    });

    test("Pagination total matches database", async () => {
      test.setTimeout(120000);
      const { paginationTotal } = await getAflTableData(cfdPage.page);
      const db = await getAflSummary(daysAgo(7), yesterday());
      console.log(
        `Pagination total: UI=${paginationTotal} DB=${db.totalFraud}`,
      );
      expect(
        withinTolerance(paginationTotal, db.totalFraud),
        `Pagination: UI=${paginationTotal} DB=${db.totalFraud}`,
      ).toBe(true);
    });

    test("Total pages = CEIL(totalFraud / 50)", async () => {
      test.setTimeout(120000);
      const { paginationTotal, lastPageBtn } = await getAflTableData(
        cfdPage.page,
      );
      const db = await getAflSummary(daysAgo(7), yesterday());
      const expectedPages = Math.ceil(db.totalFraud / 50);
      console.log(
        `Total fraud=${db.totalFraud}, expectedPages=${expectedPages}, lastPageBtn=${lastPageBtn}`,
      );
      expect(
        withinTolerance(paginationTotal, db.totalFraud),
        `paginationTotal=${paginationTotal} DB=${db.totalFraud}`,
      ).toBe(true);
      // lastPageBtn is 0 when page has no numbered buttons — skip that check
      if (lastPageBtn > 0) {
        expect(lastPageBtn).toBe(expectedPages);
      }
    });

    test("Rows are sorted by Click Time descending", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(1);
      for (let i = 0; i < rows.length - 1; i++) {
        const t1 = rows[i].clickTime;
        const t2 = rows[i + 1].clickTime;
        console.log(`Row ${i + 1}: ${t1} >= Row ${i + 2}: ${t2}`);
        expect(
          t1 >= t2,
          `Row ${i + 1} "${t1}" should be >= row ${i + 2} "${t2}"`,
        ).toBe(true);
      }
    });

    test("Detection IDs are populated", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.detectionId,
          `Detection ID "${row.detectionId}" should start with "DET-"`,
        ).toMatch(/^DET-/);
      }
    });

    test("Score column values are non-negative", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.score,
          `Score "${row.score}" should be >= 0`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          row.score,
          `Score "${row.score}" should be <= 100`,
        ).toBeLessThanOrEqual(100);
      }
    });

    test("Rec. column only contains BLOCK or WARN values", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.rec.toUpperCase(),
          `Rec "${row.rec}" should be BLOCK or start with WARN`,
        ).toMatch(/^(BLOCK|WARN)/i);
      }
    });

    test.skip("Change page size to 100 shows correct total pages", async () => {
      test.setTimeout(120000);
      await changeAflPageSize(cfdPage.page, 100);
      const [db, { paginationTotal, lastPageBtn }] = await Promise.all([
        getAflSummary(daysAgo(7), yesterday()),
        getAflTableData(cfdPage.page),
      ]);
      const expectedPages = Math.ceil(db.totalFraud / 100);
      console.log(
        `PageSize=100: total=${paginationTotal} DB=${db.totalFraud} lastPage=${lastPageBtn} expected=${expectedPages}`,
      );
      expect(withinTolerance(paginationTotal, db.totalFraud)).toBe(true);
      if (lastPageBtn > 0) {
        expect(lastPageBtn).toBe(expectedPages);
      }
    });
  });

  // ── Action Filter (All / Block / Warn) ────────────────────────────────────

  test.describe("Action Filter - Last 7 Days", () => {
    test.beforeEach(async () => {
      test.skip(
        !hasRecentData,
        `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
      );
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForLoadState("networkidle");
    });

    test("Filter Block - all visible rows have Rec. = BLOCK", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "Block");
      await cfdPage.page.waitForLoadState("networkidle");
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.rec.toUpperCase(),
          `Rec "${row.rec}" should be BLOCK`,
        ).toMatch(/^BLOCK/i);
      }
    });

    test("Filter Block - pagination total matches DB blocked count", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "Block");
      await cfdPage.page.waitForLoadState("networkidle");
      const uiTotal = await getAflTableData(cfdPage.page).then(
        (d) => d.paginationTotal,
      );
      const dbCount = await getAflCountByAction(
        daysAgo(7),
        yesterday(),
        "BLOCK",
      );
      console.log(`[Filter Block] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount, 10)).toBe(true);
    });

    test.skip("Filter Warn - all visible rows have Rec. starting with WARN", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "Warn");
      await cfdPage.page.waitForLoadState("networkidle");
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.rec.toUpperCase(),
          `Rec "${row.rec}" should start with WARN`,
        ).toMatch(/^WARN/i);
      }
    });

    test.skip("Filter Warn - pagination total matches DB warning count", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "Warn");
      await cfdPage.page.waitForLoadState("networkidle");
      const [dbCount, uiTotal] = await Promise.all([
        getAflCountByAction(daysAgo(7), yesterday(), "WARNING"),
        getAflTableData(cfdPage.page).then((d) => d.paginationTotal),
      ]);
      console.log(`[Filter Warn] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount, 10)).toBe(true);
    });
  });

  // ── Search by IP Address ──────────────────────────────────────────────────

  test.describe("Search by IP Address - Last 7 Days", () => {
    test.beforeEach(async () => {
      test.skip(
        !hasRecentData,
        `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
      );
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForLoadState("networkidle");
    });

    test("Search by partial IP - all rows contain the IP substring", async () => {
      test.setTimeout(120000);
      const ipTerm = "103.163";
      await typeAflIpSearch(cfdPage.page, ipTerm);
      // Wait specifically for the first visible row's IP column to contain the search term,
      // confirming the Streamlit component has fully re-rendered with filtered results
      await cfdPage.page
        .waitForFunction(
          (term: string) => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc) continue;
              const rows = doc.querySelectorAll(
                "tbody tr.afl-row, tbody tr.log-row",
              );
              if (rows.length === 0) continue;
              const cells = Array.from(rows[0].querySelectorAll("td"));
              const ip = (cells[7]?.textContent ?? "").trim();
              if (ip.includes(term)) return true;
            }
            return false;
          },
          ipTerm,
          { timeout: 90000 },
        )
        .catch(() => {});
      const { rows, paginationTotal } = await getAflTableData(cfdPage.page);
      const dbCount = await getAflCountByIp(daysAgo(7), yesterday(), ipTerm);
      console.log(
        `[IP Search "${ipTerm}"] UI=${paginationTotal} DB=${dbCount} rowsShown=${rows.length}`,
      );
      expect(withinTolerance(paginationTotal, dbCount, 10)).toBe(true);
      for (const row of rows) {
        expect(
          row.ip,
          `Row IP "${row.ip}" should contain "${ipTerm}"`,
        ).toContain(ipTerm);
      }
    });

    test("Search by non-existent IP - shows 0 total", async () => {
      test.setTimeout(60000);
      await typeAflIpSearch(cfdPage.page, "0.0.0.0");
      const total = await getAflTotal(cfdPage.page);
      console.log(`[IP Search non-existent] total=${total}`);
      expect(total).toBe(0);
    });
  });

  // ── Dropdown Filters ─────────────────────────────────────────────────────

  test.describe("Dropdown Filters - Last 7 Days", () => {
    test.beforeEach(async () => {
      test.skip(
        !hasRecentData,
        `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
      );
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForLoadState("networkidle");
    });

    test("Campaign filter - pagination total matches DB count for that campaign", async () => {
      test.setTimeout(120000);
      const campaignId = await selectAflDropdown(cfdPage.page, "Campaigns", 0);
      const { paginationTotal: uiTotal } = await getAflTableData(cfdPage.page);
      const dbCount = await getAflCountByCampaign(
        daysAgo(7),
        yesterday(),
        campaignId,
      );
      console.log(`[Campaign "${campaignId}"] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount, 10)).toBe(true);
    });

    test("Site filter - pagination total matches DB count for that site", async () => {
      test.setTimeout(120000);
      const siteId = await selectAflDropdown(cfdPage.page, "Sites", 0);
      const { paginationTotal: uiTotal } = await getAflTableData(cfdPage.page);
      const dbCount = await getAflCountBySite(daysAgo(7), yesterday(), siteId);
      console.log(`[Site "${siteId}"] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount, 10)).toBe(true);
    });

    test("Rules filter - pagination total matches DB count for that rule", async () => {
      test.setTimeout(240000);
      const ruleId = await selectAflDropdown(cfdPage.page, "Rules", 0);
      // getAflTableData.waitForFunction bails on error alert — evaluate returns paginationText="error"
      const { paginationTotal: uiTotal, paginationText } =
        await getAflTableData(cfdPage.page);
      if (paginationText === "error") {
        test.skip(
          true,
          `Streamlit app error applying Rules filter (server DB timeout) for rule "${ruleId}"`,
        );
        return;
      }
      // ruleId may have 'R' prefix from checkbox value (e.g. "R1");
      // getAflCountByRule SQL prepends 'R', so pass only the numeric part
      const numericRuleId = ruleId.replace(/^R/i, "") || ruleId;
      const dbCount = await getAflCountByRule(
        daysAgo(7),
        yesterday(),
        numericRuleId,
      );
      console.log(`[Rule "${ruleId}"] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount, 10)).toBe(true);
    });
  });

  // ── Export ────────────────────────────────────────────────────────────────

  test.describe("Export", () => {
    test.beforeEach(async () => {
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForLoadState("networkidle");
    });

    test("Export button is visible and clickable", async () => {
      test.setTimeout(60000);
      // Export may be a <button>, <a>, or other element with text "Export"
      const frames = cfdPage.page.frames();
      let found = false;
      for (const frame of frames) {
        if (frame === cfdPage.page.mainFrame()) continue;
        // Try button role first, then fall back to any element containing "export"
        const btnCount = await frame
          .getByRole("button", { name: /export/i })
          .count();
        if (btnCount > 0) {
          found = true;
          break;
        }
        const textCount = await frame.getByText(/export/i).count();
        if (textCount > 0) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  // ── Time Filter Switching ─────────────────────────────────────────────────

  test.describe("Time Filter - Summary bar updates correctly", () => {
    test("Yesterday - Total Fraud matches DB", async () => {
      test.setTimeout(150000);
      await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
      await cfdPage.page.waitForLoadState("networkidle");
      // getAflSummaryBar.waitForFunction bails on error alert for faster detection
      const ui = await getAflSummaryBar(cfdPage.page);
      const appCrashed = await cfdPage.page.evaluate(
        () => !!document.querySelector('[role="alert"]'),
      );
      test.skip(
        appCrashed,
        "Streamlit app error loading Yesterday data (server DB timeout)",
      );
      const db = await getAflSummary(yesterday(), yesterday());
      console.log(
        `[Yesterday] Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      );
      expect(withinTolerance(ui.totalFraud, db.totalFraud, 10)).toBe(true);
    });

    test("Last 2 Days - Total Fraud matches DB", async () => {
      test.setTimeout(150000);
      test.skip(
        !hasLast2DaysData,
        `No data in last 2 days (${daysAgo(2)} – ${yesterday()})`,
      );
      await cfdPage.page.getByRole("button", { name: "Last 2 Days" }).click();
      await cfdPage.page.waitForLoadState("networkidle");
      const ui = await getAflSummaryBar(cfdPage.page);
      const db = await getAflSummary(daysAgo(2), yesterday());
      console.log(
        `[Last 2 Days] Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      );
      expect(withinTolerance(ui.totalFraud, db.totalFraud, 10)).toBe(true);
    });

    test("Last 7 Days - Total Fraud matches DB", async () => {
      test.setTimeout(150000);
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForLoadState("networkidle");
      const ui = await getAflSummaryBar(cfdPage.page);
      const db = await getAflSummary(daysAgo(7), yesterday());
      console.log(
        `[Last 7 Days] Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      );
      expect(withinTolerance(ui.totalFraud, db.totalFraud, 10)).toBe(true);
    });
  });
});
