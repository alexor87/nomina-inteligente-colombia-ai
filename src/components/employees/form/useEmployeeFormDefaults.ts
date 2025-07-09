
import { EmployeeFormData } from './types';
import { EmployeeUnified } from '@/types/employee-unified';

export const getEmployeeFormDefaults = (): Partial<EmployeeFormData> => {
  return {
    // Información personal
    tipoDocumento: 'CC',
    nombre: '',
    segundoNombre: '',
    apellido: '',
    email: '',
    telefono: '',
    sexo: 'M',
    fechaNacimiento: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    
    // Información laboral
    salarioBase: 0,
    tipoContrato: 'indefinido',
    fechaIngreso: new Date().toISOString().split('T')[0],
    periodicidadPago: 'mensual',
    cargo: '',
    codigoCIIU: '',
    nivelRiesgoARL: 'I',
    estado: 'activo',
    centroCostos: '',
    fechaFirmaContrato: '',
    fechaFinalizacionContrato: '',
    tipoJornada: 'completa',
    diasTrabajo: 30,
    horasTrabajo: 8,
    beneficiosExtralegales: false,
    clausulasEspeciales: '',
    
    // Información bancaria
    banco: '',
    tipoCuenta: 'ahorros',
    numeroCuenta: '',
    titularCuenta: '',
    formaPago: 'dispersion',
    
    // Afiliaciones
    eps: '',
    afp: '',
    arl: '',
    cajaCompensacion: '',
    tipoCotizanteId: '',
    subtipoCotizanteId: '',
    regimenSalud: 'contributivo',
    estadoAfiliacion: 'pendiente',
    
    // Campos personalizados
    custom_fields: {},
    
    // ✅ NUEVO: Vacaciones iniciales (Fase 1 - KISS)
    hasAccumulatedVacations: false,
    initialVacationDays: 0
  };
};

// ✅ NUEVO: Función para poblar formulario con datos de empleado existente
export const populateFormWithEmployee = (employee: EmployeeUnified): EmployeeFormData => {
  console.log('🔄 populateFormWithEmployee: Mapping employee data to form format');
  
  return {
    // Información personal
    tipoDocumento: employee.tipoDocumento || 'CC',
    cedula: employee.cedula || '',
    nombre: employee.nombre || '',
    segundoNombre: employee.segundoNombre || '',
    apellido: employee.apellido || '',
    email: employee.email || '',
    telefono: employee.telefono || '',
    sexo: employee.sexo || 'M',
    fechaNacimiento: employee.fechaNacimiento || '',
    direccion: employee.direccion || '',
    ciudad: employee.ciudad || '',
    departamento: employee.departamento || '',
    
    // Información laboral
    salarioBase: employee.salarioBase || 0,
    tipoContrato: employee.tipoContrato || 'indefinido',
    fechaIngreso: employee.fechaIngreso || new Date().toISOString().split('T')[0],
    periodicidadPago: employee.periodicidadPago || 'mensual',
    cargo: employee.cargo || '',
    codigoCIIU: employee.codigoCIIU || '',
    nivelRiesgoARL: employee.nivelRiesgoARL || 'I',
    estado: employee.estado || 'activo',
    centroCostos: employee.centroCostos || '',
    fechaFirmaContrato: employee.fechaFirmaContrato || '',
    fechaFinalizacionContrato: employee.fechaFinalizacionContrato || '',
    tipoJornada: employee.tipoJornada || 'completa',
    diasTrabajo: employee.diasTrabajo || 30,
    horasTrabajo: employee.horasTrabajo || 8,
    beneficiosExtralegales: employee.beneficiosExtralegales || false,
    clausulasEspeciales: employee.clausulasEspeciales || '',
    
    // Información bancaria
    banco: employee.banco || '',
    tipoCuenta: employee.tipoCuenta || 'ahorros',
    numeroCuenta: employee.numeroCuenta || '',
    titularCuenta: employee.titularCuenta || '',
    formaPago: employee.formaPago || 'dispersion',
    
    // Afiliaciones
    eps: employee.eps || '',
    afp: employee.afp || '',
    arl: employee.arl || '',
    cajaCompensacion: employee.cajaCompensacion || '',
    tipoCotizanteId: employee.tipoCotizanteId || '',
    subtipoCotizanteId: employee.subtipoCotizanteId || '',
    regimenSalud: employee.regimenSalud || 'contributivo',
    estadoAfiliacion: employee.estadoAfiliacion || 'pendiente',
    empresaId: employee.empresaId || employee.company_id || '',
    
    // Campos personalizados
    custom_fields: employee.custom_fields || {},
    
    // ✅ NUEVO: Vacaciones iniciales (Fase 1 - KISS)
    // Por ahora defaultear a false ya que es información nueva
    hasAccumulatedVacations: false,
    initialVacationDays: 0
  };
};
