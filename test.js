const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const urls = [
    'https://loopita.com',
    'https://www.loopita.com'
  ];

  let hasError = false;

  for (const url of urls) {
    const page = await context.newPage();

    try {
      const response = await page.goto(url, {
        waitUntil: 'commit',
        timeout: 30000,
      });

      const status = response ? response.status() : 'no response';
      const finalUrl = page.url();

      console.log('---');
      console.log('INPUT URL:', url);
      console.log('FINAL URL:', finalUrl);
      console.log('STATUS:', status);

      if (!response || status >= 400) {
        throw new Error(`Bad response`);
      }

      console.log('CHECK_OK');

    } catch (error) {
      console.error('CHECK_FAILED:', url);
      console.error(error.message);
      hasError = true;
    }

    await page.close();
  }

  await browser.close();

  if (hasError) {
    process.exit(1);
  } else {
    console.log('ALL_PUBLIC_CHECKS_OK');
  }
})();