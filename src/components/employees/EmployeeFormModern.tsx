
import { useMemo, useState } from 'react';
import { EmployeeUnified } from '@/types/employee-unified';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeSubmission } from '@/hooks/useEmployeeSubmission';

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
  console.log('🔥 EMPLOYEE FORM MODERN - RENDER START');
  console.log('🔥 Employee data:', employee ? `${employee.nombre} ${employee.apellido} (${employee.id})` : 'undefined');
  
  const isEditMode = !!employee;
  console.log('🔥 Edit mode:', isEditMode);
  
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
    scrollToSection,
    formState,
    isValid,
    isDirty
  } = useEmployeeForm(employee);

  console.log('🔥 Form state from hook:', {
    completionPercentage,
    isDraft,
    companyId,
    errorsCount: Object.keys(errors).length,
    isValid,
    isDirty,
    hasEmployee: !!employee
  });

  // ✅ KISS: Single unified submission hook
  const { handleSubmit: handleSubmission, isSubmitting } = useEmployeeSubmission({
    employee,
    onSuccess
  });
  console.log('🔥 Loading state:', isSubmitting, 'Mode:', isEditMode ? 'edit' : 'create');

  // ✅ KISS: Simplified submission handler
  const onSubmit = async (data: any) => {
    console.log('🔥 FORM SUBMISSION - Unified handler');
    console.log('👤 Mode:', isEditMode ? 'EDIT' : 'CREATE');
    console.log('📝 Form data:', data);
    
    // Add company and draft info to data
    const submissionData = {
      ...data,
      empresaId: companyId,
      company_id: companyId,
      isDraft
    };
    
    await handleSubmission(submissionData);
    
    // Call onDataRefresh if available (for edit mode)
    if (onDataRefresh && employee) {
      try {
        console.log('🔄 Refreshing data after submission...');
        onDataRefresh(employee);
      } catch (refreshError) {
        console.warn('⚠️ Error refreshing data:', refreshError);
      }
    }
  };

  const handleDuplicate = () => {
    console.log('📋 Duplicating employee...');
    // TODO: Implement duplication logic
  };

  console.log('🎯 About to render form with state:', {
    id: employee?.id,
    name: employee ? `${employee.nombre} ${employee.apellido}` : 'New Employee',
    mode: isEditMode ? 'edit' : 'create',
    isLoading: isSubmitting,
    customFieldsCount: configuration?.custom_fields?.length || 0,
    completionPercentage,
    formIsValid: isValid,
    formIsDirty: isDirty
  });

  return (
    <div className="flex h-screen bg-white">
      {/* Fixed Sidebar */}
      <div className="flex-shrink-0">
        <NavigationSidebar 
          activeSection={activeSection}
          completionPercentage={completionPercentage}
          scrollToSection={scrollToSection}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <EmployeeFormHeader
          employee={employee}
          onCancel={onCancel}
          onDuplicate={handleDuplicate}
        />

        <form 
          id="employee-form"
          className="employee-form flex flex-col flex-1"
          onSubmit={(e) => {
            console.log('🔥 FORM onSubmit EVENT TRIGGERED - ENHANCED');
            console.log('🔥 Event details:', e);
            console.log('🔥 Form validation before submit:', {
              isValid,
              errors: Object.keys(errors),
              isDraft
            });
            
            e.preventDefault();
            e.stopPropagation();
            
            // Si hay errores de validación y no es borrador, no enviar
            if (!isValid && !isDraft) {
              console.log('❌ Form has validation errors and is not draft, preventing submission');
              console.log('❌ Validation errors:', errors);
              return false;
            }
            
            // Call react-hook-form's handleSubmit manually
            console.log('✅ Proceeding with form submission');
            const submitHandler = handleSubmit(onSubmit);
            submitHandler(e);
          }}
        >
          <div className="flex-1 overflow-y-auto">
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
          </div>

          <EmployeeFormFooter
            employee={employee}
            completionPercentage={completionPercentage}
            isDraft={isDraft}
            setIsDraft={setIsDraft}
            isLoading={isSubmitting}
          />
        </form>
      </div>
    </div>
  );
};
