
import { EmployeeFormData } from './types';
import { EmployeeUnified } from '@/types/employee-unified';

export const useEmployeeFormDefaults = (employee?: EmployeeUnified | null): EmployeeFormData => {
  return {
    id: employee?.id,
    cedula: employee?.cedula || '',
    tipoDocumento: employee?.tipoDocumento || 'CC',
    nombre: employee?.nombre || '',
    segundoNombre: employee?.segundoNombre || '',
    apellido: employee?.apellido || '',
    email: employee?.email || '',
    telefono: employee?.telefono || '',
    sexo: employee?.sexo === 'O' ? undefined : employee?.sexo, // ✅ FIXED: Handle 'O' gracefully
    fechaNacimiento: employee?.fechaNacimiento || '',
    direccion: employee?.direccion || '',
    ciudad: employee?.ciudad || '',
    departamento: employee?.departamento || '',
    salarioBase: employee?.salarioBase || 0,
    tipoContrato: employee?.tipoContrato || 'indefinido',
    fechaIngreso: employee?.fechaIngreso || new Date().toISOString().split('T')[0],
    periodicidadPago: employee?.periodicidadPago || 'mensual',
    cargo: employee?.cargo || '',
    codigo_ciiu: employee?.codigoCIIU || '',
    nivelRiesgoARL: employee?.nivelRiesgoARL || 'I',
    estado: employee?.estado || 'activo',
    centroCostos: employee?.centroCostos || '',
    fechaFirmaContrato: employee?.fechaFirmaContrato || '',
    fechaFinalizacionContrato: employee?.fechaFinalizacionContrato || '',
    tipoJornada: employee?.tipoJornada || 'completa', // ✅ DEFAULT VALUE
    diasTrabajo: employee?.diasTrabajo || 30,
    horasTrabajo: employee?.horasTrabajo || 8,
    beneficiosExtralegales: employee?.beneficiosExtralegales || false,
    clausulasEspeciales: employee?.clausulasEspeciales || '',
    banco: employee?.banco || '',
    tipoCuenta: employee?.tipoCuenta || 'ahorros',
    numeroCuenta: employee?.numeroCuenta || '',
    titularCuenta: employee?.titularCuenta || '',
    formaPago: employee?.formaPago || 'dispersion',
    eps: employee?.eps || '',
    afp: employee?.afp || '',
    arl: employee?.arl || '',
    cajaCompensacion: employee?.cajaCompensacion || '',
    tipoCotizanteId: employee?.tipoCotizanteId || '',
    subtipoCotizanteId: employee?.subtipoCotizanteId || '',
    regimenSalud: employee?.regimenSalud || 'contributivo',
    estadoAfiliacion: employee?.estadoAfiliacion || 'pendiente',
    custom_fields: employee?.custom_fields || {}
  };
};
