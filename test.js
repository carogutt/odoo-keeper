const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://www.loopita.com';

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const title = await page.title();

    console.log('URL:', url);
    console.log('Status:', response ? response.status() : 'no response');
    console.log('Title:', title);

    if (!response || response.status() >= 400) {
      throw new Error(`Bad response for ${url}`);
    }

    console.log('PUBLIC_CHECK_OK');
  } catch (error) {
    console.error('PUBLIC_CHECK_FAILED');
    console.error(error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();