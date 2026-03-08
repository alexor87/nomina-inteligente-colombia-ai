
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

  // Memoize the data refresh handler to prevent unnecessary re-renders
  const memoizedDataRefresh = useMemo(() => {
    return (updatedEmployee: EmployeeUnified) => {
      console.log('🔄 Data refresh callback triggered');
      onDataRefresh?.(updatedEmployee);
    };
  }, [onDataRefresh]);

  // Use edit submission hook for employee updates
  const { handleSubmit: handleEditSubmission, isSubmitting: isSubmittingEdit } = useEmployeeEditSubmission(
    employee || null,
    onSuccess
  );

  // Use robust submission hook for new employees
  const { 
    submitEmployee, 
    isSubmitting: isSubmittingCreate
  } = useEmployeeFormSubmissionRobust();

  const isLoading = isEditMode ? isSubmittingEdit : isSubmittingCreate;
  console.log('🔥 Loading state:', isLoading, 'Mode:', isEditMode ? 'edit' : 'create');

  const onSubmit = async (data: any) => {
    console.log('🔥🔥🔥 MAIN FORM SUBMISSION TRIGGERED 🔥🔥🔥');
    console.log('🔥 Form data received in onSubmit:', data);
    console.log('🔥 Submission mode:', isEditMode ? 'edit' : 'create');
    console.log('🔥 IsDraft:', isDraft);
    console.log('🔥 Employee:', employee ? `${employee.nombre} ${employee.apellido}` : 'none');
    
    // Verificar que tenemos los datos necesarios
    if (!data) {
      console.error('❌ No form data received');
      return;
    }
    
    try {
      if (isEditMode && employee) {
        console.log('🔥 Processing EDIT submission');
        console.log('🔥 Employee ID:', employee.id);
        console.log('🔥 Company ID:', employee.company_id || employee.empresaId);
        
        // Preparar datos para edición
        const editData = {
          ...data,
          id: employee.id,
          company_id: employee.company_id || employee.empresaId,
          isDraft
        };
        
        console.log('📤 Sending edit data:', editData);
        const result = await handleEditSubmission(editData);
        console.log('📥 Edit result:', result);
        
      } else {
        console.log('🔥 Processing CREATE submission');
        if (!companyId) {
          console.error('❌ No company ID available for creation');
          return;
        }

        const formDataWithCompany = {
          ...data,
          empresaId: companyId,
          company_id: companyId,
          custom_fields: data.custom_fields || {},
          isDraft
        };

        console.log('📤 Sending create data:', formDataWithCompany);
        const result = await submitEmployee(formDataWithCompany);
        
        if (result.success) {
          console.log('✅ Create submission completed successfully');
          onSuccess();
          if (result.data?.id && memoizedDataRefresh) {
            const updatedEmployee: EmployeeUnified = { ...formDataWithCompany, id: result.data.id } as EmployeeUnified;
            memoizedDataRefresh(updatedEmployee);
          }
        } else {
          console.error('❌ Create submission failed:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error in form submission:', error);
      
      // Mostrar error al usuario si es posible
      if (error instanceof Error) {
        alert(`Error al guardar: ${error.message}`);
      } else {
        alert('Error desconocido al guardar el empleado');
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
    isLoading,
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
            isLoading={isLoading}
          />
        </form>
      </div>
    </div>
  );
};
