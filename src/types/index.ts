export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data?: T[];
  error?: string;
  total?: number;
}

export interface Company {
  id: string;
  name: string;
  legalId: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  industry: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  companyId?: string;
  role: 'admin' | 'employee';
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  empresaId: string;
  cedula: string;
  tipoDocumento?: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: 'M' | 'F';
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  salarioBase: number;
  tipoSalario?: 'mensual' | 'integral' | 'medio_tiempo'; // ✅ ADDED: Include tipoSalario
  tipoContrato?: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago?: 'mensual' | 'quincenal';
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V';
  estado?: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad' | 'eliminado';
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada?: 'completa' | 'parcial' | 'horas';
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago?: 'dispersion' | 'manual';
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud?: 'contributivo' | 'subsidiado';
  estadoAfiliacion?: 'completa' | 'pendiente' | 'inconsistente';
  createdAt?: string;
  updatedAt?: string;
}

export interface Novedad {
  id: string;
  empleado_id: string;
  tipo_novedad: string;
  fecha_inicio: string;
  fecha_fin?: string;
  valor?: number;
  descripcion?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Nomina {
  id: string;
  empresa_id: string;
  periodo_inicio: string;
  periodo_fin: string;
  fecha_generacion: string;
  estado: 'pendiente' | 'procesada' | 'aprobada' | 'pagada';
  total_devengado: number;
  total_deducciones: number;
  total_pagado: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NominaEmpleado {
  id: string;
  nomina_id: string;
  empleado_id: string;
  devengado: number;
  deducciones: number;
  neto_pagado: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Configuration {
  id: string;
  year: string;
  salarioMinimo: number;
  auxilioTransporte: number;
  uvt: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SecureAuditLog {
  id: string;
  company_id: string;
  table_name: string;
  operation_type: string;
  details: string;
  user_id: string;
  timestamp: string;
}
