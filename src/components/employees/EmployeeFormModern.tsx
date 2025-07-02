import { useMemo } from 'react';
import { EmployeeUnified } from '@/types/employee-unified';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeFormSubmission } from '@/hooks/useEmployeeFormSubmission';
import { useEmployeeEditSubmission } from '@/hooks/useEmployeeEditSubmission';

// Import refactored components
import { NavigationSidebar } from './form/NavigationSidebar';
import { EmployeeFormHeader } from './form/EmployeeFormHeader';
import { EmployeeFormContent } from './form/EmployeeFormContent';
import { EmployeeFormFooter } from './form/EmployeeFormFooter';
import { useEmployeeForm } from './form/useEmployeeForm';

interface EmployeeFormModernProps {
  employee?: EmployeeUnified;
  onSuccess: () => void;
  onCancel: () => void;
  onDataRefresh?: (updatedEmployee: EmployeeUnified) => void;
}

export const EmployeeFormModern = ({ employee, onSuccess, onCancel, onDataRefresh }: EmployeeFormModernProps) => {
  console.log('🔄 EmployeeFormModern: Component rendered');
  console.log('🔄 EmployeeFormModern: Received employee:', employee ? `${employee.nombre} ${employee.apellido} (${employee.id})` : 'undefined');
  
  const isEditMode = !!employee;
  const { configuration } = useEmployeeGlobalConfiguration();
  
  const {
    register,
    handleSubmit,
    errors,
    setValue,
    watch,
    trigger,
    reset,
    control,
    watchedValues,
    companyId,
    activeSection,
    completionPercentage,
    isDraft,
    arlRiskLevels,
    setActiveSection,
    setIsDraft,
    scrollToSection
  } = useEmployeeForm(employee);

  // Memoize the data refresh handler to prevent unnecessary re-renders
  const memoizedDataRefresh = useMemo(() => {
    return (updatedEmployee: EmployeeUnified) => {
      console.log('🔄 EmployeeFormModern: Data refresh callback triggered');
      onDataRefresh?.(updatedEmployee);
    };
  }, [onDataRefresh]);

  // Use different submission hooks based on whether we're creating or editing
  const { handleSubmit: handleCreateSubmission, isLoading: isCreating } = useEmployeeFormSubmission(
    employee,
    onSuccess, 
    memoizedDataRefresh
  );

  const { handleSubmit: handleEditSubmission, isSubmitting: isSubmittingEdit } = useEmployeeEditSubmission(
    employee || null,
    onSuccess
  );

  const isLoading = isCreating || isSubmittingEdit;

  const onSubmit = async (data: any) => {
    if (!companyId) return;
    console.log('🚀 EmployeeFormModern: Form submission triggered with data:', data);
    
    if (employee) {
      await handleEditSubmission(data);
    } else {
      await handleCreateSubmission(data, companyId, []);
    }
  };

  const handleDuplicate = () => {
    console.log('Duplicating employee...');
    // TODO: Implement duplication logic
  };

  console.log('🎯 EmployeeFormModern: Rendering form with employee:', {
    id: employee?.id,
    name: employee ? `${employee.nombre} ${employee.apellido}` : 'undefined',
    mode: isEditMode ? 'edit' : 'create'
  });

  return (
    <div className="flex min-h-screen bg-white">
      <NavigationSidebar 
        activeSection={activeSection}
        completionPercentage={completionPercentage}
        scrollToSection={scrollToSection}
      />
      
      <div className="flex-1">
        <EmployeeFormHeader
          employee={employee}
          onCancel={onCancel}
          onDuplicate={handleDuplicate}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <EmployeeFormContent
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            arlRiskLevels={arlRiskLevels}
            register={register}
            configuration={configuration}
          />
        </form>

        <EmployeeFormFooter
          employee={employee}
          completionPercentage={completionPercentage}
          isDraft={isDraft}
          setIsDraft={setIsDraft}
          isLoading={isLoading}
          onSubmit={handleSubmit(onSubmit)}
        />
      </div>
    </div>
  );
};
