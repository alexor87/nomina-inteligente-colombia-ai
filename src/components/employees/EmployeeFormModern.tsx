
import { useEffect } from 'react';
import { Employee } from '@/types';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useSecurityEntities } from '@/hooks/useSecurityEntities';
import { useEmployeeFormSubmission } from '@/hooks/useEmployeeFormSubmission';
import { useTipoCotizanteManager } from '@/hooks/useTipoCotizanteManager';

// Import refactored components
import { NavigationSidebar } from './form/NavigationSidebar';
import { EmployeeFormHeader } from './form/EmployeeFormHeader';
import { EmployeeFormContent } from './form/EmployeeFormContent';
import { EmployeeFormFooter } from './form/EmployeeFormFooter';
import { useEmployeeForm } from './form/useEmployeeForm';

interface EmployeeFormModernProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EmployeeFormModern = ({ employee, onSuccess, onCancel }: EmployeeFormModernProps) => {
  console.log('🔄 EmployeeFormModern: Received employee prop:', employee);
  
  const { configuration } = useEmployeeGlobalConfiguration();
  const { epsEntities, afpEntities, arlEntities, compensationFunds, isLoading: entitiesLoading } = useSecurityEntities();
  
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

  const { handleSubmit: handleFormSubmission, isLoading } = useEmployeeFormSubmission(employee, onSuccess);
  
  const {
    tiposCotizante,
    subtiposCotizante,
    isLoadingTipos,
    isLoadingSubtipos,
    tiposError,
    handleTipoCotizanteChange
  } = useTipoCotizanteManager(employee, setValue);

  // Debug: Log when employee prop changes
  useEffect(() => {
    console.log('🔄 EmployeeFormModern: Employee prop changed:', employee);
    if (employee) {
      console.log('📋 Employee data for form:', {
        id: employee.id,
        nombre: employee.nombre,
        apellido: employee.apellido,
        cedula: employee.cedula,
        email: employee.email,
        salarioBase: employee.salarioBase,
        // Log all available fields
        ...employee
      });
    }
  }, [employee]);

  const onSubmit = async (data: any) => {
    if (!companyId) return;
    await handleFormSubmission(data, companyId, subtiposCotizante);
  };

  const handleDuplicate = () => {
    console.log('Duplicating employee...');
  };

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
            epsEntities={epsEntities}
            afpEntities={afpEntities}
            arlEntities={arlEntities}
            compensationFunds={compensationFunds}
            tiposCotizante={tiposCotizante}
            subtiposCotizante={subtiposCotizante}
            isLoadingTipos={isLoadingTipos}
            isLoadingSubtipos={isLoadingSubtipos}
            tiposError={tiposError}
            handleTipoCotizanteChange={handleTipoCotizanteChange}
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
