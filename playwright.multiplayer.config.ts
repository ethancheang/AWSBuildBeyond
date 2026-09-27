import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './tests/multiplayer',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5174' },
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: {
      VITE_WS_URL: 'ws://127.0.0.1:8081',
      VITE_APPSYNC_HTTP_HOST: '',
      VITE_APPSYNC_REALTIME_HOST: '',
      VITE_APPSYNC_API_KEY: '',
    },
  },
});
