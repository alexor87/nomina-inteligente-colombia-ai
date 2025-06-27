
import { useForm } from 'react-hook-form';
import { Employee } from '@/types';
import { EmployeeFormData } from './types';
import { getEmployeeFormDefaults } from './useEmployeeFormDefaults';
import { useEmployeeFormState } from './useEmployeeFormState';
import { useARLRiskLevels } from './useARLRiskLevels';
import { useCompanyId } from './useCompanyId';
import { useEmployeeDataPopulation } from './useEmployeeDataPopulation';
import { useEmployeeFormEffects } from './useEmployeeFormEffects';

export const useEmployeeForm = (employee?: Employee) => {
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

  // Initialize form with defaults
  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger, reset, control } = useForm<EmployeeFormData>({
    defaultValues: getEmployeeFormDefaults(),
    mode: 'onChange' // Enable real-time validation
  });

  const watchedValues = watch();

  // Load ARL risk levels configuration
  const { arlRiskLevels } = useARLRiskLevels();

  // Load company ID
  useCompanyId(setCompanyId);

  // Populate form when employee data is available
  console.log('🔄 useEmployeeForm: About to call useEmployeeDataPopulation with employee:', employee?.id);
  useEmployeeDataPopulation(employee, setValue, trigger);

  // Handle form effects (auto-fill, completion calculation)
  useEmployeeFormEffects(watchedValues, setValue, setCompletionPercentage);

  console.log('✅ useEmployeeForm: Hook completed, returning form methods');

  return {
    // Form methods
    register,
    handleSubmit,
    errors,
    setValue,
    watch,
    trigger,
    reset,
    control,
    watchedValues,
    
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
