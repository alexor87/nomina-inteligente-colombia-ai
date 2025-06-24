
import { EmployeeWithStatus, EmployeeFilters } from '@/types/employee-extended';

export const filterEmployees = (employees: EmployeeWithStatus[], filters: EmployeeFilters): EmployeeWithStatus[] => {
  return employees.filter(employee => {
    // Búsqueda por texto
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesSearch = 
        employee.nombre.toLowerCase().includes(searchLower) ||
        employee.apellido.toLowerCase().includes(searchLower) ||
        employee.cedula.includes(filters.searchTerm) ||
        employee.email.toLowerCase().includes(searchLower) ||
        employee.cargo?.toLowerCase().includes(searchLower) ||
        employee.centrosocial?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Filtro por estado
    if (filters.estado && employee.estado !== filters.estado) {
      return false;
    }

    // Filtro por tipo de contrato
    if (filters.tipoContrato && employee.tipoContrato !== filters.tipoContrato) {
      return false;
    }

    // Filtro por centro de costo
    if (filters.centroCosto && employee.centrosocial !== filters.centroCosto) {
      return false;
    }

    // Filtro por nivel de riesgo ARL
    if (filters.nivelRiesgoARL && employee.nivelRiesgoARL !== filters.nivelRiesgoARL) {
      return false;
    }

    // Filtro por afiliación incompleta
    if (filters.afiliacionIncompleta !== undefined) {
      const hasIncompleteAffiliation = employee.estadoAfiliacion !== 'completa';
      if (filters.afiliacionIncompleta !== hasIncompleteAffiliation) {
        return false;
      }
    }

    // Filtro por rango de fechas de ingreso
    if (filters.fechaIngresoInicio) {
      if (new Date(employee.fechaIngreso) < new Date(filters.fechaIngresoInicio)) {
        return false;
      }
    }

    if (filters.fechaIngresoFin) {
      if (new Date(employee.fechaIngreso) > new Date(filters.fechaIngresoFin)) {
        return false;
      }
    }

    return true;
  });
};
