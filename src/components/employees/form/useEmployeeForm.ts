
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeFormData, employeeFormSchema } from './types';
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

  // Initialize form with Zod validation and defaults
  const formMethods = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: getEmployeeFormDefaults(),
    mode: 'onChange', // Immediate validation feedback
    reValidateMode: 'onChange',
    shouldFocusError: true // Focus on first error for better UX
  });

  const { register, handleSubmit, formState, setValue, watch, trigger, reset, control } = formMethods;
  const { errors, isValid, isDirty, isSubmitting } = formState;

  // Enhanced logging for validation debugging
  console.log('📋 Form validation state:', {
    isValid,
    isDirty,
    isSubmitting,
    errorsCount: Object.keys(errors).length,
    validationErrors: Object.keys(errors).reduce((acc, key) => {
      acc[key] = {
        message: errors[key as keyof typeof errors]?.message,
        type: errors[key as keyof typeof errors]?.type,
        value: watch(key as keyof EmployeeFormData)
      };
      return acc;
    }, {} as Record<string, any>)
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

  // Enhanced handleSubmit with comprehensive validation logging
  const enhancedHandleSubmit = (onSubmit: (data: EmployeeFormData) => void | Promise<void>) => {
    console.log('🚀 Creating enhanced handleSubmit wrapper with Zod validation');
    
    return handleSubmit(async (data, event) => {
      console.log('✅ Form validation passed - executing submission');
      console.log('📊 Validated form data:', data);
      console.log('📊 Validation state:', { 
        isValid, 
        isDirty, 
        errorsCount: Object.keys(errors).length
      });
      
      try {
        console.log('✅ Calling onSubmit function...');
        await onSubmit(data);
        console.log('✅ onSubmit completed successfully');
      } catch (error) {
        console.error('❌ Error in onSubmit:', error);
        throw error;
      }
    }, (validationErrors, event) => {
      console.error('❌ FORM VALIDATION FAILED - Zod schema validation errors:');
      console.error('❌ Validation errors:', validationErrors);
      console.error('❌ Current form values:', watchedValues);
      
      // Log specific field validation errors for debugging
      Object.keys(validationErrors).forEach(fieldName => {
        const error = validationErrors[fieldName as keyof typeof validationErrors];
        console.error(`❌ Field "${fieldName}":`, {
          message: error?.message,
          type: error?.type,
          currentValue: watchedValues[fieldName as keyof typeof watchedValues],
          ref: error?.ref
        });
      });
    });
  };

  console.log('✅ useEmployeeForm: Hook completed with Zod validation, returning form methods');

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
    
    // Form state (includes validation state from Zod)
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
