export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  industry?: string;
  employees?: Employee[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email: string;
  telefono?: string;
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  cargo?: string;
  empresaId: string;
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V';
  createdAt: string;
  updatedAt: string;
  // Banking information
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  // Additional fields for compatibility
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}
