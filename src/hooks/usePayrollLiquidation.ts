import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { formatCurrency } from '@/lib/utils';
import { PeriodNumberCalculationService } from '@/services/payroll-intelligent/PeriodNumberCalculationService';

interface EmployeePayrollData {
  employeeId: string;
  periodId: string;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  transportAllowance: number;
  baseSalary: number;
  eps: string;
  afp: string;
  additionalDeductions: number;
}

export const usePayrollLiquidation = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const [isRemovingEmployee, setIsRemovingEmployee] = useState(false);
  const { toast } = useToast();

  // Auto-save functionality
  const { triggerAutoSave, isSaving: isAutoSaving, lastSaveTime: lastAutoSaveTime } = useAutoSave({
    onSave: async () => {
      if (!currentPeriodId || employees.length === 0) return;
      console.log('💾 Auto-guardando datos de nómina...');
      try {
        for (const employee of employees) {
          await supabase
            .from('payrolls')
            .update({
              dias_trabajados: employee.worked_days,
              horas_extra: employee.extra_hours,
              incapacidades: employee.disabilities,
              bonificaciones: employee.bonuses,
              vacaciones: employee.absences,
              auxilio_transporte: employee.transport_allowance,
              otros_descuentos: employee.additional_deductions,
              updated_at: new Date().toISOString()
            })
            .eq('id', employee.payrollId);
        }
        console.log('✅ Auto-guardado exitoso');
      } catch (error) {
        console.error('Error auto-guardando:', error);
        toast({
          title: "Error auto-guardando",
          description: "Hubo un problema al guardar automáticamente los datos.",
          variant: "destructive",
        });
      }
    },
    delay: 15000, // 15 segundos
  });

  const triggerManualSave = useCallback(() => {
    triggerAutoSave();
  }, [triggerAutoSave]);

  const loadEmployees = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      console.log('🔄 Cargando empleados con cálculos correctos...');
      
      // ✅ CORREGIDO: Usar el servicio que ya calcula correctamente
      const employeesData = await PayrollLiquidationService.loadEmployeesForPeriod(startDate, endDate);
      
      // ✅ CORREGIDO: Obtener o crear período usando el servicio
      const periodId = await PayrollLiquidationService.ensurePeriodExists(startDate, endDate);
      setCurrentPeriodId(periodId);

      // ✅ CORREGIDO: Mapear datos con valores ya calculados correctamente
      const mappedEmployees = employeesData.map(employee => ({
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: 'Empleado', // Posición por defecto
        baseSalary: employee.salario_base,
        worked_days: employee.dias_trabajados, // Ya calculado proporcionalmente
        extra_hours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        transport_allowance: employee.auxilio_transporte, // Ya calculado
        additional_deductions: employee.deducciones_novedades,
        eps: '',
        afp: '',
        // ✅ VALORES YA CALCULADOS CORRECTAMENTE POR EL SERVICIO
        total_devengado: employee.devengos + (employee.salario_base / 30) * employee.dias_trabajados + employee.auxilio_transporte,
        total_deducciones: employee.deducciones,
        neto_pagado: employee.total_pagar,
        payrollId: null, // Se asignará al crear el registro
        periodId: periodId
      }));

      setEmployees(mappedEmployees);
      
      console.log('✅ Empleados cargados con cálculos correctos:', mappedEmployees.length);
      console.log('📊 Ejemplo - Primer empleado:', mappedEmployees[0]);

    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addEmployees = useCallback(async (employeeIds: string[]) => {
    if (!currentPeriodId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un período",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // ✅ CORREGIDO: Usar el servicio para cargar empleados específicos
      const newEmployeesData = await PayrollLiquidationService.loadSpecificEmployeesForPeriod(
        employeeIds, 
        // Obtener fechas del período actual
        new Date().toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );

      // Mapear nuevos empleados
      const newMappedEmployees = newEmployeesData.map(employee => ({
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: 'Empleado',
        baseSalary: employee.salario_base,
        worked_days: employee.dias_trabajados,
        extra_hours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        transport_allowance: employee.auxilio_transporte,
        additional_deductions: employee.deducciones_novedades,
        eps: '',
        afp: '',
        total_devengado: employee.devengos + (employee.salario_base / 30) * employee.dias_trabajados + employee.auxilio_transporte,
        total_deducciones: employee.deducciones,
        neto_pagado: employee.total_pagar,
        payrollId: null,
        periodId: currentPeriodId
      }));

      setEmployees(prevEmployees => [...prevEmployees, ...newMappedEmployees]);
      
      toast({
        title: "Empleados agregados",
        description: "Los empleados han sido agregados al período actual.",
      });

    } catch (error) {
      console.error('Error adding employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron agregar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriodId, toast]);

  const removeEmployee = useCallback(async (employeeId: string) => {
    if (!currentPeriodId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un período",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRemovingEmployee(true);

      // Obtener el payrollId del empleado
      const employeeToRemove = employees.find(emp => emp.id === employeeId);
      if (!employeeToRemove?.payrollId) {
        // Si no tiene payrollId, solo remover del estado local
        setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employeeId));
        toast({
          title: "Empleado removido",
          description: "El empleado ha sido removido del período actual.",
        });
        return;
      }

      // Eliminar el registro de nómina
      const { error: deleteError } = await supabase
        .from('payrolls')
        .delete()
        .eq('id', employeeToRemove.payrollId);

      if (deleteError) throw deleteError;

      // Actualizar el estado local
      setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employeeId));
      toast({
        title: "Empleado removido",
        description: "El empleado ha sido removido del período actual.",
      });

    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el empleado",
        variant: "destructive"
      });
    } finally {
      setIsRemovingEmployee(false);
    }
  }, [currentPeriodId, employees, toast]);

  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    if (!currentPeriodId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un período",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Buscar el empleado en el estado local
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }

      // ✅ CORREGIDO: Recalcular usando los valores ya existentes del servicio
      const salarioProporcional = (employee.baseSalary / 30) * employee.worked_days;
      const totalDevengado = salarioProporcional + employee.transport_allowance + employee.bonuses;
      const totalDeducciones = employee.total_deducciones + employee.additional_deductions;
      const netoPagado = totalDevengado - totalDeducciones;

      // Actualizar el estado local
      setEmployees(prevEmployees => {
        return prevEmployees.map(emp => {
          if (emp.id === employeeId) {
            return {
              ...emp,
              total_devengado: totalDevengado,
              total_deducciones: totalDeducciones,
              neto_pagado: netoPagado
            };
          }
          return emp;
        });
      });

      toast({
        title: "Novedades actualizadas",
        description: `${employee.name}: ${formatCurrency(netoPagado)}`,
      });

      // Disparar auto-guardado
      triggerManualSave();

    } catch (error) {
      console.error('Error refreshing employee novedades:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las novedades del empleado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriodId, employees, toast, triggerManualSave]);

  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    if (!currentPeriodId || employees.length === 0) {
      toast({
        title: "Error",
        description: "No hay empleados para liquidar",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLiquidating(true);
      
      console.log('🚀 Iniciando liquidación con datos correctos...');

      // ✅ CORREGIDO: Usar el servicio de liquidación que ya maneja todo correctamente
      const result = await PayrollLiquidationService.liquidatePayroll(
        employees, 
        startDate, 
        endDate
      );

      if (result.success) {
        console.log('✅ Liquidación exitosa:', result.message);
        
        toast({
          title: "✅ Nómina liquidada exitosamente",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });

        // Limpiar el estado después de liquidar
        setEmployees([]);
        setCurrentPeriodId(null);
        
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('❌ Error liquidating payroll:', error);
      toast({
        title: "Error",
        description: "No se pudo liquidar la nómina: " + (error instanceof Error ? error.message : 'Error desconocido'),
        variant: "destructive"
      });
    } finally {
      setIsLiquidating(false);
    }
  }, [currentPeriodId, employees, toast]);

  const detectPeriodType = (startDate: string, endDate: string): 'semanal' | 'quincenal' | 'mensual' => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays <= 7) {
      return 'semanal';
    } else if (diffDays <= 16) {
      return 'quincenal';
    } else {
      return 'mensual';
    }
  };

  const generatePeriodName = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      if (start.getDate() === 1 && end.getDate() === 15) {
        return `1 - 15 ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      } else if (start.getDate() === 16) {
        return `16 - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      } else if (start.getDate() === 1 && end.getDate() === new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()) {
        return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      }
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  return {
    employees,
    isLoading,
    isLiquidating,
    currentPeriodId,
    loadEmployees,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    isAutoSaving,
    lastAutoSaveTime,
    triggerManualSave,
    isRemovingEmployee
  };
};
