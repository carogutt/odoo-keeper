require('dotenv').config();
const { chromium } = require('playwright');
const { google } = require('googleapis');

function getNowIso() {
  return new Date().toISOString();
}

function classifyError(errorMessage = '') {
  const msg = String(errorMessage);

  if (msg.includes('ERR_NAME_NOT_RESOLVED')) {
    return {
      code: 'DNS_NOT_RESOLVED',
      message: 'Public URL could not be resolved',
    };
  }

  if (msg.includes('net::ERR_CONNECTION_REFUSED')) {
    return {
      code: 'CONNECTION_REFUSED',
      message: 'Public URL refused connection',
    };
  }

  if (msg.includes('net::ERR_CONNECTION_TIMED_OUT')) {
    return {
      code: 'CONNECTION_TIMED_OUT',
      message: 'Public URL connection timed out',
    };
  }

  if (msg.includes('net::ERR_CERT')) {
    return {
      code: 'SSL_CERT_ERROR',
      message: 'Public URL SSL/certificate error',
    };
  }

  if (msg.includes('Public failed')) {
    return {
      code: 'PUBLIC_HTTP_ERROR',
      message: 'Public URL returned HTTP error',
    };
  }

  if (
    msg.includes('website_cookies_bar') ||
    msg.includes('Cookies Bar') ||
    msg.includes('subtree intercepts pointer events')
  ) {
    return {
      code: 'COOKIES_BLOCKED_LOGIN',
      message: 'Cookies popup blocked login button',
    };
  }

  if (
    msg.includes('locator.click: Timeout') &&
    msg.includes('button[type="submit"]')
  ) {
    return {
      code: 'LOGIN_CLICK_TIMEOUT',
      message: 'Login button click timed out',
    };
  }

  if (
    msg.includes('locator.fill: Timeout') &&
    msg.includes('input[type="email"]')
  ) {
    return {
      code: 'LOGIN_INPUT_TIMEOUT',
      message: 'Login input field timed out',
    };
  }

  if (msg.includes('LOGIN_FAILED')) {
    return {
      code: 'AUTH_FAILED',
      message: 'Invalid login credentials',
    };
  }

  if (msg.includes('AUTH_UNKNOWN_RESULT')) {
    return {
      code: 'AUTH_UNKNOWN_RESULT',
      message: 'Authentication result was not recognized',
    };
  }

  if (msg.includes('ADMIN_UNKNOWN_RESULT')) {
    return {
      code: 'ADMIN_UNKNOWN_RESULT',
      message: 'Admin result was not recognized',
    };
  }

  if (msg.includes('ACTION_UNKNOWN_RESULT')) {
    return {
      code: 'ACTION_UNKNOWN_RESULT',
      message: 'Action result was not recognized',
    };
  }

  if (msg.includes('DB_LIST_SCREEN')) {
    return {
      code: 'DB_LIST_SCREEN',
      message: 'Database list screen shown instead of login',
    };
  }

  if (msg.includes('REACTIVATION_UNKNOWN_RESULT')) {
    return {
      code: 'REACTIVATION_UNKNOWN_RESULT',
      message: 'Reactivation result was not recognized',
    };
  }

  if (msg.includes('ADMIN_EMPTY_PAGE')) {
    return {
      code: 'ADMIN_EMPTY_PAGE',
      message: 'Admin page loaded empty',
    };
  }

  if (msg.includes('Timeout 30000ms exceeded')) {
    return {
      code: 'TIMEOUT_30000MS',
      message: 'Operation exceeded 30000ms timeout',
    };
  }

  const firstLine = msg.split('\n')[0].trim().slice(0, 120);

  return {
    code: 'UNCLASSIFIED_ERROR',
    message: firstLine || 'Unknown error',
  };
}

function normalizeUrl(rawUrl = '') {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  return value.startsWith('http') ? value : `https://${value}`;
}

function buildErrorDetail(errorCode = '', errorMessage = '') {
  if (!errorCode && !errorMessage) return '';
  return `${errorCode || 'UNKNOWN'} - ${errorMessage || 'Unknown error'}`;
}

