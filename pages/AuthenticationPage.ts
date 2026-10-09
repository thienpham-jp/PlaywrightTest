import { BasePage } from "./BasePage";

export class AuthenticationPage extends BasePage {
  usernameTextBox = "#username";
  passwordTextBox = "#password";
  loginButton = "button[type=submit]";
  successFlashMessage = ".success";

  async navigate() {
    await this.goto("https://the-internet.herokuapp.com/login");
  }

  async login(username: string, password: string) {
    try {
      await this.navigate();
    } catch (error) {
      console.error("❌ Failed to navigate to sign-in page:", error);
      throw error;
    }

    try {
      await this.fill(this.usernameTextBox, username);
      await this.fill(this.passwordTextBox, password);
      await this.click(this.loginButton);
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", this.page.url());
      throw error;
    }
  }

  async isLoggedIn() {
    return (await this.getText(this.successFlashMessage)).includes(
      "You logged into a secure area!",
    );
  }

  async isMessageContent(type: string, message: string) {
    return (await this.getText(`.${type}`)).includes(message);
  }
}
