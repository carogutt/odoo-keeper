require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const site = {
    name: 'loopita',
    public: 'https://www.loopita.com',
    login: 'https://loopita.odoo.com/web/login',
    email: process.env.ODOO_LOOPITA_EMAIL,
    password: process.env.ODOO_LOOPITA_PASSWORD,
  };

  let hasError = false;

  // --- PUBLIC CHECK ---
  const page = await context.newPage();

  try {
    const response = await page.goto(site.public, {
      waitUntil: 'commit',
      timeout: 30000,
    });

    const status = response ? response.status() : 'no response';
    const title = await page.title();

    console.log('--- PUBLIC ---');
    console.log(site.name, status, title);

    if (!response || status >= 400) throw new Error('Public failed');
  } catch (error) {
    console.error('PUBLIC_FAILED:', site.name);
    console.error(error.message);
    hasError = true;
  }

  await page.close();

  // --- LOGIN / REACTIVATION / AUTH CHECK ---
  const loginPage = await context.newPage();

  try {
    await loginPage.goto(site.login, {
      waitUntil: 'load',
      timeout: 30000,
    });

    let content = await loginPage.content();

    console.log('--- LOGIN ---');
    console.log(site.name);

    if (content.includes('This database is currently locked')) {
      console.log('ODOO_LOCKED');

      const reactivateButton = loginPage.getByRole('button', { name: /reactivate/i });
      await reactivateButton.click();
      await loginPage.waitForLoadState('load', { timeout: 30000 });

      content = await loginPage.content();

      if (content.includes('Databases') && content.includes('Connect')) {
        console.log('REACTIVATION_OK_DB_LIST');
      } else if (
        content.toLowerCase().includes('login') ||
        content.toLowerCase().includes('email')
      ) {
        console.log('REACTIVATION_OK_LOGIN');
      } else {
        throw new Error('REACTIVATION_UNKNOWN_RESULT');
      }
    }

    content = await loginPage.content();

    if (content.includes('Databases') && content.includes('Connect')) {
      console.log('ODOO_DB_LIST');
      throw new Error('DB_LIST_SCREEN');
    }

    const emailInput = loginPage.locator('input[type="email"], input[name="login"]');
    const passwordInput = loginPage.locator('input[type="password"]');
    const submitButton = loginPage.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Login")');

    await emailInput.fill(site.email);
    await passwordInput.fill(site.password);
    await submitButton.click();

    await loginPage.waitForLoadState('load', { timeout: 30000 });

    const finalUrl = loginPage.url();
    const finalContent = await loginPage.content();

    console.log('FINAL_URL:', finalUrl);

    if (
      finalContent.toLowerCase().includes('wrong login') ||
      finalContent.toLowerCase().includes('incorrect') ||
      finalContent.toLowerCase().includes('invalid')
    ) {
      throw new Error('LOGIN_FAILED');
    }

    if (
      (
        (finalUrl.includes('/web') && !finalUrl.includes('/web/login')) ||
        finalUrl.includes('/odoo')
      ) &&
      !finalContent.toLowerCase().includes('wrong login') &&
      !finalContent.toLowerCase().includes('incorrect') &&
      !finalContent.toLowerCase().includes('invalid')
    ) {
      console.log('AUTH_OK');
    } else {
      throw new Error('AUTH_UNKNOWN_RESULT');
    }

  } catch (error) {
    console.error('LOGIN_FAILED:', site.name);
    console.error(error.message);
    hasError = true;
  }

  await loginPage.close();
  await browser.close();

  if (hasError) {
    process.exit(1);
  } else {
    console.log('ALL_CHECKS_OK');
  }
})();