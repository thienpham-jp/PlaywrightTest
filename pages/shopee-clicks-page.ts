import { IstoolsPage } from "./istools-page";

export class ShopeeClicksPage extends IstoolsPage {
  usernameTextBox = "input[type='text']";
  passwordTextBox = "input[type='password']";
  signInButton = 'button:has-text("Log In")';
  languageEnglishButton = 'text="English"';

  private async bypassLanguageSelection() {
    const page = this.page;
    try {
      // Wait for language selection modal to appear (with shorter timeout)
      const languageButton = page.locator(this.languageEnglishButton);
      await languageButton
        .waitFor({ state: "visible", timeout: 5000 })
        .catch(() => {
          console.log("⚠️ Language selection modal not found");
        });

      // Click English button if visible
      if (
        await languageButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        console.log("✓ Clicking English button...");
        await languageButton.click();
        // Wait for modal to close/navigate
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log("⚠️ Language selection bypass skipped:", error);
    }
  }

  async login(username: string, password: string) {
    const page = this.page;
    const signInUrl = `https://affiliate.shopee.co.id/dashboard`;

    try {
      await page.goto(signInUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (error) {
      console.error("❌ Failed to navigate to sign-in page:", error);
      throw error;
    }

    try {
      // await this.bypassLanguageSelection();

      await this.click(this.languageEnglishButton);

      await this.fill(this.usernameTextBox, username);
      await this.fill(this.passwordTextBox, password);
      await this.click(this.signInButton);

      await page.waitForLoadState("load");

      // await page.waitForURL("**/dashboard**", { timeout: 60000 });
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }
}
