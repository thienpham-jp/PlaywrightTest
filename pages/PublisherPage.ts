import { IstoolsPage } from "./istools-page";
import { PUB_USERNAME, PUB_PASSWORD } from "../src/helpers/user-helper";
import { Locator, Page } from "playwright-core";

export class PublisherPage extends IstoolsPage {
  usernameTextBox = "input[type='text']";
  passwordTextBox = "input[type='password']";
  signInButton = "button[type='submit']";

  async loginPub(pan: string, siteId: string) {
    const page = this.page;
    const loginUrl = `https://st-istools-id.asean-accesstrade.net/p/partner-account-superlogin-v2?pan=${pan}&siteId=${siteId}`;

    try {
      await page.goto(loginUrl, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
    } catch (error) {
      console.error("❌ Failed to navigate to partner portal:", error);
      throw error;
    }

    try {
      await page.waitForURL("**/dashboard**", { timeout: 90000 });
    } catch (error) {
      console.error("❌ Failed to reach dashboard:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }

  async loginPubStag() {
    const page = this.page;
    const signInUrl = `https://publisher-staging.accesstrade.co.id/#/sign-in`;

    try {
      await page.goto(signInUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
    } catch (error) {
      console.error("❌ Failed to navigate to sign-in page:", error);
      throw error;
    }

    try {
      await this.fill(this.usernameTextBox, PUB_USERNAME);
      await this.fill(this.passwordTextBox, PUB_PASSWORD);
      await this.click(this.signInButton);

      await page.waitForLoadState("networkidle");

      await page.waitForURL("**/dashboard**", { timeout: 60000 });
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }

  async loginPubProd(username: string, password: string) {
    const page = this.page;
    const signInUrl = `https://publisher.accesstrade.co.id/#/sign-in`;

    try {
      await page.goto(signInUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
    } catch (error) {
      console.error("❌ Failed to navigate to sign-in page:", error);
      throw error;
    }

    try {
      await this.fill(this.usernameTextBox, username);
      await this.fill(this.passwordTextBox, password);
      await this.click(this.signInButton);

      await page.waitForLoadState("networkidle");

      await page.waitForURL("**/dashboard**", { timeout: 60000 });
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }
}

// Clicks a random campaign card and returns whichever page navigated to the
// details route. Retries because a card can render before its click handler
// is wired up right after a tab switch, making the first click a no-op.
export async function openRandomCampaignDetails(
  page: Page,
  listCampaign: Locator,
): Promise<{ newPage: Page | null; targetPage: Page }> {
  await listCampaign.first().waitFor({ state: "visible", timeout: 30000 });

  for (let attempt = 0; attempt < 3; attempt++) {
    const campaignCount = await listCampaign.count();
    const randomIndex = Math.floor(Math.random() * campaignCount);

    // Start listening for a new tab before clicking; if none opens, fall back to same-tab navigation
    const newPagePromise = page
      .context()
      .waitForEvent("page", { timeout: 10000 })
      .catch(() => null);

    await listCampaign.nth(randomIndex).click();

    const newPage = await newPagePromise;
    const targetPage = newPage ?? page;

    if (newPage || /\/details\//.test(targetPage.url())) {
      return { newPage, targetPage };
    }

    // Click landed on a card with no navigation yet; let the list settle and retry.
    await page.waitForLoadState("networkidle");
  }

  throw new Error(
    "Clicking a campaign card never navigated to the details page",
  );
}
