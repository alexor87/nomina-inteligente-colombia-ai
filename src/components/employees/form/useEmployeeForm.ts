
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

  // Initialize form with defaults or employee data
  const formMethods = useForm<EmployeeFormData>({
    defaultValues: getEmployeeFormDefaults(),
    mode: 'onChange' // Enable real-time validation
  });

  const { register, handleSubmit, formState, setValue, watch, trigger, reset, control } = formMethods;
  const { errors, isValid, isDirty, isSubmitting } = formState;

  // Log form state for debugging
  console.log('📋 Form state:', {
    isValid,
    isDirty,
    isSubmitting,
    errorsCount: Object.keys(errors).length,
    errors: errors
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

  // Enhanced handleSubmit with debugging
  const enhancedHandleSubmit = (onSubmit: (data: EmployeeFormData) => void | Promise<void>) => {
    console.log('🚀 Creating enhanced handleSubmit wrapper');
    
    return handleSubmit(async (data, event) => {
      console.log('🔥🔥🔥 ENHANCED HANDLE SUBMIT EXECUTED 🔥🔥🔥');
      console.log('📊 Form data received:', data);
      console.log('📊 Form validation state:', { isValid, isDirty, errorsCount: Object.keys(errors).length });
      console.log('📊 Event details:', event);
      
      try {
        console.log('✅ Calling onSubmit function...');
        await onSubmit(data);
        console.log('✅ onSubmit completed successfully');
      } catch (error) {
        console.error('❌ Error in onSubmit:', error);
        throw error;
      }
    }, (errors, event) => {
      console.error('❌ Form validation failed:', errors);
      console.error('❌ Validation event:', event);
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
