import { IstoolsPage } from "./istools-page";

export class PublisherPage extends IstoolsPage {
  usernameTextBox = "input[type='text']";
  passwordTextBox = "input[type='password']";
  signInButton = "button[type='submit']";

  async loginPub(pan: string, siteId: string) {
    const page = this.page;
    // const newPage = await this.page.context().newPage();

    await page.goto(
      `https://st-istools-id.asean-accesstrade.net/p/partner-account-superlogin-v2?pan=${pan}&siteId=${siteId}`,
    );

    await page.waitForLoadState("networkidle");

    // Wait redirect from sign-in to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 30000 });
  }

  async loginPubProd(username: string, password: string) {
    const page = this.page;

    await page.goto(`https://publisher.accesstrade.co.id/#/sign-in`);

    await this.fill(this.usernameTextBox, username);
    await this.fill(this.passwordTextBox, password);
    await this.click(this.signInButton);

    await page.waitForLoadState("networkidle");

    // Wait redirect from sign-in to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 30000 });
  }
}
