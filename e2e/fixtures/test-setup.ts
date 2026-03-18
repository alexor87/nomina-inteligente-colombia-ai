import { test as base, Page, expect } from '@playwright/test';

/**
 * S4-16 — E2E Auth Fixture
 *
 * Extiende el `test` de Playwright con un helper de login
 * que reutiliza el formulario de la AuthPage (/login).
 *
 * Uso:
 *   import { test } from '../fixtures/test-setup';
 *   test('mi test', async ({ page, loginAs }) => { ... });
 */

type Fixtures = {
  loginAs: (email?: string, password?: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  loginAs: async ({ page }, use) => {
    const helper = async (
      email = process.env.E2E_TEST_EMAIL ?? '',
      password = process.env.E2E_TEST_PASSWORD ?? ''
    ) => {
      await page.goto('/login');
      await page.waitForSelector('#email', { state: 'visible' });

      await page.fill('#email', email);
      await page.fill('#password', password);
      await page.click('button[type="submit"]');

      // Esperar redirección al dashboard
      await page.waitForURL('**/modules/dashboard', { timeout: 15_000 });
    };

    await use(helper);
  },
});

export { expect } from '@playwright/test';

/**
 * Realiza logout navegando a /logout.
 * La ruta LogoutPage llama a supabase.auth.signOut() y redirige a /login.
 */
export async function logout(page: Page) {
  await page.goto('/logout');
  await page.waitForURL('**/login', { timeout: 10_000 });
}

/**
 * Navega al módulo de nómina asegurando que el año seleccionado (2025) existe
 * en el cache sync de ConfigurationService, evitando el modal de config requerida.
 *
 * El cache sync de ConfigurationService tiene como default ['2025', '2024']. Si se
 * usa el año actual (2026), el modal aparece hasta que el cache async termine.
 * Para evitar esto, forzamos el año a 2025 (donde hay datos de staging).
 */
export async function navigateToPayroll(page: Page) {
  // Forzar año 2025 en localStorage antes de cargar la página (evita el modal de config)
  await page.goto('/modules/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    localStorage.setItem('payroll_selected_year', '2025');
  });

  await page.goto('/modules/payroll');
  await page.waitForLoadState('networkidle');

  // Si aún aparece el modal (edge case), descartarlo
  const configModal = page.getByRole('dialog');
  const modalVisible = await configModal.isVisible().catch(() => false);
  if (modalVisible) {
    const dismissBtn = page.getByRole('button', { name: /configurar después/i });
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click();
      await page.waitForTimeout(500);
    }
  }
}

/**
 * Selecciona el primer período disponible en el combobox y hace clic en
 * "Continuar con Período" para disparar la carga de empleados.
 */
export async function selectFirstPeriod(page: Page) {
  // La página tiene DOS comboboxes: primero es el selector de año (2021-2040),
  // segundo es el selector de período. Hay que clickear el SEGUNDO.
  await page.waitForSelector('[role="combobox"]', { timeout: 12_000 });
  const periodCombobox = page.locator('[role="combobox"]').nth(1);
  await expect(periodCombobox).toBeVisible({ timeout: 12_000 });
  await periodCombobox.click();

  const firstOption = page.locator('[role="option"]').first();
  await expect(firstOption).toBeVisible({ timeout: 8_000 });
  await firstOption.click();

  // Paso 2: confirmar período (SimplePeriodSelector two-step flow)
  const continuarBtn = page.getByRole('button', { name: /continuar con período/i });
  if (await continuarBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await continuarBtn.click();
  }
}
