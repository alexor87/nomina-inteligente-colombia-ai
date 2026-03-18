import { test, expect, logout } from './fixtures/test-setup';

/**
 * S4-16 — Auth Flow E2E
 *
 * Cubre:
 *  - Login exitoso → redirección a dashboard
 *  - Login con credenciales inválidas → mensaje de error
 *  - Logout → redirección a /login
 *  - Ruta protegida sin sesión → redirige a login
 */

test.describe('Autenticación', () => {
  test('login exitoso redirige al dashboard', async ({ page, loginAs }) => {
    await loginAs();

    await expect(page).toHaveURL(/modules\/dashboard/);
    // El dashboard debe mostrar algún texto de bienvenida
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('login con credenciales inválidas muestra error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email', { state: 'visible' });

    await page.fill('#email', 'invalido@test.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Debe aparecer un toast o mensaje de error — no redirigir
    await expect(page.getByText(/incorrectos|inválid|error/i).first()).toBeVisible({
      timeout: 8_000,
    });
    await expect(page).toHaveURL(/login/);
  });

  test('logout redirige a /login', async ({ page, loginAs }) => {
    await loginAs();
    await expect(page).toHaveURL(/modules\/dashboard/);

    await logout(page);

    await expect(page).toHaveURL(/login/);
    await expect(page.locator('#email')).toBeVisible();
  });

  test('ruta protegida sin sesión redirige a login', async ({ page }) => {
    // Acceder directamente sin autenticarse
    await page.goto('/modules/employees');

    // RootRedirect o ProtectedRoute debe redirigir
    await expect(page).toHaveURL(/login|\/$/);
  });
});
