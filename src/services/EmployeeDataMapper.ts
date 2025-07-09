import { ValidatedEmployeeData } from '@/schemas/employeeValidation';
import { Employee } from '@/types';

export class EmployeeDataMapper {
  /**
   * Helper function to clean date fields - KISS approach
   */
  private static cleanDateValue(value: any): string | null {
    if (!value || value === '' || value === undefined || value === null) {
      return null;
    }
    return String(value);
  }

  /**
   * Helper function to clean text fields
   */
  private static cleanTextField(value: any): string | null {
    if (value === '' || value === undefined || value === null) return null;
    const cleaned = String(value).trim();
    return cleaned === '' ? null : cleaned;
  }

  /**
   * Maps form data to database format with comprehensive validation
   */
  static mapFormToDatabase(formData: ValidatedEmployeeData, companyId: string): any {
    console.log('🔄 EmployeeDataMapper: Mapping form data to database format');
    console.log('📋 Form data received:', formData);

    const mappedData = {
      // Required fields
      company_id: companyId,
      cedula: formData.cedula,
      tipo_documento: formData.tipoDocumento,
      nombre: formData.nombre,
      apellido: formData.apellido,
      salario_base: Number(formData.salarioBase),
      tipo_contrato: formData.tipoContrato,
      fecha_ingreso: formData.fechaIngreso,
      periodicidad_pago: formData.periodicidadPago,
      estado: formData.estado || 'activo',

      // Optional personal information
      segundo_nombre: this.cleanTextField(formData.segundoNombre),
      email: this.cleanTextField(formData.email),
      telefono: this.cleanTextField(formData.telefono),
      sexo: formData.sexo || null,
      fecha_nacimiento: this.cleanDateValue(formData.fechaNacimiento),
      direccion: this.cleanTextField(formData.direccion),
      ciudad: this.cleanTextField(formData.ciudad),
      departamento: this.cleanTextField(formData.departamento),

      // Optional labor information
      cargo: this.cleanTextField(formData.cargo),
      codigo_ciiu: this.cleanTextField(formData.codigoCIIU),
      nivel_riesgo_arl: formData.nivelRiesgoARL || null,
      centro_costos: this.cleanTextField(formData.centroCostos),

      // Contract details - FIXED: Clean date fields properly
      fecha_firma_contrato: this.cleanDateValue(formData.fechaFirmaContrato),
      fecha_finalizacion_contrato: this.cleanDateValue(formData.fechaFinalizacionContrato),
      tipo_jornada: formData.tipoJornada || 'completa',
      dias_trabajo: Number(formData.diasTrabajo) || 30,
      horas_trabajo: Number(formData.horasTrabajo) || 8,
      beneficios_extralegales: Boolean(formData.beneficiosExtralegales),
      clausulas_especiales: this.cleanTextField(formData.clausulasEspeciales),

      // Banking information
      banco: this.cleanTextField(formData.banco),
      tipo_cuenta: formData.tipoCuenta || 'ahorros',
      numero_cuenta: this.cleanTextField(formData.numeroCuenta),
      titular_cuenta: this.cleanTextField(formData.titularCuenta),
      forma_pago: formData.formaPago || 'dispersion',

      // Affiliations
      eps: this.cleanTextField(formData.eps),
      afp: this.cleanTextField(formData.afp),
      arl: this.cleanTextField(formData.arl),
      caja_compensacion: this.cleanTextField(formData.cajaCompensacion),
      tipo_cotizante_id: this.cleanTextField(formData.tipoCotizanteId),
      subtipo_cotizante_id: this.cleanTextField(formData.subtipoCotizanteId),
      regimen_salud: formData.regimenSalud || 'contributivo',
      estado_afiliacion: formData.estadoAfiliacion || 'pendiente'
    };

    console.log('✅ EmployeeDataMapper: Mapped data successfully');
    console.log('📤 Database data:', mappedData);
    
    return mappedData;
  }

