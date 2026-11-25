import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { PASSWORD, PROJECT_ID } from './example-data.js';

// Takes precedence over local settings that may point at a real project
process.env.VITE_USE_EMULATORS = 'true';
process.env.VITE_FIREBASE_PROJECT_ID = PROJECT_ID;

await import('./seed-example-data.js');

const PORT = 5188;
const DESKTOP = { width: 1280, height: 860 };
const PHONE = { width: 390, height: 844 };

const SCREENSHOTS = [
  {
    file: 'desktop.png',
    path: 'local-demo-shared/users/alex',
    viewport: DESKTOP,
    colorScheme: 'dark',
  },
  {
    file: 'phone.png',
    path: 'local-demo-shared/users/alex',
    viewport: PHONE,
    colorScheme: 'dark',
  },
  {
    file: 'single.png',
    path: 'local-demo',
    viewport: DESKTOP,
    colorScheme: 'light',
  },
  {
    file: 'together.png',
    path: 'local-demo-shared',
    viewport: DESKTOP,
    colorScheme: 'light',
  },
];

const server = await createServer({
  server: { port: PORT, strictPort: true },
});
await server.listen();

const browser = await chromium.launch({ channel: 'chrome' });

try {
  for (const { file, path, viewport, colorScheme } of SCREENSHOTS) {
    const context = await browser.newContext({
      viewport,
      colorScheme,
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    await page.goto(`http://localhost:${PORT}/${path}`);
    await page.getByLabel('Household password').fill(PASSWORD);
    await page.getByLabel('Household password').press('Enter');
    await page.locator('.recharts-sector').first().waitFor();
    await page.screenshot({
      path: fileURLToPath(new URL(`../docs/${file}`, import.meta.url)),
    });
    await context.close();

    console.log(`Saved docs/${file}`);
  }
} finally {
  await browser.close();
  await server.close();
}
