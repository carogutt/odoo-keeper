const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const sites = [
    {
      name: 'loopita',
      public: 'https://www.loopita.com',
      login: 'https://www.loopita.com/web/login'
    }
  ];

  let hasError = false;

  for (const site of sites) {

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
      hasError = true;
    }

    await page.close();

    // --- LOGIN CHECK ---
    const loginPage = await context.newPage();

    try {
      await loginPage.goto(site.login, {
        waitUntil: 'load',
        timeout: 30000,
      });

      const content = await loginPage.content();

      console.log('--- LOGIN ---');
      console.log(site.name);

      if (content.includes('This database is currently locked')) {
        throw new Error('ODOO_LOCKED');
      }

      if (content.includes('DNS_PROBE') || content.includes('This site can’t be reached')) {
        throw new Error('DNS_ERROR');
      }

      if (content.includes('secure connection') || content.includes('Not secure')) {
        throw new Error('SSL_ERROR');
      }

      if (content.includes('Databases') && content.includes('Connect')) {
        console.log('ODOO_DB_LIST');
      } else if (
        content.toLowerCase().includes('login') ||
        content.toLowerCase().includes('email')
      ) {
        console.log('LOGIN_OK');
      } else {
        throw new Error('UNKNOWN_SCREEN');
      }

    } catch (error) {
      console.error('LOGIN_FAILED:', site.name);
      console.error(error.message);
      hasError = true;
    }

    await loginPage.close();
  }

  await browser.close();

  if (hasError) {
    process.exit(1);
  } else {
    console.log('ALL_CHECKS_OK');
  }
})();