  /**
   * Maps database record to unified Employee format
   */
  static mapDatabaseToEmployee(dbData: any): Employee {
    console.log('🔄 EmployeeDataMapper: Mapping database data to Employee format');
    
    return {
      id: dbData.id,
      cedula: dbData.cedula || '',
      tipoDocumento: dbData.tipo_documento || 'CC',
      nombre: dbData.nombre || '',
      segundoNombre: dbData.segundo_nombre || undefined,
      apellido: dbData.apellido || '',
      email: dbData.email || undefined,
      telefono: dbData.telefono || undefined,
      sexo: dbData.sexo || undefined,
      fechaNacimiento: dbData.fecha_nacimiento || undefined,
      direccion: dbData.direccion || undefined,
      ciudad: dbData.ciudad || undefined,
      departamento: dbData.departamento || undefined,
      empresaId: dbData.company_id,
      company_id: dbData.company_id,
      salarioBase: Number(dbData.salario_base || 0),
      tipoContrato: dbData.tipo_contrato || 'indefinido',
      fechaIngreso: dbData.fecha_ingreso || new Date().toISOString().split('T')[0],
      periodicidadPago: dbData.periodicidad_pago || 'mensual',
      cargo: dbData.cargo || undefined,
      codigoCIIU: dbData.codigo_ciiu || undefined,
      nivelRiesgoARL: dbData.nivel_riesgo_arl || undefined,
      estado: dbData.estado || 'activo',
      centroCostos: dbData.centro_costos || undefined,
      fechaFirmaContrato: dbData.fecha_firma_contrato || undefined,
      fechaFinalizacionContrato: dbData.fecha_finalizacion_contrato || undefined,
      tipoJornada: dbData.tipo_jornada || 'completa',
      diasTrabajo: Number(dbData.dias_trabajo) || 30,
      horasTrabajo: Number(dbData.horas_trabajo) || 8,
      beneficiosExtralegales: Boolean(dbData.beneficios_extralegales),
      clausulasEspeciales: dbData.clausulas_especiales || undefined,
      banco: dbData.banco || undefined,
      tipoCuenta: dbData.tipo_cuenta || 'ahorros',
      numeroCuenta: dbData.numero_cuenta || undefined,
      titularCuenta: dbData.titular_cuenta || undefined,
      formaPago: dbData.forma_pago || 'dispersion',
      eps: dbData.eps || undefined,
      afp: dbData.afp || undefined,
      arl: dbData.arl || undefined,
      cajaCompensacion: dbData.caja_compensacion || undefined,
      tipoCotizanteId: dbData.tipo_cotizante_id || undefined,
      subtipoCotizanteId: dbData.subtipo_cotizante_id || undefined,
      regimenSalud: dbData.regimen_salud || 'contributivo',
      estadoAfiliacion: dbData.estado_afiliacion || 'pendiente',
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  /**
   * Validates required fields for employee creation - UPDATED TO USE SNAKE_CASE
   */
  static validateRequiredFields(data: any): { isValid: boolean; errors: string[] } {
    console.log('🔍 EmployeeDataMapper: Validating required fields (snake_case format)');
    console.log('📊 Data to validate:', data);
    
    const errors: string[] = [];
    
    // Updated to check snake_case field names after mapping
    const requiredFields = [
      { field: 'cedula', message: 'El número de documento es requerido' },
      { field: 'nombre', message: 'El nombre es requerido' },
      { field: 'apellido', message: 'El apellido es requerido' },
      { field: 'salario_base', message: 'El salario base es requerido' }, // Changed from salarioBase
      { field: 'fecha_ingreso', message: 'La fecha de ingreso es requerida' } // Changed from fechaIngreso
    ];

    requiredFields.forEach(({ field, message }) => {
      const value = data[field];
      console.log(`🔍 Checking field '${field}':`, value);
      
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        console.log(`❌ Field '${field}' is missing or empty`);
        errors.push(message);
      } else {
        console.log(`✅ Field '${field}' is valid:`, value);
      }
    });

    // Validate salary minimum (using snake_case field name)
    if (data.salario_base && Number(data.salario_base) < 1300000) {
      errors.push('El salario base no puede ser menor al salario mínimo legal');
    }

    const isValid = errors.length === 0;
    
    if (isValid) {
      console.log('✅ EmployeeDataMapper: All required fields are valid');
    } else {
      console.log('❌ EmployeeDataMapper: Validation errors found:', errors);
    }

    return { isValid, errors };
  }

  /**
   * Enhanced debugging method with detailed field analysis
   */
  static debugLogData(stage: string, data: any): void {
    console.group(`🐛 Debug - ${stage}`);
    console.log('Data type:', typeof data);
    console.log('Data keys:', Object.keys(data || {}));
    
    // Check specific problematic fields
    const criticalFields = ['salarioBase', 'salario_base', 'fechaIngreso', 'fecha_ingreso'];
    criticalFields.forEach(field => {
      if (data && data[field] !== undefined) {
        console.log(`🔍 ${field}:`, data[field], `(type: ${typeof data[field]})`);
      } else {
        console.log(`❌ ${field}: MISSING`);
      }
    });
    
    console.log('Full data:', data);
    console.groupEnd();
  }
}
