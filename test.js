require('dotenv').config();
const { chromium } = require('playwright');
const { google } = require('googleapis');

function getNowIso() {
  return new Date().toISOString();
}

function summarizeError(errorMessage = '') {
  const msg = String(errorMessage);

  if (msg.includes('Public failed')) {
    return 'Public failed';
  }

  if (msg.includes('ERR_NAME_NOT_RESOLVED')) {
    return 'Public URL could not be resolved';
  }

  if (msg.includes('net::ERR_CONNECTION_REFUSED')) {
    return 'Public URL refused connection';
  }

  if (msg.includes('net::ERR_CONNECTION_TIMED_OUT')) {
    return 'Public URL connection timed out';
  }

  if (msg.includes('net::ERR_CERT')) {
    return 'Public URL SSL/certificate error';
  }

  if (
    msg.includes('website_cookies_bar') ||
    msg.includes('Cookies Bar') ||
    msg.includes('subtree intercepts pointer events')
  ) {
    return 'Cookies popup blocked login button';
  }

  if (
    msg.includes('locator.click: Timeout') &&
    msg.includes('button[type="submit"]')
  ) {
    return 'Login timeout on submit button';
  }

  if (msg.includes('LOGIN_FAILED')) {
    return 'Invalid login';
  }

  if (msg.includes('AUTH_UNKNOWN_RESULT')) {
    return 'Auth result unknown';
  }

  if (msg.includes('ADMIN_UNKNOWN_RESULT')) {
    return 'Admin result unknown';
  }

  if (msg.includes('ACTION_UNKNOWN_RESULT')) {
    return 'Action result unknown';
  }

  if (msg.includes('DB_LIST_SCREEN')) {
    return 'Database list screen shown';
  }

  if (msg.includes('REACTIVATION_UNKNOWN_RESULT')) {
    return 'Reactivation result unknown';
  }

  if (msg.includes('ADMIN_EMPTY_PAGE')) {
    return 'Admin page loaded empty';
  }

  return msg.split('\n')[0].trim().slice(0, 140);
}

async function appendRunToGoogleSheet(row) {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  await auth.authorize();

  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'sites_runs!A:R',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
}

