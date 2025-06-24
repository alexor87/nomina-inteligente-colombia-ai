
import { useState, useEffect } from 'react';
import { ButtonValidationService } from '@/services/ButtonValidationService';
import { useToast } from '@/hooks/use-toast';

export const useButtonValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const { toast } = useToast();

  const validateAllButtons = async () => {
    setIsValidating(true);
    try {
      console.log('🔍 Iniciando validación completa de botones...');
      
      const results = await ButtonValidationService.validateAllModules();
      setValidationResults(results);
      
      // Contar fallos
      const employeeFails = Object.values(results.employees).filter(v => v === false).length;
      const payrollFails = Object.values(results.payroll).filter(v => v === false).length;
      const voucherFails = Object.values(results.vouchers).filter(v => v === false).length;
      
      const totalFails = employeeFails + payrollFails + voucherFails;
      const totalTests = Object.keys(results.employees).length + 
                        Object.keys(results.payroll).length + 
                        Object.keys(results.vouchers).length;
      
      if (totalFails === 0) {
        toast({
          title: "✅ Validación Exitosa",
          description: `Todos los ${totalTests} botones funcionan correctamente`,
        });
      } else {
        toast({
          title: "⚠️ Problemas Encontrados",
          description: `${totalFails} de ${totalTests} funcionalidades tienen problemas`,
          variant: "destructive"
        });
      }
      
      console.log(`🎯 Validación completa: ${totalTests - totalFails}/${totalTests} exitosas`);
      
    } catch (error) {
      console.error('Error en validación:', error);
      toast({
        title: "❌ Error en Validación",
        description: "No se pudo completar la validación de botones",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const validateEmployeeModule = async () => {
    setIsValidating(true);
    try {
      const results = await ButtonValidationService.validateEmployeeButtons();
      console.log('✅ Validación del módulo de empleados completada');
      
      const failCount = Object.values(results).filter(v => v === false).length;
      if (failCount === 0) {
        toast({
          title: "✅ Módulo Empleados OK",
          description: "Todas las funcionalidades funcionan correctamente",
        });
      } else {
        toast({
          title: "⚠️ Problemas en Empleados",
          description: `${failCount} funcionalidades tienen problemas`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error validando empleados:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const validatePayrollModule = async () => {
    setIsValidating(true);
    try {
      const results = await ButtonValidationService.validatePayrollButtons();
      console.log('✅ Validación del módulo de nómina completada');
      
      const failCount = Object.values(results).filter(v => v === false).length;
      if (failCount === 0) {
        toast({
          title: "✅ Módulo Nómina OK",
          description: "Todas las funcionalidades funcionan correctamente",
        });
      } else {
        toast({
          title: "⚠️ Problemas en Nómina",
          description: `${failCount} funcionalidades tienen problemas`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error validando nómina:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-ejecutar validación al montar el componente (opcional)
  useEffect(() => {
    // Ejecutar validación automática solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Auto-validación habilitada en desarrollo');
      // validateAllButtons(); // Descomenta para auto-validación
    }
  }, []);

  return {
    validateAllButtons,
    validateEmployeeModule,
    validatePayrollModule,
    isValidating,
    validationResults
  };
};
