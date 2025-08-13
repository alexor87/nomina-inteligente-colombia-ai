
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeFormData } from './types';
import { getEmployeeFormDefaults } from './useEmployeeFormDefaults';
import { useEmployeeFormState } from './useEmployeeFormState';
import { useARLRiskLevels } from './useARLRiskLevels';
import { useCompanyId } from './useCompanyId';
import { useEmployeeFormEffects } from './useEmployeeFormEffects';
import { useEmployeeFormPopulation } from './useEmployeeFormPopulation';
import { EmployeeValidationEnhancedSchema } from '@/schemas/employeeValidationEnhanced';

export const useEmployeeForm = (employee?: EmployeeUnified) => {
  console.log('🔄 useEmployeeForm: Hook called with employee:', employee?.id);
  
  // Initialize form state
  const {
    companyId,
    setCompanyId,
    activeSection,
    setActiveSection,
    completionPercentage,
    setCompletionPercentage,
    isDraft,
    setIsDraft,
    scrollToSection
  } = useEmployeeFormState();

  // Initialize form with enhanced validation
  const formMethods = useForm<EmployeeFormData>({
    resolver: zodResolver(EmployeeValidationEnhancedSchema),
    defaultValues: getEmployeeFormDefaults(),
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldFocusError: true
  });

  const { register, handleSubmit, formState, setValue, watch, trigger, reset, control } = formMethods;
  const { errors, isValid, isDirty, isSubmitting } = formState;

  // Enhanced logging for validation errors
  console.log('📋 Form validation state:', {
    isValid,
    isDirty,
    isSubmitting,
    errorsCount: Object.keys(errors).length,
    validationErrors: Object.entries(errors).map(([field, error]) => ({
      field,
      message: error?.message,
      type: error?.type
    }))
  });

  const watchedValues = watch();

  // Load ARL risk levels configuration
  const { arlRiskLevels } = useARLRiskLevels();

  // Load company ID
  useCompanyId(setCompanyId);

  // Populate form when employee data is available (for editing)
  useEmployeeFormPopulation(employee || null, setValue, trigger);

  // Handle form effects (auto-fill, completion calculation)
  useEmployeeFormEffects(watchedValues, setValue, setCompletionPercentage);

  // Enhanced handleSubmit with comprehensive validation
  const enhancedHandleSubmit = (onSubmit: (data: EmployeeFormData) => void | Promise<void>) => {
    console.log('🚀 Creating enhanced handleSubmit wrapper with full validation');
    
    return handleSubmit(async (data, event) => {
      console.log('🔥 ENHANCED HANDLE SUBMIT - VALIDATION PASSED');
      console.log('📊 Validated form data:', data);
      console.log('📊 Validation state:', { 
        isValid, 
        isDirty, 
        errorsCount: Object.keys(errors).length
      });
      
      try {
        console.log('✅ Calling onSubmit with validated data...');
        await onSubmit(data);
        console.log('✅ onSubmit completed successfully');
      } catch (error) {
        console.error('❌ Error in onSubmit:', error);
        throw error;
      }
    }, (validationErrors, event) => {
      console.error('❌ FORM VALIDATION FAILED - Enhanced Schema');
      console.error('❌ Validation errors:', validationErrors);
      console.error('❌ Current form values:', watchedValues);
      
      // Log specific validation errors for debugging
      Object.entries(validationErrors).forEach(([fieldName, error]) => {
        console.error(`❌ Field "${fieldName}" error:`, {
          message: error?.message,
          type: error?.type,
          currentValue: watchedValues[fieldName as keyof typeof watchedValues]
        });
      });

      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        const errorCount = Object.keys(validationErrors).length;
        alert(`Por favor revisa los ${errorCount} errores en el formulario antes de continuar.`);
      }
    });
  };

  console.log('✅ useEmployeeForm: Hook completed with enhanced validation');

  return {
    // Form methods
    register,
    handleSubmit: enhancedHandleSubmit,
    errors,
    setValue,
    watch,
    trigger,
    reset,
    control,
    watchedValues,
    
    // Form state
    formState,
    isValid,
    isDirty,
    isSubmitting,
    
    // State
    companyId,
    activeSection,
    completionPercentage,
    isDraft,
    arlRiskLevels,
    
    // Setters
    setActiveSection,
    setIsDraft,
    
    // Methods
    scrollToSection
  };
};