async function sendSlackAlert(message) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.log('SLACK_WEBHOOK_NOT_SET');
    return;
  }

  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  if (!response.ok) {
    throw new Error(`SLACK_WEBHOOK_FAILED_${response.status}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const startedAt = Date.now();
  const runAt = getNowIso();
  const triggerType = process.env.GITHUB_ACTIONS ? 'Scheduled' : 'Manual';

  let publicCheckResult = 'not_run';
  let loginPageResult = 'not_run';
  let authResult = 'not_run';
  let adminResult = 'not_run';
  let actionResult = 'not_run';
  let finalHealth = 'ok';
  let finalState = 'failed';
  let publicStatus = '';
  let adminStatus = '';
  let errorStep = '';
  let errorDetail = '';

  const site = {
    name: 'loopita',
    public: 'https://www.loopita.com7fake_url',
    login: 'https://loopita.odoo.com/web/login',
    email: process.env.ODOO_LOOPITA_EMAIL,
    password: process.env.ODOO_LOOPITA_PASSWORD,
  };

  if (!site.email) throw new Error('MISSING_ODOO_LOOPITA_EMAIL');
  if (!site.password) throw new Error('MISSING_ODOO_LOOPITA_PASSWORD');

  let hasError = false;

  // --- PUBLIC CHECK ---
  const page = await context.newPage();

  try {
    const response = await page.goto(site.public, {
      waitUntil: 'commit',
      timeout: 30000,
    });

    const status = response ? response.status() : 'no response';
    publicStatus = String(status);
    publicCheckResult = 'ok';
    finalState = 'public_ok';

    const title = await page.title();

    console.log('--- PUBLIC ---');
    console.log(site.name, status, title);

    if (!response || status >= 400) {
      throw new Error('Public failed');
    }
  } catch (error) {
    publicCheckResult = 'failed';
    finalHealth = 'blocked';
    finalState = 'failed';
    errorStep = 'PUBLIC';
    errorDetail = summarizeError(error.message);

    console.error('PUBLIC_FAILED:', site.name);
    console.error(error.message);
    hasError = true;
  }

  await page.close();

  if (hasError) {
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    const runId = `${site.name}-${Date.now()}`;

    const row = [
      runId,
      runAt,
      site.name,
      site.name,
      publicCheckResult,
      loginPageResult,
      authResult,
      adminResult,
      actionResult,
      finalHealth,
      finalState,
      publicStatus,
      adminStatus,
      errorStep,
      errorDetail,
      'false',
      durationSeconds,
      triggerType,
    ];

    try {
      await appendRunToGoogleSheet(row);
      console.log('SHEETS_LOG_OK');
    } catch (sheetError) {
      console.error('SHEETS_LOG_FAILED');
      console.error(sheetError.message);
    }

    const alertTitle = `🚨 Odoo Keeper: ${errorStep || 'CHECK FAILED'} - ${site.name}`;
    const alertMessage = [
      alertTitle,
      `Step: ${errorStep || 'unknown'}`,
      `Error: ${errorDetail || 'unknown'}`,
      `Health: ${finalHealth}`,
      `Time: ${runAt}`,
    ].join('\n');

    try {
      await sendSlackAlert(alertMessage);
      console.log('SLACK_ALERT_OK');
    } catch (slackError) {
      console.error('SLACK_ALERT_FAILED');
      console.error(slackError.message);
    }

    await browser.close();
    process.exitCode = 1;
    return;
  }

  // --- LOGIN / REACTIVATION / AUTH CHECK ---
  const loginPage = await context.newPage();

  try {
    await loginPage.goto(site.login, {
      waitUntil: 'load',
      timeout: 30000,
    });

    // --- HANDLE COOKIES ---
  try {
    const acceptCookies = loginPage.locator(
      'button:has-text("Accept"), button:has-text("Aceptar"), button:has-text("Agree")'
    );

    if (await acceptCookies.first().isVisible({ timeout: 3000 })) {
      await acceptCookies.first().click();
      await loginPage.waitForTimeout(1000);
      console.log('COOKIES_ACCEPTED');
    }
  } catch (e) {
    console.log('NO_COOKIES_POPUP');
  }

    let content = await loginPage.content();

    console.log('--- LOGIN ---');

    if (loginPageResult === 'not_run') {
      loginPageResult = 'ok';
      finalState = 'login_page_ok';
    }

    console.log(site.name);

    if (content.includes('This database is currently locked')) {
      console.log('ODOO_LOCKED');
      loginPageResult = 'locked';
      finalHealth = 'reactivation_required';

      const reactivateButton = loginPage.getByRole('button', { name: /reactivate/i });
      await reactivateButton.click();
      await loginPage.waitForLoadState('load', { timeout: 30000 });

      content = await loginPage.content();

      if (content.includes('Databases') && content.includes('Connect')) {
        console.log('REACTIVATION_OK_DB_LIST');
        loginPageResult = 'reactivated';
      } else if (
        content.toLowerCase().includes('login') ||
        content.toLowerCase().includes('email')
      ) {
        console.log('REACTIVATION_OK_LOGIN');
        loginPageResult = 'reactivated';
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
    const submitButton = loginPage.locator(
      'button[type="submit"], button:has-text("Log in"), button:has-text("Login")'
    );

    await emailInput.fill(site.email);
    await passwordInput.fill(site.password);
    await submitButton.click();

    await loginPage.waitForLoadState('load', { timeout: 30000 });
    await loginPage.waitForTimeout(3000);

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
      authResult = 'ok';
      finalState = 'auth_ok';

      const bodyText = await loginPage.textContent('body');

      if (!bodyText || bodyText.trim().length < 50) {
        throw new Error('ADMIN_EMPTY_PAGE');
      }

      if (
        finalContent.toLowerCase().includes('odoo') ||
        finalContent.toLowerCase().includes('dashboard') ||
        finalContent.toLowerCase().includes('apps') ||
        finalContent.toLowerCase().includes('website')
      ) {
        console.log('ADMIN_OK');
        adminResult = 'ok';
        adminStatus = 'ADMIN_OK';
        finalState = 'admin_ok';

        // --- ACTION: OPEN WEBSITE ---
        try {
          console.log('--- ACTION: WEBSITE ---');

          await loginPage.goto('https://loopita.odoo.com/web#action=website.website_preview', {
            waitUntil: 'load',
            timeout: 30000,
          });

          await loginPage.waitForTimeout(3000);

          const actionUrl = loginPage.url();
          const actionContent = await loginPage.content();

          console.log('ACTION_URL:', actionUrl);

          if (
            actionContent.toLowerCase().includes('website') ||
            actionContent.toLowerCase().includes('odoo')
          ) {
            console.log('ACTION_OK');
            actionResult = 'ok';
            finalState = 'action_ok';
          } else {
            throw new Error('ACTION_UNKNOWN_RESULT');
          }
        } catch (error) {
          console.error('ACTION_FAILED');
          actionResult = 'failed';
          finalHealth = 'warning';
          finalState = 'failed';
          errorStep = 'ACTION';
          errorDetail = summarizeError(error.message);
          console.error(error.message);
          hasError = true;
        }
      } else {
        throw new Error('ADMIN_UNKNOWN_RESULT');
      }
    } else {
      throw new Error('AUTH_UNKNOWN_RESULT');
    }
  } catch (error) {
    if (loginPageResult === 'not_run') loginPageResult = 'failed';
    if (authResult === 'not_run') authResult = 'failed';
    if (adminResult === 'not_run') adminResult = 'failed';

    finalHealth = error.message === 'LOGIN_FAILED' ? 'login_failed' : 'warning';
    finalState = 'failed';
    errorStep = 'LOGIN_AUTH_ADMIN';
    errorDetail = summarizeError(error.message);

    console.error('LOGIN_FAILED:', site.name);
    console.error(error.message);
    hasError = true;
  }

  await loginPage.close();

  const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
  const runId = `${site.name}-${Date.now()}`;

  const row = [
    runId,
    runAt,
    site.name,
    site.name,
    publicCheckResult,
    loginPageResult,
    authResult,
    adminResult,
    actionResult,
    finalHealth,
    finalState,
    publicStatus,
    adminStatus,
    errorStep,
    errorDetail,
    'false',
    durationSeconds,
    triggerType,
  ];

  try {
    await appendRunToGoogleSheet(row);
    console.log('SHEETS_LOG_OK');
  } catch (sheetError) {
    console.error('SHEETS_LOG_FAILED');
    console.error(sheetError.message);
  }

  if (hasError) {
    const alertTitle = `🚨 Odoo Keeper: ${errorStep || 'CHECK FAILED'} - ${site.name}`;
    const alertMessage = [
      alertTitle,
      `Step: ${errorStep || 'unknown'}`,
      `Error: ${errorDetail || 'unknown'}`,
      `Health: ${finalHealth}`,
      `Time: ${runAt}`,
    ].join('\n');

    try {
      await sendSlackAlert(alertMessage);
      console.log('SLACK_ALERT_OK');
    } catch (slackError) {
      console.error('SLACK_ALERT_FAILED');
      console.error(slackError.message);
    }
  }

  await browser.close();

  if (hasError) {
    process.exitCode = 1;
  } else {
    console.log('ALL_CHECKS_OK');
  }
})();