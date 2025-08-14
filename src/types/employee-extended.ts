import { EmployeeUnified } from './employee-unified';

export interface EmployeeWithStatus extends EmployeeUnified {
  // Additional properties for UI display
  avatar?: string;
  centrosocial?: string; // Alternative name for centroCostos
  ultimaLiquidacion?: string;
  contratoVencimiento?: string;
  company_id: string; // Ensure this is always present
}

export const ESTADOS_EMPLEADO = [
  { value: 'activo', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'inactivo', label: 'Inactivo', color: 'bg-red-100 text-red-800' },
  { value: 'vacaciones', label: 'En Vacaciones', color: 'bg-blue-100 text-blue-800' },
  { value: 'incapacidad', label: 'Incapacitado', color: 'bg-purple-100 text-purple-800' },
  { value: 'eliminado', label: 'Eliminado', color: 'bg-gray-100 text-gray-800' },
];
