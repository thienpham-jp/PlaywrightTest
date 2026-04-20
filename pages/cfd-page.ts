import { BasePage } from "./BasePage";

export class CFDPage extends BasePage {
  usernameTextBox = "input[type='text']";
  passwordTextBox = "input[type='password']";
  signInButton = "button[kind='secondary']";

  async login(username: string, password: string) {
    const page = this.page;
    const signInUrl = `https://stag-cfd-db-id.asean-accesstrade.net/`;

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

      await page.waitForURL("**/?_t=**", { timeout: 60000 });
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }
}