function buildRunRow({
  runId,
  runAt,
  site,
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
  errorCode,
  errorMessage,
  slackSent,
  durationSeconds,
  triggerType,
}) {
  return [
    runId,             // A
    runAt,             // B
    site.id,           // C
    site.name,         // D
    publicCheckResult, // E
    loginPageResult,   // F
    authResult,        // G
    adminResult,       // H
    actionResult,      // I
    finalHealth,       // J
    finalState,        // K
    publicStatus,      // L
    adminStatus,       // M
    errorStep,         // N
    errorCode,         // O
    errorMessage,      // P
    slackSent,         // Q
    durationSeconds,   // R
    triggerType,       // S
  ];
}

function buildSlackAlertMessage({
  errorStep,
  siteName,
  errorCode,
  errorMessage,
  finalHealth,
  runAt,
}) {
  const alertTitle = `🚨 Odoo Keeper: ${errorStep || 'CHECK FAILED'} - ${siteName}`;
  const errorDetail = buildErrorDetail(errorCode, errorMessage);

  return [
    alertTitle,
    `Step: ${errorStep || 'unknown'}`,
    `Error: ${errorDetail || 'unknown'}`,
    `Health: ${finalHealth}`,
    `Time: ${runAt}`,
  ].join('\n');
}

// --- HANDLE COOKIES ---
async function dismissCookiesBanner(page) {
  const cookieSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Aceptar")',
    'button:has-text("Agree")',
    'button:has-text("Acepto")',
    'button:has-text("Aceptar todo")',
    '#website_cookies_bar button',
  ];

  for (const selector of cookieSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ timeout: 3000 });
        await page.waitForTimeout(1000);
        console.log('COOKIES_ACCEPTED');
        return true;
      }
    } catch (e) {}
  }

  console.log('NO_COOKIES_POPUP');
  return false;
}

function getGoogleAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  const auth = getGoogleAuth();
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

async function getSitesConfig() {
  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'sites_config!A:L',
  });

  const rows = response.data.values || [];

  if (rows.length < 2) {
    throw new Error('SITES_CONFIG_EMPTY');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] || '';
    });
    return item;
  });
}

