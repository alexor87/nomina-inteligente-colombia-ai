import { useState } from 'react';
import { PayrollValidationService, PreLiquidationValidation } from '@/services/PayrollValidationService';
import { useToast } from '@/hooks/use-toast';

export const usePayrollValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<PreLiquidationValidation | null>(null);
  const { toast } = useToast();

  const validatePreLiquidation = async (periodId: string, companyId: string) => {
    try {
      setIsValidating(true);
      console.log('🔍 Iniciando validación pre-liquidación...', { periodId, companyId });

      const validation = await PayrollValidationService.validatePreLiquidation(periodId, companyId);
      setValidationResult(validation);

      const criticalIssues = validation.issues.filter(issue => issue.severity === 'high');
      const warningIssues = validation.issues.filter(issue => issue.severity === 'medium');

      if (criticalIssues.length > 0) {
        toast({
          title: "⚠️ Validación Fallida",
          description: `${criticalIssues.length} errores críticos encontrados`,
          variant: "destructive"
        });
      } else if (warningIssues.length > 0) {
        toast({
          title: "⚠️ Advertencias Encontradas",
          description: `${warningIssues.length} advertencias, pero se puede proceder`,
          className: "border-yellow-200 bg-yellow-50"
        });
      } else {
        toast({
          title: "✅ Validación Exitosa",
          description: "Todos los datos están listos para liquidación",
          className: "border-green-200 bg-green-50"
        });
      }

      console.log('✅ Validación completada:', {
        isValid: validation.isValid,
        totalIssues: validation.issues.length,
        criticalIssues: criticalIssues.length,
        warningIssues: warningIssues.length
      });

      return validation;
    } catch (error) {
      console.error('❌ Error en validación:', error);
      toast({
        title: "Error en Validación",
        description: "No se pudo completar la validación",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const checkIntegrity = async (periodId: string, companyId: string) => {
    try {
      const integrityCheck = await PayrollValidationService.quickIntegrityCheck(periodId, companyId);
      
      console.log('📊 Verificación de integridad:', integrityCheck);
      
      return integrityCheck;
    } catch (error) {
      console.error('❌ Error en verificación de integridad:', error);
      return null;
    }
  };

  const validateEmployees = async (periodId: string, companyId: string) => {
    try {
      const employeeValidation = await PayrollValidationService.validateEmployeesForPeriod(periodId, companyId);
      
      console.log('👥 Validación de empleados:', {
        valid: employeeValidation.validEmployees.length,
        invalid: employeeValidation.invalidEmployees.length,
        issues: employeeValidation.issues.length
      });
      
      return employeeValidation;
    } catch (error) {
      console.error('❌ Error en validación de empleados:', error);
      return null;
    }
  };

  const getCompanyIssues = async (companyId: string) => {
    try {
      const issues = await PayrollValidationService.getCompanyPeriodsIssues(companyId);
      
      console.log('🏢 Problemas de la empresa:', {
        periodsWithIssues: issues.periodsWithIssues.length,
        totalIssues: issues.totalIssues
      });
      
      return issues;
    } catch (error) {
      console.error('❌ Error obteniendo problemas de empresa:', error);
      return null;
    }
  };

  const clearValidation = () => {
    setValidationResult(null);
  };

  return {
    // Estado
    isValidating,
    validationResult,
    
    // Funciones de validación
    validatePreLiquidation,
    checkIntegrity,
    validateEmployees,
    getCompanyIssues,
    clearValidation,
    
    // Estados computados
    canProceedWithLiquidation: validationResult?.isValid || false,
    hasCriticalIssues: validationResult?.issues.filter(i => i.severity === 'high').length || 0,
    hasWarnings: validationResult?.issues.filter(i => i.severity === 'medium').length || 0,
    isReady: !isValidating
  };
};