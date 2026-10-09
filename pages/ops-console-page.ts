import { IstoolsPage } from "./istools-page";

export class OpsConsolePage extends IstoolsPage {
  usernameTextBox = "input[type='text']";
  passwordTextBox = "input[type='password']";
  signInButton = "button[type='submit']";

  async login(username: string, password: string) {
    const page = this.page;
    const signInUrl = `https://stag-ops-console-id.asean-accesstrade.net/login`;

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
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }
}