async function appendRunToGoogleSheet(row) {
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'sites_runs!A:S',
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

function getSiteCredentials(activeSite) {
  const siteId = String(activeSite.site_id || '').toLowerCase();

  if (siteId === 'loopita') {
    return {
      email: process.env.ODOO_LOOPITA_EMAIL,
      password: process.env.ODOO_LOOPITA_PASSWORD,
    };
  }

  if (siteId === 'carolinagutt') {
    return {
      email: process.env.ODOO_CAROLINAGUTT_EMAIL,
      password: process.env.ODOO_CAROLINAGUTT_PASSWORD,
    };
  }

  throw new Error(`UNKNOWN_SITE_CREDENTIALS: ${activeSite.site_id}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const sites = await getSitesConfig();

  const activeSites = sites.filter(
    (item) => String(item.is_active).toLowerCase() === 'true'
  );

  if (!activeSites.length) {
    throw new Error('NO_ACTIVE_SITES_FOUND');
  }

  for (const activeSite of activeSites) {
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
    let errorCode = '';
    let errorMessage = '';
    let slackSent = 'FALSE';
    let hasError = false;

    console.log(`\n=== RUNNING SITE: ${activeSite.site_name || activeSite.site_id} ===`);

    const { email, password } = getSiteCredentials(activeSite);

    const site = {
      id: activeSite.site_id || activeSite.site_name || 'unknown',
      name: activeSite.site_name || activeSite.site_id || 'unknown',
      public: normalizeUrl(activeSite.public_url),
      login: normalizeUrl(activeSite.login_url),
      odooSubdomain: normalizeUrl(activeSite.odoo_subdomain),
      email,
      password,
    };

    if (!site.email) {
      throw new Error(`MISSING_EMAIL_SECRET: ${site.id}`);
    }

    if (!site.password) {
      throw new Error(`MISSING_PASSWORD_SECRET: ${site.id}`);
    }

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
      const classified = classifyError(error.message);

      publicCheckResult = 'failed';
      finalHealth = 'blocked';
      finalState = 'failed';
      errorStep = 'PUBLIC';
      errorCode = classified.code;
      errorMessage = classified.message;

      console.error('PUBLIC_FAILED:', site.name);
      console.error(error.message);
      hasError = true;
    }

    await page.close();

    if (hasError) {
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
      const runId = `${site.id}-${Date.now()}`;

      const alertMessage = buildSlackAlertMessage({
        errorStep,
        siteName: site.name,
        errorCode,
        errorMessage,
        finalHealth,
        runAt,
      });

      try {
        await sendSlackAlert(alertMessage);
        slackSent = 'TRUE';
        console.log('SLACK_ALERT_OK');
      } catch (slackError) {
        console.error('SLACK_ALERT_FAILED');
        console.error(slackError.message);
      }

      const row = buildRunRow({
        runId,
        runAt,
        site,
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
        errorCode,
        errorMessage,
        slackSent,
        durationSeconds,
        triggerType,
      });

      try {
        await appendRunToGoogleSheet(row);
        console.log('SHEETS_LOG_OK');
      } catch (sheetError) {
        console.error('SHEETS_LOG_FAILED');
        console.error(sheetError.message);
      }

      process.exitCode = 1;
      console.log('SKIPPING LOGIN/ACTION DUE TO PUBLIC FAILURE');
      continue;
    }

    // --- LOGIN / REACTIVATION / AUTH CHECK ---
    const loginPage = await context.newPage();

    try {
      await loginPage.goto(site.login, {
        waitUntil: 'load',
        timeout: 30000,
      });

      await dismissCookiesBanner(loginPage);

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

      try {
        await submitButton.click();
      } catch (e) {
        await dismissCookiesBanner(loginPage);
        await submitButton.click();
      }

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

            const actionUrl = site.odooSubdomain
              ? `${site.odooSubdomain}/web#action=website.website_preview`
              : `${new URL(site.login).origin}/web#action=website.website_preview`;

            await loginPage.goto(actionUrl, {
              waitUntil: 'load',
              timeout: 30000,
            });

            await loginPage.waitForTimeout(3000);

            const finalActionUrl = loginPage.url();
            const actionContent = await loginPage.content();

            console.log('ACTION_URL:', finalActionUrl);

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
            const classified = classifyError(error.message);

            console.error('ACTION_FAILED');
            actionResult = 'failed';
            finalHealth = 'warning';
            finalState = 'failed';
            errorStep = 'ACTION';
            errorCode = classified.code;
            errorMessage = classified.message;
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

      const classified = classifyError(error.message);

      finalHealth = error.message === 'LOGIN_FAILED' ? 'login_failed' : 'warning';
      finalState = 'failed';
      errorStep = 'LOGIN_AUTH_ADMIN';
      errorCode = classified.code;
      errorMessage = classified.message;

      console.error('LOGIN_FAILED:', site.name);
      console.error(error.message);
      hasError = true;
    }

    await loginPage.close();

    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    const runId = `${site.id}-${Date.now()}`;

    if (hasError) {
      const alertMessage = buildSlackAlertMessage({
        errorStep,
        siteName: site.name,
        errorCode,
        errorMessage,
        finalHealth,
        runAt,
      });

      try {
        await sendSlackAlert(alertMessage);
        slackSent = 'TRUE';
        console.log('SLACK_ALERT_OK');
      } catch (slackError) {
        console.error('SLACK_ALERT_FAILED');
        console.error(slackError.message);
      }
    }

    const row = buildRunRow({
      runId,
      runAt,
      site,
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
      errorCode,
      errorMessage,
      slackSent,
      durationSeconds,
      triggerType,
    });

    try {
      await appendRunToGoogleSheet(row);
      console.log('SHEETS_LOG_OK');
    } catch (sheetError) {
      console.error('SHEETS_LOG_FAILED');
      console.error(sheetError.message);
    }

    if (hasError) {
      process.exitCode = 1;
    } else {
      console.log('ALL_CHECKS_OK');
    }
  }

  await browser.close();
})();