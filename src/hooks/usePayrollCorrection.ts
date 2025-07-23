
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';

export const usePayrollCorrection = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const correctPayrollForPeriod = useCallback(async (periodId: string) => {
    try {
      setIsProcessing(true);
      console.log('🔄 Iniciando corrección de nómina para período:', periodId);

      // Obtener información del período
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError) {
        throw periodError;
      }

      console.log('📊 Período encontrado:', periodData.periodo);

      // Ejecutar corrección usando el servicio unificado
      await EmployeeUnifiedService.updatePayrollRecords(periodId);

      // Obtener empleados corregidos para mostrar resumen
      const correctedEmployees = await EmployeeUnifiedService.getEmployeesForPeriod(periodId);
      
      const employeesWithTransport = correctedEmployees.filter(emp => emp.transportAllowance > 0);
      const totalNetPay = correctedEmployees.reduce((sum, emp) => sum + emp.netPay, 0);

      console.log('✅ Corrección completada:', {
        totalEmployees: correctedEmployees.length,
        employeesWithTransport: employeesWithTransport.length,
        totalNetPay
      });

      toast({
        title: "✅ Nómina corregida exitosamente",
        description: `${correctedEmployees.length} empleados procesados. ${employeesWithTransport.length} con auxilio de transporte.`,
        className: "border-green-200 bg-green-50"
      });

      return {
        success: true,
        data: {
          totalEmployees: correctedEmployees.length,
          employeesWithTransport: employeesWithTransport.length,
          totalNetPay,
          employees: correctedEmployees
        }
      };

    } catch (error) {
      console.error('❌ Error en corrección de nómina:', error);
      toast({
        title: "Error",
        description: "No se pudo corregir la nómina: " + (error instanceof Error ? error.message : 'Error desconocido'),
        variant: "destructive"
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const validatePayrollCalculations = useCallback(async (periodId: string) => {
    try {
      const employees = await EmployeeUnifiedService.getEmployeesForPeriod(periodId);
      
      const validation = {
        totalEmployees: employees.length,
        employeesWithErrors: employees.filter(emp => emp.status === 'error').length,
        employeesWithTransport: employees.filter(emp => emp.transportAllowance > 0).length,
        totalNetPay: employees.reduce((sum, emp) => sum + emp.netPay, 0),
        averageNetPay: employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.netPay, 0) / employees.length : 0
      };

      return validation;
    } catch (error) {
      console.error('❌ Error validando cálculos:', error);
      throw error;
    }
  }, []);

  return {
    correctPayrollForPeriod,
    validatePayrollCalculations,
    isProcessing
  };
};
