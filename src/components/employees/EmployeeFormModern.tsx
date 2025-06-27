
import { useEffect } from 'react';
import { Employee } from '@/types';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { useSecurityEntities } from '@/hooks/useSecurityEntities';
import { useTiposCotizante } from '@/hooks/useTiposCotizante';

// Import refactored components
import { NavigationSidebar } from './form/NavigationSidebar';
import { EmployeeFormHeader } from './form/EmployeeFormHeader';
import { EmployeeFormContent } from './form/EmployeeFormContent';
import { EmployeeFormFooter } from './form/EmployeeFormFooter';
import { useEmployeeForm } from './form/useEmployeeForm';
import { EmployeeFormData } from './form/types';

interface EmployeeFormModernProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EmployeeFormModern = ({ employee, onSuccess, onCancel }: EmployeeFormModernProps) => {
  console.log('🔄 EmployeeFormModern: Received employee prop:', employee);
  
  const { configuration } = useEmployeeGlobalConfiguration();
  const { createEmployee, updateEmployee, isLoading } = useEmployeeCRUD();
  const { epsEntities, afpEntities, arlEntities, compensationFunds, isLoading: entitiesLoading } = useSecurityEntities();
  const { 
    tiposCotizante, 
    subtiposCotizante, 
    isLoadingTipos, 
    isLoadingSubtipos, 
    error: tiposError,
    fetchSubtipos,
    clearSubtipos 
  } = useTiposCotizante();
  
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

  // Handle tipo cotizante change - improved with better error handling
  const handleTipoCotizanteChange = async (tipoCotizanteId: string) => {
    console.log('🔄 Changing tipo cotizante to:', tipoCotizanteId);
    setValue('tipoCotizanteId', tipoCotizanteId);
    setValue('subtipoCotizanteId', ''); // Always clear subtipo when changing tipo
    
    if (tipoCotizanteId) {
      try {
        await fetchSubtipos(tipoCotizanteId);
      } catch (error) {
        console.error('Error fetching subtipos:', error);
      }
    } else {
      clearSubtipos();
    }
  };

  // Load subtipos when employee has tipoCotizanteId - only on mount
  useEffect(() => {
    if (employee?.tipoCotizanteId) {
      console.log('🔄 Loading subtipos for tipoCotizanteId:', employee.tipoCotizanteId);
      fetchSubtipos(employee.tipoCotizanteId);
    }
  }, [employee?.tipoCotizanteId]); // Removed fetchSubtipos from dependencies to avoid loops

  const onSubmit = async (data: EmployeeFormData) => {
    console.log('🚀 EmployeeFormModern onSubmit called with data:', data);
    console.log('📝 Employee being edited:', employee);
    
    if (!companyId) {
      console.error('No company ID available');
      return;
    }

    // Validate subtipo if required
    if (data.tipoCotizanteId && subtiposCotizante.length > 0 && !data.subtipoCotizanteId) {
      console.error('Subtipo de cotizante is required for this tipo');
      return;
    }

    const employeeData = {
      empresaId: companyId,
      ...data,
      salarioBase: Number(data.salarioBase),
      // Clear subtipoCotizanteId if no subtipos are available
      subtipoCotizanteId: subtiposCotizante.length > 0 ? data.subtipoCotizanteId : null
    };

    console.log('📋 Employee data to be sent:', employeeData);

    let result;
    if (employee) {
      console.log('🔄 Updating employee with ID:', employee.id);
      result = await updateEmployee(employee.id, employeeData);
    } else {
      console.log('➕ Creating new employee');
      result = await createEmployee(employeeData);
    }

    console.log('✅ Operation result:', result);

    if (result.success) {
      console.log('🎉 EmployeeFormModern: Operation successful, calling onSuccess');
      onSuccess();
    } else {
      console.error('❌ EmployeeFormModern: Operation failed:', result.error);
    }
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
