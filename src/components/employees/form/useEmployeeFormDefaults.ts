
import { EmployeeFormData } from './types';

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
