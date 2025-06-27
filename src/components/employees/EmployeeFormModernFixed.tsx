
import { useMemo } from 'react';
import { Employee } from '@/types';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeFormSubmissionFixed } from '@/hooks/useEmployeeFormSubmissionFixed';

// Import refactored components
import { NavigationSidebar } from './form/NavigationSidebar';
import { EmployeeFormHeader } from './form/EmployeeFormHeader';
import { EmployeeFormContent } from './form/EmployeeFormContent';
import { EmployeeFormFooter } from './form/EmployeeFormFooter';
import { useEmployeeForm } from './form/useEmployeeForm';

interface EmployeeFormModernFixedProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
  onDataRefresh?: (updatedEmployee: Employee) => void;
}

export const EmployeeFormModernFixed = ({ employee, onSuccess, onCancel, onDataRefresh }: EmployeeFormModernFixedProps) => {
  console.log('🔄 EmployeeFormModernFixed: Component rendered');
  console.log('🔄 EmployeeFormModernFixed: Received employee:', employee ? `${employee.nombre} ${employee.apellido} (${employee.id})` : 'undefined');
  
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

  // Memoize the data refresh handler
  const memoizedDataRefresh = useMemo(() => {
    return (updatedEmployee: Employee) => {
      console.log('🔄 EmployeeFormModernFixed: Data refresh callback triggered');
      onDataRefresh?.(updatedEmployee);
    };
  }, [onDataRefresh]);

  const { handleSubmit: handleFormSubmission, isLoading } = useEmployeeFormSubmissionFixed(
    employee, 
    onSuccess, 
    memoizedDataRefresh
  );

  const onSubmit = async (data: any) => {
    if (!companyId) {
      console.error('❌ No companyId available for form submission');
      return;
    }
    console.log('🚀 EmployeeFormModernFixed: Form submission triggered with data:', data);
    await handleFormSubmission(data, companyId);
  };

  const handleDuplicate = () => {
    console.log('🔄 Duplicating employee...');
  };

  console.log('🎯 EmployeeFormModernFixed: Rendering form with employee:', {
    id: employee?.id,
    name: employee ? `${employee.nombre} ${employee.apellido}` : 'undefined'
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
