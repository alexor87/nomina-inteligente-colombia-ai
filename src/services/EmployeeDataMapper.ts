
import { ValidatedEmployeeData } from '@/schemas/employeeValidation';
import { Employee } from '@/types';

export class EmployeeDataMapper {
  /**
   * Maps form data to database format with comprehensive validation
   */
  static mapFormToDatabase(formData: ValidatedEmployeeData, companyId: string): any {
    console.log('🔄 EmployeeDataMapper: Mapping form data to database format');
    console.log('📋 Form data received:', formData);
    
    // Helper function to clean text fields
    const cleanTextField = (value: any): string | null => {
      if (value === '' || value === undefined || value === null) return null;
      const cleaned = String(value).trim();
      return cleaned === '' ? null : cleaned;
    };

    // Helper function to clean date fields
    const cleanDateField = (value: any): string | null => {
      if (!value || value === '') return null;
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        console.warn('⚠️  Invalid date format, setting to null:', value);
        return null;
      }
      return value;
    };

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
      segundo_nombre: cleanTextField(formData.segundoNombre),
      email: cleanTextField(formData.email),
      telefono: cleanTextField(formData.telefono),
      sexo: formData.sexo || null,
      fecha_nacimiento: cleanDateField(formData.fechaNacimiento),
      direccion: cleanTextField(formData.direccion),
      ciudad: cleanTextField(formData.ciudad),
      departamento: cleanTextField(formData.departamento),

      // Optional labor information
      cargo: cleanTextField(formData.cargo),
      codigo_ciiu: cleanTextField(formData.codigoCIIU),
      nivel_riesgo_arl: formData.nivelRiesgoARL || null,
      centro_costos: cleanTextField(formData.centroCostos),

      // Contract details
      fecha_firma_contrato: cleanDateField(formData.fechaFirmaContrato),
      fecha_finalizacion_contrato: cleanDateField(formData.fechaFinalizacionContrato),
      tipo_jornada: formData.tipoJornada || 'completa',
      dias_trabajo: Number(formData.diasTrabajo) || 30,
      horas_trabajo: Number(formData.horasTrabajo) || 8,
      beneficios_extralegales: Boolean(formData.beneficiosExtralegales),
      clausulas_especiales: cleanTextField(formData.clausulasEspeciales),

      // Banking information
      banco: cleanTextField(formData.banco),
      tipo_cuenta: formData.tipoCuenta || 'ahorros',
      numero_cuenta: cleanTextField(formData.numeroCuenta),
      titular_cuenta: cleanTextField(formData.titularCuenta),
      forma_pago: formData.formaPago || 'dispersion',

      // Affiliations
      eps: cleanTextField(formData.eps),
      afp: cleanTextField(formData.afp),
      arl: cleanTextField(formData.arl),
      caja_compensacion: cleanTextField(formData.cajaCompensacion),
      tipo_cotizante_id: cleanTextField(formData.tipoCotizanteId),
      subtipo_cotizante_id: cleanTextField(formData.subtipoCotizanteId),
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
   * Validates required fields for employee creation
   */
  static validateRequiredFields(data: any): { isValid: boolean; errors: string[] } {
    console.log('🔍 EmployeeDataMapper: Validating required fields');
    
    const errors: string[] = [];
    const requiredFields = [
      { field: 'cedula', message: 'El número de documento es requerido' },
      { field: 'nombre', message: 'El nombre es requerido' },
      { field: 'apellido', message: 'El apellido es requerido' },
      { field: 'salarioBase', message: 'El salario base es requerido' },
      { field: 'fechaIngreso', message: 'La fecha de ingreso es requerida' }
    ];

    requiredFields.forEach(({ field, message }) => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(message);
      }
    });

    // Validate salary minimum
    if (data.salarioBase && Number(data.salarioBase) < 1300000) {
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
   * Logs data for debugging purposes
   */
  static debugLogData(stage: string, data: any): void {
    console.group(`🐛 Debug - ${stage}`);
    console.log('Data type:', typeof data);
    console.log('Data keys:', Object.keys(data || {}));
    console.log('Full data:', data);
    console.groupEnd();
  }
}
