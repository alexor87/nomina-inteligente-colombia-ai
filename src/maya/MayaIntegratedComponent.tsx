import React, { useEffect, useRef, useState } from 'react';
import { useMaya } from './MayaProvider';

interface MayaIntegratedComponentProps {
  employees: any[];
  isLoading: boolean;
  isLiquidating: boolean;
  selectedPeriod: any;
  currentPeriodId: string | null;
  liquidationResult: any;
  // New props for enhanced validation and error handling
  validationResults?: any;
  isValidating?: boolean;
  liquidationErrors?: any[];
  companyId?: string;
}

export const MayaIntegratedComponent: React.FC<MayaIntegratedComponentProps> = ({
  employees,
  isLoading,
  isLiquidating,
  selectedPeriod,
  currentPeriodId,
  liquidationResult,
  validationResults,
  isValidating,
  liquidationErrors,
  companyId
}) => {
  const { setPhase, performIntelligentValidation, setErrorContext } = useMaya();
  
  // Track phase states to prevent unnecessary validations
  const [lastValidatedEmployeeCount, setLastValidatedEmployeeCount] = useState<number>(0);
  const [hasTriggeredValidation, setHasTriggeredValidation] = useState<boolean>(false);
  const validationTriggeredRef = useRef<boolean>(false);

  // Enhanced phase tracking with automatic validation and error detection
  useEffect(() => {
    const handlePhaseTransition = async () => {
      // Error detection - highest priority
      if (liquidationErrors && liquidationErrors.length > 0) {
        await setPhase('error', {
          employeeCount: employees.length,
          periodName: selectedPeriod?.label,
          hasErrors: true,
          errorType: 'liquidation_errors',
          errorDetails: liquidationErrors
        });
        return;
      }

      // Validation errors
      if (validationResults && validationResults.hasIssues) {
        await setPhase('error', {
          employeeCount: employees.length,
          periodName: selectedPeriod?.label,
          hasErrors: true,
          errorType: 'validation_errors',
          validationResults,
          errorDetails: validationResults.issues
        });
        return;
      }

      // Completed liquidation
      if (liquidationResult) {
        setHasTriggeredValidation(false);
        validationTriggeredRef.current = false;
        await setPhase('completed', {
          employeeCount: employees.length,
          periodName: selectedPeriod?.label
        });
        return;
      }

      // Processing liquidation
      if (isLiquidating) {
        await setPhase('processing', {
          employeeCount: employees.length,
          periodName: selectedPeriod?.label,
          isProcessing: true
        });
        return;
      }

      // Data validation phase - showing validation results
      if (isValidating) {
        await setPhase('data_validation', {
          employeeCount: employees.length,
          periodName: selectedPeriod?.label,
          isProcessing: true,
          validationResults
        });
        return;
      }

      // Data validation completed - transition to liquidation ready or stay in validation
      if (validationResults && !isValidating) {
        if (validationResults.hasIssues) {
          // Stay in validation phase showing issues
          await setPhase('data_validation', {
            employeeCount: employees.length,
            periodName: selectedPeriod?.label,
            hasErrors: true,
            validationResults
          });
        } else {
          // Validation passed, ready for liquidation
          await setPhase('liquidation_ready', {
            employeeCount: employees.length,
            periodName: selectedPeriod?.label,
            validationResults
          });
        }
        return;
      }

      // Ready for liquidation (no validation or validation passed)
      if (employees.length > 0 && selectedPeriod && currentPeriodId && !isValidating) {
        await setPhase('liquidation_ready', {
          employeeCount: employees.length,
          periodName: selectedPeriod.label
        });
        return;
      }

      // Loading employees
      if (isLoading && selectedPeriod) {
        setHasTriggeredValidation(false);
        validationTriggeredRef.current = false;
        await setPhase('employee_loading', {
          periodName: selectedPeriod.label,
          isProcessing: true
        });
        return;
      }

      // Period selection
      if (selectedPeriod && !currentPeriodId) {
        await setPhase('period_selection', {
          periodName: selectedPeriod.label
        });
        return;
      }

      // Initial state
      await setPhase('initial');
    };

    handlePhaseTransition();
  }, [employees.length, isLoading, isLiquidating, selectedPeriod, currentPeriodId, liquidationResult, validationResults, isValidating, liquidationErrors, setPhase]);

  // Automatic intelligent validation trigger after employee loading
  useEffect(() => {
    const triggerIntelligentValidation = async () => {
      // Only trigger if we have employees, period, company, and haven't validated this set yet
      if (
        employees.length > 0 &&
        currentPeriodId &&
        companyId &&
        !isLoading &&
        !isValidating &&
        !hasTriggeredValidation &&
        !validationTriggeredRef.current &&
        lastValidatedEmployeeCount !== employees.length
      ) {
        try {
          console.log('🤖 MAYA: Triggering automatic intelligent validation...', {
            employeeCount: employees.length,
            periodId: currentPeriodId,
            companyId
          });

          validationTriggeredRef.current = true;
          setHasTriggeredValidation(true);
          setLastValidatedEmployeeCount(employees.length);

          await performIntelligentValidation(companyId, currentPeriodId, employees);
        } catch (error) {
          console.error('🤖 MAYA: Error in automatic validation:', error);
          // Reset flags on error
          validationTriggeredRef.current = false;
          setHasTriggeredValidation(false);
        }
      }
    };

    triggerIntelligentValidation();
  }, [employees.length, currentPeriodId, companyId, isLoading, isValidating, hasTriggeredValidation, lastValidatedEmployeeCount, performIntelligentValidation]);

  // This component is invisible - it just manages MAYA's intelligence
  return null;
};