import { useState, useMemo, useEffect } from 'react';
import { EmployeeWithStatus, EmployeeFilters, ComplianceIndicator } from '@/types/employee-extended';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataService } from '@/services/EmployeeDataService';
import { filterEmployees } from '@/utils/employeeFilters';
import { usePagination } from '@/hooks/usePagination';

export const useEmployeeList = () => {
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithStatus | null>(null);
  const [isEmployeeProfileOpen, setIsEmployeeProfileOpen] = useState(false);
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
      
      // Verificar si hay un parámetro de empresa de soporte en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const supportCompanyId = urlParams.get('support_company');
      
      let companyId: string;
      
      if (supportCompanyId) {
        // Si hay un parámetro de empresa de soporte, usar ese
        companyId = supportCompanyId;
        console.log('🔧 Using support company context:', companyId);
      } else {
        // Caso normal: obtener empresa del usuario actual
        companyId = await EmployeeDataService.getCurrentUserCompanyId();
        if (!companyId) {
          throw new Error('No se pudo obtener la empresa del usuario');
        }
      }
      
      const rawData = await EmployeeDataService.getEmployees(companyId);
      
      // Transform raw employee data to EmployeeWithStatus format
      const transformedData = rawData.map((emp: any): EmployeeWithStatus => ({
        id: emp.id,
        cedula: emp.cedula,
        tipoDocumento: emp.tipo_documento || 'CC',
        nombre: emp.nombre,
        apellido: emp.apellido,
        email: emp.email || '',
        telefono: emp.telefono,
        salarioBase: Number(emp.salario_base) || 0,
        tipoContrato: emp.tipo_contrato || 'indefinido',
        fechaIngreso: emp.fecha_ingreso,
        estado: emp.estado || 'activo',
        eps: emp.eps,
        afp: emp.afp,
        arl: emp.arl,
        cajaCompensacion: emp.caja_compensacion,
        cargo: emp.cargo,
        empresaId: emp.company_id,
        estadoAfiliacion: emp.estado_afiliacion || 'pendiente',
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
        // Banking information
        banco: emp.banco,
        tipoCuenta: emp.tipo_cuenta || 'ahorros',
        numeroCuenta: emp.numero_cuenta,
        titularCuenta: emp.titular_cuenta
      }));
      
      setEmployees(transformedData);
      console.log('Empleados cargados:', transformedData.length);
      
      if (supportCompanyId) {
        toast({
          title: "Modo Soporte Activo",
          description: `Viendo empleados de empresa en contexto de soporte`,
        });
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados",
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

  const pagination = usePagination(filteredEmployees, {
    defaultPageSize: 25,
    pageSizeOptions: [25, 50, 75, 100],
    storageKey: 'employees'
  });

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
    // Toggle all employees on current page
    const currentPageEmployeeIds = pagination.paginatedItems.map(emp => emp.id);
    const allCurrentPageSelected = currentPageEmployeeIds.every(id => selectedEmployees.includes(id));
    
    if (allCurrentPageSelected) {
      setSelectedEmployees(prev => prev.filter(id => !currentPageEmployeeIds.includes(id)));
    } else {
      setSelectedEmployees(prev => {
        const newSelected = [...prev];
        currentPageEmployeeIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

  const bulkUpdateStatus = (newStatus: string) => {
    console.log(`Actualizando estado de ${selectedEmployees.length} empleados a: ${newStatus}`);
    setSelectedEmployees([]);
  };

  const exportEmployees = (format: 'excel' | 'pdf') => {
    console.log(`Exportando ${filteredEmployees.length} empleados en formato: ${format}`);
  };

  const openEmployeeProfile = (employee: EmployeeWithStatus) => {
    setSelectedEmployee(employee);
    setIsEmployeeProfileOpen(true);
  };

  const closeEmployeeProfile = () => {
    setIsEmployeeProfileOpen(false);
    setSelectedEmployee(null);
  };

  return {
    employees: pagination.paginatedItems, // Return paginated employees
    allEmployees: filteredEmployees, // Keep reference to all filtered employees
    filters,
    selectedEmployees,
    isLoading,
    selectedEmployee,
    isEmployeeProfileOpen,
    pagination, // Export pagination object
    updateFilters,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees,
    bulkUpdateStatus,
    exportEmployees,
    getComplianceIndicators,
    openEmployeeProfile,
    closeEmployeeProfile,
    totalEmployees: employees.length,
    filteredCount: filteredEmployees.length,
    refreshEmployees: loadEmployees
  };
};
