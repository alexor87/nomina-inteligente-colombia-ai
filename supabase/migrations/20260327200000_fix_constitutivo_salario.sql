-- Fix: Marcar novedades de horas extra, recargos nocturnos y dominicales como constitutivas de salario
-- Estas novedades tenían constitutivo_salario = false (DEFAULT de la columna) porque
-- SecureNovedadesService no incluía el campo en el INSERT.
-- Por ley colombiana (Art. 127 CST), horas extra y recargos SIEMPRE son constitutivos de salario.

UPDATE payroll_novedades
SET constitutivo_salario = true, updated_at = NOW()
WHERE tipo_novedad IN ('horas_extra', 'recargo_nocturno', 'recargo_dominical')
  AND constitutivo_salario = false;
