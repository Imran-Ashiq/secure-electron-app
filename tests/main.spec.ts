import { test, expect, chromium } from '@playwright/test';
import { Page, BrowserContext } from 'playwright';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import waitPort from 'wait-port';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import * as keytar from 'keytar';

const mockUserProfile = {
  sub: 'auth0|123456789',
  nickname: 'TestUser',
  name: 'Test User',
  email: 'test.user@example.com',
  picture: 'https://s.gravatar.com/avatar/mock.png',
};

test.describe('Application Authentication Flow', () => {
  let appProcess: ChildProcess | null = null;
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async () => {
    const packageJson = require('../package.json');
    const appName = packageJson.productName || packageJson.name;

    // --- The bulletproof cleanup step ---
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /IM "${appName}.exe" /T 2>nul`);
      }
    } catch (e) { /* Ignore */ }
    try {
      const creds = await keytar.findCredentials('SecureElectronApp');
      for (const cred of creds) { await keytar.deletePassword('SecureElectronApp', cred.account); }
    } catch (e) { /* Ignore */ }
    const appData = process.env.APPDATA;
    if (appData) await fs.remove(path.join(appData, appName));
    
    // --- The correct launch method, pointing to the packaged app ---
    const executablePath = path.join(__dirname, '..', 'out', `${appName}-win32-x64`, `${appName}.exe`);

    appProcess = spawn(executablePath, ['--remote-debugging-port=9222']);

    appProcess.stdout?.on('data', (data) => console.log(`App stdout: ${data}`));
    appProcess.stderr?.on('data', (data) => console.error(`App stderr: ${data}`));

    const portReady = await waitPort({ host: '127.0.0.1', port: 9222, timeout: 20000, output: 'silent' });
    if (!portReady) {
      appProcess?.kill();
      throw new Error('Debug port 9222 never became available.');
    }

    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    context = browser.contexts()[0];
    // Ensure we get the correct page (the Electron renderer window)
    page = context.pages().find(p => p.url().includes('localhost') || p.url().includes('secure-electron-app')) || context.pages()[0];

    // Wait for the root element to exist before proceeding
    await page.waitForSelector('#root', { timeout: 20000 });
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await context?.close();
    appProcess?.kill();
  });

  test('should display the logged-out UI on startup', async () => {
    // Wait for the h1 to appear and check its text
    await page.waitForSelector('h1', { timeout: 20000 });
    await expect(page.locator('h1')).toHaveText('Secure Electron App', { timeout: 20000 });
  });

  test('should transition to the logged-in state when auth:success is received', async () => {
    await page.waitForFunction(() => (window as any).electronAPI !== undefined, { timeout: 20000 });
    await page.evaluate(async (profile) => {
      (window as any).electronAPI.send('auth:success', profile);
    }, mockUserProfile);
    // Wait for the h2 to appear and check its text
    await page.waitForSelector('h2', { timeout: 20000 });
    await expect(page.locator('h2')).toHaveText('Welcome, TestUser', { timeout: 20000 });
  });
});