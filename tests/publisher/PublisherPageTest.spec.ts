import { test, expect } from '@playwright/test';
import { PublisherPage } from '../../pages/PublisherPage';

const adminUsername = 'obs-dev@interspace.ne.jp';
const adminPassword = '1nter5pace';

// Replace with actual publisher pan and siteId
const pan = '84255';
const siteId = '102253';

test.describe('Publisher Tests', () => {
  let publisherPage: PublisherPage;

  test.beforeEach(async ({ page }) => {
    publisherPage = new PublisherPage(page);
    await publisherPage.navigate();
  });

  test('Should login as admin then switch to publisher account', async ({ page }) => {
    // Step 1: Login with admin user
    await publisherPage.login(adminUsername, adminPassword);
    await expect(page).toHaveURL('https://st-istools-id.asean-accesstrade.net/s/dashboard');

    // Step 2: Switch to publisher account via superlogin
    await publisherPage.loginPub(pan, siteId);
  });

  test.afterEach(async ({ page }) => {
    if (page) {
      await page.close();
    }
  });
});
