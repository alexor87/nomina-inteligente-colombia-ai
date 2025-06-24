
import { useState, useMemo, useEffect } from 'react';
import { EmployeeWithStatus, EmployeeFilters, ComplianceIndicator } from '@/types/employee-extended';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataService } from '@/services/EmployeeDataService';
import { filterEmployees } from '@/utils/employeeFilters';

export const useEmployeeList = () => {
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
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

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await EmployeeDataService.loadEmployees();
      setEmployees(data);
      console.log('Empleados cargados:', data.length);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados desde la base de datos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    return filterEmployees(employees, filters);
  }, [employees, filters]);

  const getComplianceIndicators = (employee: EmployeeWithStatus): ComplianceIndicator[] => {
    const indicators: ComplianceIndicator[] = [];

    if (!employee.eps) {
      indicators.push({
        type: 'eps',
        status: 'pendiente',
        message: 'Falta afiliación a EPS'
      });
    }

    if (!employee.afp) {
      indicators.push({
        type: 'pension',
        status: 'pendiente',
        message: 'Falta afiliación a fondo de pensiones'
      });
    }

    if (!employee.nivelRiesgoARL) {
      indicators.push({
        type: 'arl',
        status: 'pendiente',
        message: 'Falta asignar nivel de riesgo ARL'
      });
    }

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
    setSelectedEmployees([]);
  };

  const exportEmployees = (format: 'excel' | 'pdf') => {
    console.log(`Exportando ${filteredEmployees.length} empleados en formato: ${format}`);
  };

  return {
    employees: filteredEmployees,
    filters,
    selectedEmployees,
    isLoading,
    updateFilters,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees,
    bulkUpdateStatus,
    exportEmployees,
    getComplianceIndicators,
    totalEmployees: employees.length,
    filteredCount: filteredEmployees.length,
    refreshEmployees: loadEmployees
  };
};
