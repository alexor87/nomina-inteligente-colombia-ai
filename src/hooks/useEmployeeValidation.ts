import { useState, useEffect } from 'react';
import type { PeriodEmployee, PeriodNovedad } from '@/contexts/UnifiedPeriodEditContext';

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export const useEmployeeValidation = () => {
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());

  const validateEmployee = (employee: PeriodEmployee): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate salary
    if (employee.salario_base <= 0) {
      errors.push({
        field: 'salario_base',
        message: 'El salario base debe ser mayor a 0',
        severity: 'error'
      });
    }

    // Validate salary against minimum wage (2025)
    const salarioMinimo = 1423500;
    if (employee.salario_base < salarioMinimo) {
      warnings.push({
        field: 'salario_base',
        message: `Salario por debajo del mínimo legal (${salarioMinimo.toLocaleString()})`,
        severity: 'warning'
      });
    }

    // Validate worked days
    if (employee.dias_trabajados < 0 || employee.dias_trabajados > 30) {
      errors.push({
        field: 'dias_trabajados',
        message: 'Los días trabajados deben estar entre 0 y 30',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const validateNovedad = (
    novedad: PeriodNovedad, 
    periodStart: Date, 
    periodEnd: Date
  ): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate dates are within period
    if (novedad.fecha_inicio && novedad.fecha_fin) {
      const startDate = new Date(novedad.fecha_inicio);
      const endDate = new Date(novedad.fecha_fin);

      if (startDate < periodStart || endDate > periodEnd) {
        errors.push({
          field: 'fecha_periodo',
          message: 'Las fechas deben estar dentro del período de nómina',
          severity: 'error'
        });
      }

      if (startDate > endDate) {
        errors.push({
          field: 'fecha_orden',
          message: 'La fecha de inicio debe ser anterior a la fecha de fin',
          severity: 'error'
        });
      }
    }

    // Validate numeric values
    if (novedad.valor && isNaN(Number(novedad.valor))) {
      errors.push({
        field: 'valor',
        message: 'El valor debe ser numérico',
        severity: 'error'
      });
    }

    if (novedad.dias && (novedad.dias < 0 || novedad.dias > 30)) {
      errors.push({
        field: 'dias',
        message: 'Los días deben estar entre 0 y 30',
        severity: 'error'
      });
    }

    // Validate specific novedad types
    if (novedad.tipo_novedad === 'incapacidad' && (!novedad.subtipo || novedad.subtipo.trim() === '')) {
      errors.push({
        field: 'subtipo',
        message: 'El subtipo es obligatorio para incapacidades',
        severity: 'error'
      });
    }

    // Value range warnings
    if (novedad.valor && Math.abs(Number(novedad.valor)) > 2000000) {
      warnings.push({
        field: 'valor',
        message: 'Valor inusualmente alto, verificar',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const validateBulkChanges = (
    employees: PeriodEmployee[],
    periodStart: Date,
    periodEnd: Date
  ): Map<string, ValidationResult> => {
    const results = new Map<string, ValidationResult>();

    employees.forEach(employee => {
      const employeeValidation = validateEmployee(employee);
      
      // Validate employee-level data only
      // Note: Novedades are handled separately in the unified editor context
      const allNovedadErrors: ValidationError[] = [...employeeValidation.errors];
      const allNovedadWarnings: ValidationError[] = [...employeeValidation.warnings];

      results.set(employee.id, {
        isValid: allNovedadErrors.length === 0,
        errors: allNovedadErrors,
        warnings: allNovedadWarnings
      });
    });

    setValidationResults(results);
    return results;
  };

  const getEmployeeValidation = (employeeId: string): ValidationResult | undefined => {
    return validationResults.get(employeeId);
  };

  const hasValidationErrors = (): boolean => {
    return Array.from(validationResults.values()).some(result => !result.isValid);
  };

  const getValidationSummary = () => {
    const totalEmployees = validationResults.size;
    const employeesWithErrors = Array.from(validationResults.values()).filter(result => !result.isValid).length;
    const totalErrors = Array.from(validationResults.values()).reduce((sum, result) => sum + result.errors.length, 0);
    const totalWarnings = Array.from(validationResults.values()).reduce((sum, result) => sum + result.warnings.length, 0);

    return {
      totalEmployees,
      employeesWithErrors,
      employeesWithoutErrors: totalEmployees - employeesWithErrors,
      totalErrors,
      totalWarnings,
      canSave: employeesWithErrors === 0
    };
  };

  return {
    validateEmployee,
    validateNovedad,
    validateBulkChanges,
    getEmployeeValidation,
    hasValidationErrors,
    getValidationSummary,
    validationResults
  };
};