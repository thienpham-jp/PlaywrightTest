import { IstoolsPage } from "./istools-page";

export class PublisherPage extends IstoolsPage {
  async loginPub(pan: string, siteId: string) {
    const page = this.page;
    // const newPage = await this.page.context().newPage();

    await page.goto(
      `https://st-istools-id.asean-accesstrade.net/p/partner-account-superlogin-v2?pan=${pan}&siteId=${siteId}`,
    );

    // Wait redirect from sign-in to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 30000 });
  }
}
