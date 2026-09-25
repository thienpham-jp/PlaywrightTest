import { BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export async function addShopeeCookies(context: BrowserContext): Promise<void> {
  try {
    const cookiesPath = path.resolve(__dirname, 'shopee-cookies.json');

    if (!fs.existsSync(cookiesPath)) {
      console.warn(`⚠️ Cookies file not found at ${cookiesPath}`);
      return;
    }

    const cookiesData = fs.readFileSync(cookiesPath, 'utf-8');
    let cookies = JSON.parse(cookiesData);

    // Transform cookies: remove sameSite if null, convert to valid values
    cookies = cookies.map((cookie: any) => {
      const transformedCookie = { ...cookie };

      // Remove properties that Playwright doesn't accept
      delete transformedCookie.storeId;
      delete transformedCookie.session;

      // Handle sameSite: convert null to "None", keep valid values
      if (!transformedCookie.sameSite || transformedCookie.sameSite === null) {
        transformedCookie.sameSite = 'None';
      }

      return transformedCookie;
    });

    await context.addCookies(cookies);
    console.log(`✅ Successfully added ${cookies.length} cookies`);
  } catch (error) {
    console.error(`❌ Error adding cookies:`, error);
    throw error;
  }
}
