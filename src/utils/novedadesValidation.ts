
import { NOVEDAD_CATEGORIES } from '@/types/novedades-enhanced';
import { NovedadType } from '@/types/novedades-enhanced';

/**
 * ✅ VALIDACIONES NORMATIVAS ACTUALIZADAS PARA NOVEDADES E IBC
 * Según normativa laboral colombiana - CORREGIDO para horas extra y recargos
 */

export interface NovedadValidationResult {
  isValid: boolean;
  warnings: string[];
  constitutivo: boolean;
  normativeReason: string;
}

/**
 * Valida si una novedad está correctamente configurada según normas laborales
 * ✅ CORREGIDO: Horas extra y recargos SÍ afectan IBC
 */
export const validateNovedadConstitutividad = (
  tipoNovedad: NovedadType,
  constitutivo: boolean,
  subtipo?: string
): NovedadValidationResult => {
  const warnings: string[] = [];
  let normativeReason = '';
  
  // Buscar configuración normativa
  const categoria = Object.entries(NOVEDAD_CATEGORIES.devengados.types).find(
    ([key]) => key === tipoNovedad
  );

  const defaultConstitutivo = categoria?.[1].constitutivo_default ?? false;
  normativeReason = getNormativeReason(tipoNovedad);

  // ✅ CORREGIDO: Verificar inconsistencias normativas críticas
  if (tipoNovedad === 'horas_extra' && !constitutivo) {
    warnings.push('⚠️ ADVERTENCIA: Las horas extra SÍ son constitutivas de IBC según Art. 127 CST - se recomienda marcar como constitutiva');
  }

  if (tipoNovedad === 'recargo_nocturno' && !constitutivo) {
    warnings.push('⚠️ ADVERTENCIA: Los recargos nocturnos SÍ son constitutivos de IBC según Art. 127 CST - se recomienda marcar como constitutiva');
  }

  if (tipoNovedad === 'incapacidad' && constitutivo) {
    warnings.push('❌ ERROR: Las incapacidades NUNCA son constitutivas de salario según Decreto 1281/94');
  }

  if ((tipoNovedad === 'comision' || tipoNovedad === 'prima') && !constitutivo) {
    warnings.push('⚠️ ADVERTENCIA: Las comisiones y primas extralegales generalmente SÍ son constitutivas de salario');
  }

  return {
    isValid: warnings.filter(w => w.includes('ERROR')).length === 0,
    warnings,
    constitutivo: defaultConstitutivo,
    normativeReason
  };
};

/**
 * Obtiene la razón normativa para la constitutividad
 * ✅ CORREGIDO: Actualizado para horas extra y recargos
 */
const getNormativeReason = (tipoNovedad: NovedadType): string => {
  switch (tipoNovedad) {
    case 'horas_extra':
      return 'Art. 127 CST: Horas extra son factor variable que SÍ integra la base para aportes y prestaciones';
    case 'recargo_nocturno':
      return 'Art. 127 CST: Recargos por horario nocturno SÍ integran el IBC para seguridad social';
    case 'incapacidad':
      return 'Decreto 1281/94: Incapacidades son prestaciones asistenciales, no salariales';
    case 'comision':
      return 'Art. 127 CST: Comisiones habituales integran salario para prestaciones';
    case 'prima':
      return 'Art. 127 CST: Primas extralegales habituales son constitutivas';
    case 'vacaciones':
      return 'Art. 189 CST: Vacaciones son parte del salario para efectos prestacionales';
    case 'licencia_remunerada':
      return 'Art. 57 CST: Licencias remuneradas mantienen integralidad salarial';
    case 'bonificacion':
      return 'Depende de habitualidad según Art. 127 CST (usuario debe evaluar)';
    default:
      return 'Evaluación caso por caso según características específicas';
  }
};

/**
 * Calcula el impacto en IBC de las novedades
 */
export const calculateIBCImpact = (
  salarioBase: number,
  novedades: Array<{tipo_novedad: string, valor: number, constitutivo_salario: boolean}>
): {
  ibcOriginal: number;
  ibcConNovedades: number;
  impacto: number;
  novedadesConstitutivas: number;
} => {
  const novedadesConstitutivas = novedades
    .filter(n => n.constitutivo_salario)
    .reduce((sum, n) => sum + n.valor, 0);

  return {
    ibcOriginal: salarioBase,
    ibcConNovedades: salarioBase + novedadesConstitutivas,
    impacto: novedadesConstitutivas,
    novedadesConstitutivas
  };
};
