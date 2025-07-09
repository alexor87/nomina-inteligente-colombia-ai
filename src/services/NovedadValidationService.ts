
import { NovedadType } from '@/types/novedades-enhanced';

export class NovedadValidationService {
  
  static validateNovedadData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!data.tipo_novedad) {
      errors.push('Tipo de novedad es requerido');
    }

    if (!data.valor || data.valor <= 0) {
      errors.push('El valor debe ser mayor a 0');
    }

    if (!data.empleado_id) {
      errors.push('ID de empleado es requerido');
    }

    if (!data.periodo_id) {
      errors.push('ID de período es requerido');
    }

    // ✅ SIMPLIFIED: Only validate known types
    const validTypes: NovedadType[] = [
      'horas_extra', 'recargo_nocturno', 'bonificacion', 'comision', 'prima', 'otros_ingresos',
      'vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada',
      'salud', 'pension', 'retencion_fuente', 'fondo_solidaridad', 'ausencia',
      'libranza', 'multa', 'descuento_voluntario'
    ];

    if (data.tipo_novedad && !validTypes.includes(data.tipo_novedad)) {
      errors.push(`Tipo de novedad no válido: ${data.tipo_novedad}`);
    }

    // Type-specific validations
    const tiposRequierenHoras: NovedadType[] = ['horas_extra', 'recargo_nocturno'];
    if (tiposRequierenHoras.includes(data.tipo_novedad) && (!data.horas || data.horas <= 0)) {
      errors.push('Las horas son requeridas para este tipo de novedad');
    }

    const tiposRequierenDias: NovedadType[] = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'];
    if (tiposRequierenDias.includes(data.tipo_novedad) && (!data.dias || data.dias <= 0)) {
      errors.push('Los días son requeridos para este tipo de novedad');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateForSave(data: any): { canSave: boolean; errors: string[] } {
    const validation = this.validateNovedadData(data);
    
    // Additional save validations
    if (!data.company_id) {
      validation.errors.push('ID de empresa es requerido');
    }

    return {
      canSave: validation.errors.length === 0,
      errors: validation.errors
    };
  }
}
