
import { useForm } from 'react-hook-form';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeFormData } from './types';
import { getEmployeeFormDefaults } from './useEmployeeFormDefaults';
import { useEmployeeFormState } from './useEmployeeFormState';
import { useARLRiskLevels } from './useARLRiskLevels';
import { useCompanyId } from './useCompanyId';
import { useEmployeeFormEffects } from './useEmployeeFormEffects';
import { useEmployeeFormPopulation } from './useEmployeeFormPopulation';

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

  // Initialize form with defaults or employee data - REMOVED STRICT VALIDATION
  const formMethods = useForm<EmployeeFormData>({
    defaultValues: getEmployeeFormDefaults(),
    mode: 'onChange',
    // Remover validación estricta para testing
    reValidateMode: 'onChange',
    shouldFocusError: false
  });

  const { register, handleSubmit, formState, setValue, watch, trigger, reset, control } = formMethods;
  const { errors, isValid, isDirty, isSubmitting } = formState;

  // Log form state for debugging - MÁS DETALLADO
  console.log('📋 Form state DETAILED:', {
    isValid,
    isDirty,
    isSubmitting,
    errorsCount: Object.keys(errors).length,
    specificErrors: Object.keys(errors).map(key => ({
      field: key,
      error: errors[key as keyof typeof errors]?.message,
      value: watch(key as keyof EmployeeFormData)
    })),
    bancoValue: watch('banco'),
    bancoError: errors.banco
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

  // Enhanced handleSubmit with MORE DETAILED debugging
  const enhancedHandleSubmit = (onSubmit: (data: EmployeeFormData) => void | Promise<void>) => {
    console.log('🚀 Creating enhanced handleSubmit wrapper');
    
    return handleSubmit(async (data, event) => {
      console.log('🔥🔥🔥 ENHANCED HANDLE SUBMIT EXECUTED 🔥🔥🔥');
      console.log('📊 Form data received:', data);
      console.log('📊 Form validation state:', { 
        isValid, 
        isDirty, 
        errorsCount: Object.keys(errors).length,
        errors: errors 
      });
      console.log('📊 Event details:', event);
      
      try {
        console.log('✅ Calling onSubmit function...');
        await onSubmit(data);
        console.log('✅ onSubmit completed successfully');
      } catch (error) {
        console.error('❌ Error in onSubmit:', error);
        throw error;
      }
    }, (validationErrors, event) => {
      console.error('❌ FORM VALIDATION FAILED:', validationErrors);
      console.error('❌ Validation event:', event);
      console.error('❌ Current form values:', watchedValues);
      
      // Mostrar errores específicos para debugging
      Object.keys(validationErrors).forEach(fieldName => {
        console.error(`❌ Field ${fieldName}:`, {
          error: validationErrors[fieldName as keyof typeof validationErrors],
          currentValue: watchedValues[fieldName as keyof typeof watchedValues]
        });
      });
    });
  };

  console.log('✅ useEmployeeForm: Hook completed, returning form methods');

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
