import { useMemo, useState } from 'react';
import { EmployeeUnified } from '@/types/employee-unified';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeFormSubmissionRobust } from '@/hooks/useEmployeeFormSubmissionRobust';
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

  // Use robust submission hook for better error handling
  const { 
    submitEmployee, 
    isSubmitting
  } = useEmployeeFormSubmissionRobust();

  // ✅ FIXED: Create compatible employee object for legacy hooks
  const legacyEmployee = employee ? {
    ...employee,
    empresaId: employee.company_id,
    createdAt: employee.createdAt || new Date().toISOString(),
    updatedAt: employee.updatedAt || new Date().toISOString()
  } : null;

  // Keep legacy edit submission for compatibility
  const { handleSubmit: handleEditSubmission, isSubmitting: isSubmittingEdit } = useEmployeeEditSubmission(
    legacyEmployee,
    onSuccess
  );

  const isLoading = isSubmitting || isSubmittingEdit;

  const onSubmit = async (data: any) => {
    console.log('🚀 EmployeeFormModern: Form submission triggered');
    console.log('📝 Form data:', data);
    console.log('🎯 Submission mode:', isEditMode ? 'edit' : 'create');
    
    if (!companyId) {
      console.error('❌ No company ID available');
      return;
    }

    // Add company ID to form data
    const formDataWithCompany = {
      ...data,
      empresaId: companyId,
      company_id: companyId, // ✅ ADDED: Ensure both properties are set
      // Asegurar que custom_fields está presente y es un objeto
      customFields: data.customFields || {}
    };

    // Use robust submission for both create and update operations
    const result = await submitEmployee(formDataWithCompany);
    
    if (result.success) {
      console.log('✅ Form submission completed successfully');
      onSuccess();
      if (result.employeeId && memoizedDataRefresh) {
        // Refresh with updated data if available - ✅ FIXED: Cast with required id
        const updatedEmployee: EmployeeUnified = { 
          ...formDataWithCompany, 
          id: result.employeeId,
          empresaId: companyId,
          company_id: companyId
        } as EmployeeUnified;
        memoizedDataRefresh(updatedEmployee);
      }
    } else {
      console.error('❌ Form submission failed:', result.error);
    }
  };

  const handleDuplicate = () => {
    console.log('📋 Duplicating employee...');
    // TODO: Implement duplication logic
  };

  console.log('🎯 EmployeeFormModern: Rendering form with:', {
    id: employee?.id,
    name: employee ? `${employee.nombre} ${employee.apellido}` : 'New Employee',
    mode: isEditMode ? 'edit' : 'create',
    isLoading,
    customFieldsCount: configuration?.custom_fields?.length || 0
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
            customFields={configuration?.custom_fields || []}
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
