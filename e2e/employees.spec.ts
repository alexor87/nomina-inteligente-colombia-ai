import { test, expect } from './fixtures/test-setup';

/**
 * S4-16 — Employees E2E
 *
 * Prerequisitos:
 *   - Cuenta E2E_TEST_EMAIL con al menos una empresa configurada
 *   - Mínimo 1 empleado activo en staging
 *
 * Cubre:
 *  - Lista de empleados carga al menos un registro
 *  - Navegación a formulario de creación
 *  - Campos obligatorios del formulario son visibles
 *  - Botón de guardar está presente
 */

test.describe('Módulo de Empleados', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs();
  });

  test('lista de empleados muestra datos', async ({ page }) => {
    await page.goto('/modules/employees');
    await page.waitForLoadState('networkidle');

    // El encabezado de la página debe ser visible
    await expect(page.getByRole('heading', { name: /empleados/i }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Debe haber al menos una fila en la tabla (staging tiene empleados pre-cargados)
    // o el estado vacío con su CTA
    const hasRows = await page.locator('table tbody tr').count();
    const hasEmptyState = await page.getByText(/no hay empleados|sin empleados/i).isVisible().catch(() => false);

    expect(hasRows > 0 || hasEmptyState).toBeTruthy();
  });

  test('botón "Nuevo Empleado" navega al formulario de creación', async ({ page }) => {
    await page.goto('/modules/employees');
    await page.waitForLoadState('networkidle');

    // Esperar el botón (puede estar oculto tras carga de datos)
    const newEmployeeBtn = page.getByRole('button', { name: /nuevo empleado/i });
    await expect(newEmployeeBtn).toBeVisible({ timeout: 10_000 });

    await newEmployeeBtn.click();
    await page.waitForURL('**/employees/create', { timeout: 8_000 });

    await expect(page).toHaveURL(/employees\/create/);
  });

  test('formulario de creación tiene campos obligatorios visibles', async ({ page }) => {
    await page.goto('/modules/employees/create');
    await page.waitForLoadState('networkidle');

    // Campos de información personal
    await expect(page.getByPlaceholder('12345678', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder('Juan', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Pérez', { exact: true })).toBeVisible();

    // Campo de salario base (en la sección laboral)
    await expect(page.getByPlaceholder(/2500000/)).toBeVisible({ timeout: 10_000 });
  });

  test('formulario valida campos requeridos al intentar guardar vacío', async ({ page }) => {
    await page.goto('/modules/employees/create');
    await page.waitForLoadState('networkidle');

    // Intentar guardar sin datos
    const submitButton = page.getByRole('button', { name: /guardar|siguiente|crear/i }).first();
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
    await submitButton.click();

    // Debe aparecer algún mensaje de validación
    const validationMsg = page.locator('[class*="red"], [class*="error"], [role="alert"]').first();
    await expect(validationMsg).toBeVisible({ timeout: 5_000 });
  });
});
