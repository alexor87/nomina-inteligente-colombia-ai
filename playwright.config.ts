import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * S4-16 — Playwright E2E Configuration
 * Flujos cubiertos: auth, empleados, liquidación, novedades
 */

// Cargar .env.e2e manualmente (Playwright no usa dotenv automáticamente)
try {
  const envPath = resolve(__dirname, '.env.e2e');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch { /* .env.e2e opcional */ }

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // --mode e2e carga .env.e2e que tiene mayor prioridad que .env.local en Vite
    // (orden: .env < .env.local < .env.[mode] < .env.[mode].local)
    // Así el app apunta al Supabase staging donde existe la cuenta e2e@finppi.com.
    command: '/bin/bash -c "PATH=/Users/user/.nvm/versions/node/v20.20.1/bin:$PATH npm run dev -- --mode e2e"',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
