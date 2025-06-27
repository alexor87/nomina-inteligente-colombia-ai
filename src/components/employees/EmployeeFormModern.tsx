
import { useEffect, useState } from 'react';
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
  
  // NEW: Local state to handle employee data updates
  const [currentEmployee, setCurrentEmployee] = useState<Employee | undefined>(employee);
  
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
  } = useEmployeeForm(currentEmployee); // Use currentEmployee instead of employee

  // NEW: Handle data refresh callback
  const handleDataRefresh = (updatedEmployee: Employee) => {
    console.log('🔄 EmployeeFormModern: Received updated employee data:', updatedEmployee);
    console.log('📊 Updated affiliations:', {
      eps: updatedEmployee.eps,
      afp: updatedEmployee.afp,
      arl: updatedEmployee.arl,
      cajaCompensacion: updatedEmployee.cajaCompensacion
    });
    setCurrentEmployee(updatedEmployee);
  };

  const { handleSubmit: handleFormSubmission, isLoading } = useEmployeeFormSubmission(
    currentEmployee, 
    onSuccess, 
    handleDataRefresh // Pass the refresh callback
  );
  
  const {
    tiposCotizante,
    subtiposCotizante,
    isLoadingTipos,
    isLoadingSubtipos,
    tiposError,
    handleTipoCotizanteChange
  } = useTipoCotizanteManager(currentEmployee, setValue); // Use currentEmployee

  // Update currentEmployee when employee prop changes
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
        // Log affiliations specifically
        eps: employee.eps,
        afp: employee.afp,
        arl: employee.arl,
        cajaCompensacion: employee.cajaCompensacion,
        // Log all available fields
        ...employee
      });
      setCurrentEmployee(employee);
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
          employee={currentEmployee}
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
          employee={currentEmployee}
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
