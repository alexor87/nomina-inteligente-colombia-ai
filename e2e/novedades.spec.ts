import { test, expect, navigateToPayroll, selectFirstPeriod } from './fixtures/test-setup';

/**
 * S4-16 — Novedades E2E
 *
 * Prerequisitos:
 *   - Empresa con parámetros legales configurados
 *   - Al menos 1 empleado activo y 1 período seleccionable
 *
 * Cubre:
 *  - En el módulo de nómina, al seleccionar un período, hay botón de novedades
 *  - Abrir el modal/drawer de novedades (botón "Agregar Novedad")
 *  - El formulario de novedad muestra campos de tipo y valor
 *  - Al guardar una novedad, el neto del empleado se recalcula (IBC)
 *
 * Nota: El flujo completo (guardar + verificar recálculo) requiere credenciales
 * de staging y datos previos. Los tests de "interacción" verifican que la UI
 * responde correctamente antes de llamar a la API.
 */

test.describe('Novedades de Nómina', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs();
  });

  test('módulo de nómina muestra opción de novedades tras seleccionar período', async ({ page }) => {
    await navigateToPayroll(page);
    await selectFirstPeriod(page);

    // Esperar carga de empleados
    await page.waitForTimeout(3_000);

    // El botón de novedad por empleado es un círculo con clase border-dashed (Plus icon)
    // Alternativa: el botón "Importar Novedades" en la barra superior
    const novedadTrigger = page.locator('button[class*="border-dashed"]').first();
    const importarBtn = page.getByRole('button', { name: /importar novedades/i });

    const hasNovedad = await novedadTrigger.isVisible({ timeout: 10_000 }).catch(() => false);
    const hasImportar = await importarBtn.isVisible().catch(() => false);
    expect(hasNovedad || hasImportar).toBeTruthy();
  });

  test('clic en "Agregar novedad" abre el panel/modal de novedades', async ({ page }) => {
    await navigateToPayroll(page);
    await selectFirstPeriod(page);

    await page.waitForTimeout(3_000);

    // El botón "+" por empleado abre el modal de novedades
    const novedadTrigger = page.locator('button[class*="border-dashed"]').first();
    await expect(novedadTrigger).toBeVisible({ timeout: 10_000 });
    await novedadTrigger.click();

    // Debe abrirse un Dialog con título relacionado a novedad
    await expect(
      page.getByRole('dialog').getByText(/novedad/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('formulario de novedad tiene campo de tipo y valor', async ({ page }) => {
    await navigateToPayroll(page);
    await selectFirstPeriod(page);

    await page.waitForTimeout(3_000);

    // Abrir modal de novedad via botón "+" circular
    const novedadTrigger = page.locator('button[class*="border-dashed"]').first();
    await novedadTrigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    // El modal abre en modo lista (Gestionar Novedades). Esperar a que carguen los datos
    // (NovedadExistingList muestra loading hasta que los datos llegan), luego clic en
    // "Agregar Novedad" o "Agregar Primera Novedad" para ir al selector de tipo.
    await dialog.getByText(/cargando datos integrados/i).waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    const agregarBtn = dialog.getByRole('button', { name: /agregar (novedad|primera novedad)/i }).first();
    if (await agregarBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await agregarBtn.click();
    }

    // El selector de tipo muestra tabs (Devengos / Deducciones)
    const hasTabs = await dialog.locator('[role="tab"]').count();
    const hasTypeSelector = await dialog.locator('[role="combobox"]').count();
    expect(hasTabs > 0 || hasTypeSelector > 0).toBeTruthy();
  });

  test('neto de empleado es numérico en la tabla de liquidación', async ({ page }) => {
    await navigateToPayroll(page);
    await selectFirstPeriod(page);

    await page.waitForTimeout(3_000);

    // La tabla de liquidación debe mostrar valores numéricos en la columna "Neto a pagar"
    // Buscamos celdas con formato monetario (números con puntos o comas)
    const moneyCells = page.locator('td').filter({ hasText: /[\d]{1,3}([.,][\d]{3})+/ });
    const count = await moneyCells.count();
    expect(count).toBeGreaterThan(0);
  });
});
