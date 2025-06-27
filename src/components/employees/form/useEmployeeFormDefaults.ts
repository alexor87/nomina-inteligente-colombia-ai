
const SALARIO_MINIMO_2025 = 1300000;

export const getEmployeeFormDefaults = () => ({
  // Información Personal
  cedula: '',
  tipoDocumento: 'CC' as const,
  nombre: '',
  segundoNombre: '',
  apellido: '',
  email: '',
  telefono: '',
  sexo: 'M' as const,
  fechaNacimiento: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  
  // Información Laboral
  salarioBase: SALARIO_MINIMO_2025,
  tipoContrato: 'indefinido' as const,
  fechaIngreso: new Date().toISOString().split('T')[0],
  periodicidadPago: 'mensual' as const,
  cargo: '',
  codigoCIIU: '',
  nivelRiesgoARL: 'I' as const,
  estado: 'activo' as const,
  centroCostos: '',
  
  // Detalles del Contrato
  fechaFirmaContrato: '',
  fechaFinalizacionContrato: '',
  tipoJornada: 'completa' as const,
  diasTrabajo: 30,
  horasTrabajo: 8,
  beneficiosExtralegales: false,
  clausulasEspeciales: '',
  
  // Información Bancaria
  banco: '',
  tipoCuenta: 'ahorros' as const,
  numeroCuenta: '',
  titularCuenta: '',
  formaPago: 'dispersion' as const,
  
  // Afiliaciones
  eps: '',
  afp: '',
  arl: '',
  cajaCompensacion: '',
  tipoCotizanteId: '',
  subtipoCotizanteId: '',
  regimenSalud: 'contributivo' as const,
  estadoAfiliacion: 'pendiente' as const
});
