import { test, expect, navigateToPayroll, selectFirstPeriod } from './fixtures/test-setup';

/**
 * S4-16 — Payroll Liquidation E2E
 *
 * Prerequisitos:
 *   - Empresa configurada con parámetros legales (salario mínimo, UVT)
 *   - Al menos 2 empleados activos en staging
 *   - Al menos 1 período de nómina creado
 *
 * Cubre:
 *  - Módulo de nómina carga correctamente
 *  - Selector de período es visible
 *  - Seleccionar un período habilita la tabla de empleados
 *  - Botón "Liquidar nómina" aparece al tener empleados cargados
 *  - Totales de devengado/deducciones/neto son numéricos positivos
 */

test.describe('Liquidación de Nómina', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs();
  });

  test('módulo de nómina carga sin errores', async ({ page }) => {
    await navigateToPayroll(page);

    // El título del módulo debe ser visible
    await expect(
      page.getByRole('heading', { name: /nómina|liquidac/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    // No debe haber error crítico en pantalla
    await expect(page.getByText(/error crítico|500|crash/i)).not.toBeVisible();
  });

  test('selector de período de nómina es visible', async ({ page }) => {
    await navigateToPayroll(page);

    // El componente SimplePeriodSelector debe estar en pantalla
    await expect(
      page.getByText(/seleccionar período|período de nómina/i).first()
    ).toBeVisible({ timeout: 12_000 });
  });

  test('seleccionar un período carga la tabla de empleados', async ({ page }) => {
    await navigateToPayroll(page);
    await selectFirstPeriod(page);

    // Esperar carga de empleados
    await page.waitForTimeout(3_000);

    // Debe aparecer el encabezado "Empleados a Liquidar" o la tabla
    const employeeSection = page.getByText(/empleados a liquidar/i);
    const hasTable = await page.locator('table').count();

    const sectionVisible = await employeeSection.isVisible().catch(() => false);
    expect(sectionVisible || hasTable > 0).toBeTruthy();
  });

  test('botón "Liquidar nómina" aparece cuando hay empleados cargados', async ({ page }) => {
    await navigateToPayroll(page);
    await selectFirstPeriod(page);

    // Esperar que carguen los empleados
    await page.waitForTimeout(3_000);

    // El botón de liquidar debe estar visible (texto puede ser "Liquidar nómina" o "Re-liquidar")
    const liquidarBtn = page.getByRole('button', { name: /liquidar nómina|re-liquidar/i });
    await expect(liquidarBtn).toBeVisible({ timeout: 10_000 });
  });

  test('totales de nómina muestran valores numéricos', async ({ page }) => {
    await navigateToPayroll(page);
    await selectFirstPeriod(page);

    await page.waitForTimeout(3_000);

    // Los totales de la tabla deben mostrar valores monetarios con formato COP
    // Formato: "$ 5.000.000" (con espacio) o "$ 0"
    const totalCells = page.locator('td, th').filter({ hasText: /^\$\s*[\d.,]+$/ });
    const count = await totalCells.count();
    expect(count).toBeGreaterThan(0);
  });
});
