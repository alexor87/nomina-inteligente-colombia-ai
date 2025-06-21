
import { useState, useMemo } from 'react';
import { EmployeeWithStatus, EmployeeFilters, ComplianceIndicator } from '@/types/employee-extended';
import { Employee } from '@/types';

// Datos mock extendidos para el listado
const mockEmployeesExtended: EmployeeWithStatus[] = [
  {
    id: '1',
    cedula: '12345678',
    nombre: 'María',
    apellido: 'García',
    email: 'maria.garcia@email.com',
    salarioBase: 2500000,
    tipoContrato: 'indefinido',
    fechaIngreso: '2023-06-15',
    estado: 'activo',
    eps: 'Sura EPS',
    afp: 'Porvenir',
    arl: 'Sura ARL',
    cajaCompensacion: 'Compensar',
    cargo: 'Desarrolladora Senior',
    empresaId: '1',
    createdAt: '2023-06-15',
    updatedAt: '2024-01-15',
    centrosocial: 'Tecnología',
    nivelRiesgoARL: 'II',
    estadoAfiliacion: 'completa',
    ultimaLiquidacion: '2024-01-15',
    fechaUltimaModificacion: '2024-01-15',
    usuarioUltimaModificacion: 'Admin Usuario'
  },
  {
    id: '2',
    cedula: '23456789',
    nombre: 'Carlos',
    apellido: 'López',
    email: 'carlos.lopez@email.com',
    salarioBase: 1800000,
    tipoContrato: 'fijo',
    fechaIngreso: '2024-01-12',
    estado: 'activo',
    eps: 'Sanitas EPS',
    afp: 'Colfondos',
    arl: 'Colpatria ARL',
    cajaCompensacion: 'Colsubsidio',
    cargo: 'Contador',
    empresaId: '1',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-15',
    centrosocial: 'Contabilidad',
    nivelRiesgoARL: 'I',
    estadoAfiliacion: 'pendiente',
    ultimaLiquidacion: '2024-01-12',
    contratoVencimiento: '2024-06-12',
    fechaUltimaModificacion: '2024-01-15',
    usuarioUltimaModificacion: 'Admin Usuario'
  },
  {
    id: '3',
    cedula: '34567890',
    nombre: 'Ana',
    apellido: 'Rodríguez',
    email: 'ana.rodriguez@email.com',
    salarioBase: 3200000,
    tipoContrato: 'indefinido',
    fechaIngreso: '2022-03-20',
    estado: 'vacaciones',
    eps: '',
    afp: 'Protección',
    arl: 'Sura ARL',
    cajaCompensacion: 'Compensar',
    cargo: 'Gerente Comercial',
    empresaId: '1',
    createdAt: '2022-03-20',
    updatedAt: '2024-01-10',
    centrosocial: 'Comercial',
    nivelRiesgoARL: 'III',
    estadoAfiliacion: 'inconsistente',
    ultimaLiquidacion: '2024-01-10',
    fechaUltimaModificacion: '2024-01-10',
    usuarioUltimaModificacion: 'HR Manager'
  }
];

export const useEmployeeList = () => {
  const [employees] = useState<EmployeeWithStatus[]>(mockEmployeesExtended);
  const [filters, setFilters] = useState<EmployeeFilters>({
    searchTerm: '',
    estado: '',
    tipoContrato: '',
    centroCosto: '',
    fechaIngresoInicio: '',
    fechaIngresoFin: '',
    nivelRiesgoARL: '',
    afiliacionIncompleta: undefined
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const filteredEmployees = useMemo(() => {
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
  }, [employees, filters]);

  const getComplianceIndicators = (employee: EmployeeWithStatus): ComplianceIndicator[] => {
    const indicators: ComplianceIndicator[] = [];

    // Verificar EPS
    if (!employee.eps) {
      indicators.push({
        type: 'eps',
        status: 'pendiente',
        message: 'Falta afiliación a EPS'
      });
    }

    // Verificar AFP
    if (!employee.afp) {
      indicators.push({
        type: 'pension',
        status: 'pendiente',
        message: 'Falta afiliación a fondo de pensiones'
      });
    }

    // Verificar nivel de riesgo ARL
    if (!employee.nivelRiesgoARL) {
      indicators.push({
        type: 'arl',
        status: 'pendiente',
        message: 'Falta asignar nivel de riesgo ARL'
      });
    }

    // Verificar vencimiento de contrato
    if (employee.contratoVencimiento) {
      const vencimiento = new Date(employee.contratoVencimiento);
      const hoy = new Date();
      const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
      
      if (diasRestantes <= 0) {
        indicators.push({
          type: 'contrato',
          status: 'vencido',
          message: 'Contrato vencido'
        });
      } else if (diasRestantes <= 30) {
        indicators.push({
          type: 'contrato',
          status: 'pendiente',
          message: `Contrato vence en ${diasRestantes} días`
        });
      }
    }

    return indicators;
  };

  const updateFilters = (newFilters: Partial<EmployeeFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      estado: '',
      tipoContrato: '',
      centroCosto: '',
      fechaIngresoInicio: '',
      fechaIngresoFin: '',
      nivelRiesgoARL: '',
      afiliacionIncompleta: undefined
    });
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    }
  };

  const bulkUpdateStatus = (newStatus: string) => {
    console.log(`Actualizando estado de ${selectedEmployees.length} empleados a: ${newStatus}`);
    // Aquí iría la lógica para actualizar en Supabase
    setSelectedEmployees([]);
  };

  const exportEmployees = (format: 'excel' | 'pdf') => {
    console.log(`Exportando ${filteredEmployees.length} empleados en formato: ${format}`);
    // Aquí iría la lógica de exportación
  };

  return {
    employees: filteredEmployees,
    filters,
    selectedEmployees,
    updateFilters,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees,
    bulkUpdateStatus,
    exportEmployees,
    getComplianceIndicators,
    totalEmployees: employees.length,
    filteredCount: filteredEmployees.length
  };
};
