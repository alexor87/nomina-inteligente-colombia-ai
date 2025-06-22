
import { useState, useMemo, useEffect } from 'react';
import { EmployeeWithStatus, EmployeeFilters, ComplianceIndicator } from '@/types/employee-extended';
import { Employee } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Cargar empleados desde Supabase
  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading employees:', error);
        toast({
          title: "Error al cargar empleados",
          description: "No se pudieron cargar los empleados desde la base de datos",
          variant: "destructive"
        });
        return;
      }

      // Transformar los datos de Supabase al formato esperado
      const transformedEmployees: EmployeeWithStatus[] = (data || []).map(emp => ({
        id: emp.id,
        cedula: emp.cedula,
        nombre: emp.nombre,
        apellido: emp.apellido,
        email: emp.email || '',
        telefono: emp.telefono,
        salarioBase: Number(emp.salario_base),
        tipoContrato: emp.tipo_contrato as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje',
        fechaIngreso: emp.fecha_ingreso,
        estado: emp.estado as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad',
        eps: emp.eps,
        afp: emp.afp,
        arl: emp.arl,
        cajaCompensacion: emp.caja_compensacion,
        cargo: emp.cargo,
        empresaId: emp.company_id,
        estadoAfiliacion: emp.estado_afiliacion as 'completa' | 'pendiente' | 'inconsistente',
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
        // Campos adicionales para el tipo extendido
        centrosocial: 'Sin asignar', // Este campo no existe en la BD actual
        nivelRiesgoARL: undefined, // Este campo no existe en la BD actual
        ultimaLiquidacion: undefined,
        contratoVencimiento: undefined,
        fechaUltimaModificacion: emp.updated_at,
        usuarioUltimaModificacion: 'Sistema'
      }));

      setEmployees(transformedEmployees);
      console.log('Empleados cargados:', transformedEmployees.length);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar empleados al montar el componente
  useEffect(() => {
    loadEmployees();
  }, []);

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

  // Función para refrescar la lista (útil después de crear/editar empleados)
  const refreshEmployees = () => {
    loadEmployees();
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
    refreshEmployees
  };
};
