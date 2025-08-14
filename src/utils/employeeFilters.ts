
import { EmployeeWithStatus, EmployeeFilters } from '@/types/employee-extended';

export const filterEmployees = (employees: EmployeeWithStatus[], filters: EmployeeFilters): EmployeeWithStatus[] => {
  return employees.filter(employee => {
    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesSearch = 
        employee.nombre.toLowerCase().includes(searchLower) ||
        employee.apellido.toLowerCase().includes(searchLower) ||
        employee.cedula.includes(searchLower) ||
        (employee.email && employee.email.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Estado filter
    if (filters.estado && employee.estado !== filters.estado) {
      return false;
    }

    // Tipo contrato filter
    if (filters.tipoContrato && employee.tipoContrato !== filters.tipoContrato) {
      return false;
    }

    // Centro costo filter
    if (filters.centroCosto) {
      const centroCosto = employee.centroCostos || employee.centrosocial || '';
      if (centroCosto !== filters.centroCosto) {
        return false;
      }
    }

    // Fecha ingreso filters
    if (filters.fechaIngresoInicio && employee.fechaIngreso < filters.fechaIngresoInicio) {
      return false;
    }

    if (filters.fechaIngresoFin && employee.fechaIngreso > filters.fechaIngresoFin) {
      return false;
    }

    // Nivel riesgo ARL filter
    if (filters.nivelRiesgoARL && employee.nivelRiesgoARL !== filters.nivelRiesgoARL) {
      return false;
    }

    // Afiliación incompleta filter
    if (filters.afiliacionIncompleta !== undefined) {
      const isIncomplete = employee.estadoAfiliacion !== 'completa';
      if (filters.afiliacionIncompleta !== isIncomplete) {
        return false;
      }
    }

    return true;
  });
};
