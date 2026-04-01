import { IstoolsPage } from "./istools-page";

export class PublisherPage extends IstoolsPage {
  async loginPub(pan: string, siteId: string) {
    const oldPage = this.page;
    const newPage = await this.page.context().newPage();

    await newPage.goto(
      `https://st-istools-id.asean-accesstrade.net/p/partner-account-superlogin-v2?pan=${pan}&siteId=${siteId}`,
    );

    // Wait redirect from sign-in to dashboard
    await newPage.waitForURL("**/dashboard**", { timeout: 30000 });

    this.page = newPage;

    // Close old tab (st-istools-id)
    await oldPage.close();
  }
}
