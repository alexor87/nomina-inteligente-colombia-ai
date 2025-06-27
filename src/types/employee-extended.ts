
import { Employee } from '@/types';

export interface EmployeeWithStatus extends Omit<Employee, 'periodicidadPago'> {
  periodicidadPago: 'quincenal' | 'mensual';
  // Propiedades adicionales para indicadores de compliance
  complianceStatus?: {
    documentos: 'completo' | 'incompleto' | 'pendiente';
    afiliaciones: 'completo' | 'incompleto' | 'pendiente';
    contractual: 'completo' | 'incompleto' | 'pendiente';
  };
}

export interface EmployeeComplianceIndicators {
  documentos: 'completo' | 'incompleto' | 'pendiente';
  afiliaciones: 'completo' | 'incompleto' | 'pendiente';
  contractual: 'completo' | 'incompleto' | 'pendiente';
}

export interface EmployeeListFilters {
  searchTerm: string;
  estado: string;
  tipoContrato: string;
  cargo: string;
  eps: string;
  afp: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

export interface EmployeePagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  offset: number;
}
