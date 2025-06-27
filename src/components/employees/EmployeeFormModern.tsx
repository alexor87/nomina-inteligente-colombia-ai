
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
  onDataRefresh?: (updatedEmployee: Employee) => void;
}

export const EmployeeFormModern = ({ employee, onSuccess, onCancel, onDataRefresh }: EmployeeFormModernProps) => {
  console.log('🔄 EmployeeFormModern: Component rendered/re-rendered');
  console.log('🔄 EmployeeFormModern: Received employee prop:', employee);
  console.log('📊 EmployeeFormModern: Employee affiliations from props:', {
    eps: employee?.eps,
    afp: employee?.afp,
    arl: employee?.arl,
    cajaCompensacion: employee?.cajaCompensacion,
    tipoCotizanteId: employee?.tipoCotizanteId,
    subtipoCotizanteId: employee?.subtipoCotizanteId
  });
  
  // Local state to handle employee data updates
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
  } = useEmployeeForm(currentEmployee);

  // Handle data refresh callback
  const handleDataRefresh = (updatedEmployee: Employee) => {
    console.log('🔄 EmployeeFormModern: Received updated employee data from submission:', updatedEmployee);
    console.log('📊 Updated affiliations in form component:', {
      eps: updatedEmployee.eps,
      afp: updatedEmployee.afp,
      arl: updatedEmployee.arl,
      cajaCompensacion: updatedEmployee.cajaCompensacion,
      tipoCotizanteId: updatedEmployee.tipoCotizanteId,
      subtipoCotizanteId: updatedEmployee.subtipoCotizanteId
    });
    
    // Update local state
    setCurrentEmployee(updatedEmployee);
    
    // Notify parent component
    onDataRefresh?.(updatedEmployee);
  };

  const { handleSubmit: handleFormSubmission, isLoading } = useEmployeeFormSubmission(
    currentEmployee, 
    onSuccess, 
    handleDataRefresh
  );
  
  const {
    tiposCotizante,
    subtiposCotizante,
    isLoadingTipos,
    isLoadingSubtipos,
    tiposError,
    handleTipoCotizanteChange
  } = useTipoCotizanteManager(currentEmployee, setValue);

  // Update currentEmployee when employee prop changes (including on initial load)
  useEffect(() => {
    console.log('🔄 EmployeeFormModern: Employee prop changed:', employee);
    console.log('📊 EmployeeFormModern: New employee affiliations:', {
      eps: employee?.eps,
      afp: employee?.afp,
      arl: employee?.arl,
      cajaCompensacion: employee?.cajaCompensacion,
      tipoCotizanteId: employee?.tipoCotizanteId,
      subtipoCotizanteId: employee?.subtipoCotizanteId,
      updatedAt: employee?.updatedAt
    });
    
    if (employee) {
      console.log('📋 Employee data for form (COMPLETE):', {
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
        tipoCotizanteId: employee.tipoCotizanteId,
        subtipoCotizanteId: employee.subtipoCotizanteId,
        updatedAt: employee.updatedAt,
        // Log all available fields
        ...employee
      });
      setCurrentEmployee(employee);
    }
  }, [employee?.id, employee?.updatedAt, employee]); // Added updatedAt to trigger re-population on data changes

  const onSubmit = async (data: any) => {
    if (!companyId) return;
    console.log('🚀 EmployeeFormModern: Form submission triggered with data:', data);
    console.log('📊 Affiliations being submitted:', {
      eps: data.eps,
      afp: data.afp,
      arl: data.arl,
      cajaCompensacion: data.cajaCompensacion,
      tipoCotizanteId: data.tipoCotizanteId,
      subtipoCotizanteId: data.subtipoCotizanteId
    });
    await handleFormSubmission(data, companyId, subtiposCotizante);
  };

  const handleDuplicate = () => {
    console.log('Duplicating employee...');
  };

  console.log('🎯 EmployeeFormModern: Rendering form with currentEmployee:', {
    id: currentEmployee?.id,
    affiliations: {
      eps: currentEmployee?.eps,
      afp: currentEmployee?.afp,
      arl: currentEmployee?.arl,
      cajaCompensacion: currentEmployee?.cajaCompensacion
    }
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
