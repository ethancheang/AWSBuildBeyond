import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'multiplayer.spec.js',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5180' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...base.projects![0].use,
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
      },
    },
  ],
  webServer: [
    {
      command: `"${process.execPath}" server/relay.js`,
      url: 'http://127.0.0.1:8081/health',
      env: { PORT: '8081', ALLOWED_ORIGINS: 'http://127.0.0.1:5180' },
      reuseExistingServer: false,
    },
    {
      command: `"${process.execPath}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5180 --strictPort`,
      url: 'http://127.0.0.1:5180',
      env: {
        VITE_WS_URL: 'ws://127.0.0.1:8081',
        VITE_APPSYNC_HTTP_HOST: '',
        VITE_APPSYNC_REALTIME_HOST: '',
        VITE_APPSYNC_API_KEY: '',
      },
      reuseExistingServer: false,
    },
  ],
});
