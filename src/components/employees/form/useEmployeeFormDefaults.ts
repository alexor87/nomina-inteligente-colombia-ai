
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeFormData } from './types';

export const getEmployeeFormDefaults = (employee?: EmployeeUnified): Partial<EmployeeFormData> => {
  const baseDefaults: Partial<EmployeeFormData> = {
    // Información Personal
    cedula: employee?.cedula || '',
    tipoDocumento: employee?.tipoDocumento || 'CC',
    nombre: employee?.nombre || '',
    segundoNombre: employee?.segundoNombre || '',
    apellido: employee?.apellido || '',
    email: employee?.email || '',
    telefono: employee?.telefono || '',
    sexo: employee?.sexo || 'M',
    fechaNacimiento: employee?.fechaNacimiento || '',
    direccion: employee?.direccion || '',
    ciudad: employee?.ciudad || '',
    departamento: employee?.departamento || '',
    
    // Información Laboral
    salarioBase: employee?.salarioBase || 0,
    tipoContrato: employee?.tipoContrato || 'indefinido',
    fechaIngreso: employee?.fechaIngreso || new Date().toISOString().split('T')[0],
    periodicidadPago: (employee?.periodicidadPago === 'quincenal' ? 'quincenal' : 'mensual') as 'quincenal' | 'mensual',
    cargo: employee?.cargo || '',
    codigoCIIU: employee?.codigoCIIU || '',
    nivelRiesgoARL: employee?.nivelRiesgoARL || 'I',
    estado: employee?.estado || 'activo',
    centroCostos: employee?.centroCostos || '',
    fechaFirmaContrato: employee?.fechaFirmaContrato || '',
    fechaFinalizacionContrato: employee?.fechaFinalizacionContrato || '',
    tipoJornada: employee?.tipoJornada || 'completa',
    diasTrabajo: employee?.diasTrabajo || 30,
    horasTrabajo: employee?.horasTrabajo || 8,
    beneficiosExtralegales: employee?.beneficiosExtralegales || false,
    clausulasEspeciales: employee?.clausulasEspeciales || '',
    
    // Información Bancaria
    banco: employee?.banco || '',
    tipoCuenta: employee?.tipoCuenta || 'ahorros',
    numeroCuenta: employee?.numeroCuenta || '',
    titularCuenta: employee?.titularCuenta || '',
    formaPago: employee?.formaPago || 'dispersion',
    
    // Afiliaciones
    eps: employee?.eps || '',
    afp: employee?.afp || '',
    arl: employee?.arl || '',
    cajaCompensacion: employee?.cajaCompensacion || '',
    tipoCotizanteId: employee?.tipoCotizanteId || '',
    subtipoCotizanteId: employee?.subtipoCotizanteId || '',
    regimenSalud: employee?.regimenSalud || 'contributivo',
    estadoAfiliacion: employee?.estadoAfiliacion || 'pendiente',
    
    // Campos Personalizados
    custom_fields: employee?.custom_fields || {}
  };

  return baseDefaults;
};
