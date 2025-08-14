import { EmployeeWithStatus, EmployeeFilters } from '@/types/employee-extended';

export const filterEmployees = (employees: EmployeeWithStatus[], filters: EmployeeFilters): EmployeeWithStatus[] => {
  return employees.filter(employee => {
    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const fullName = `${employee.nombre} ${employee.apellido}`.toLowerCase();
      const matchesName = fullName.includes(searchLower);
      const matchesCedula = employee.cedula.includes(searchLower);
      const matchesEmail = employee.email?.toLowerCase().includes(searchLower) || false;
      
      if (!matchesName && !matchesCedula && !matchesEmail) {
        return false;
      }
    }

    // Status filter
    if (filters.estado && employee.estado !== filters.estado) {
      return false;
    }

    // Contract type filter
    if (filters.tipoContrato && employee.tipoContrato !== filters.tipoContrato) {
      return false;
    }

    // Cost center filter
    if (filters.centroCosto && 
        (employee.centroCostos || employee.centrosocial || '') !== filters.centroCosto) {
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
