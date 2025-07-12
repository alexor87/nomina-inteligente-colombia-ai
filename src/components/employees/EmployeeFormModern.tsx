
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

  const isLoading = isSubmitting;

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
      company_id: companyId,
      // Asegurar que custom_fields está presente y es un objeto
      customFields: data.customFields || {}
    };

    // Use robust submission for both create and update operations
    const result = await submitEmployee(formDataWithCompany);
    
    if (result.success) {
      console.log('✅ Form submission completed successfully');
      onSuccess();
      if (result.employeeId && memoizedDataRefresh) {
        // ✅ FIXED: Create updated employee with proper casting
        const updatedEmployee: EmployeeUnified = { 
          id: result.employeeId,
          company_id: companyId,
          empresaId: companyId,
          nombre: formDataWithCompany.nombre || '',
          apellido: formDataWithCompany.apellido || '',
          cedula: formDataWithCompany.cedula || '',
          tipoDocumento: formDataWithCompany.tipoDocumento || 'CC',
          email: formDataWithCompany.email,
          telefono: formDataWithCompany.telefono,
          salarioBase: formDataWithCompany.salarioBase || 0,
          tipoContrato: formDataWithCompany.tipoContrato || 'indefinido',
          fechaIngreso: formDataWithCompany.fechaIngreso || new Date().toISOString().split('T')[0],
          periodicidadPago: formDataWithCompany.periodicidadPago || 'mensual',
          estado: formDataWithCompany.estado || 'activo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Add other optional fields
          segundoNombre: formDataWithCompany.segundoNombre,
          fechaNacimiento: formDataWithCompany.fechaNacimiento,
          sexo: formDataWithCompany.sexo,
          direccion: formDataWithCompany.direccion,
          ciudad: formDataWithCompany.ciudad,
          departamento: formDataWithCompany.departamento,
          cargo: formDataWithCompany.cargo,
          eps: formDataWithCompany.eps,
          afp: formDataWithCompany.afp,
          arl: formDataWithCompany.arl,
          cajaCompensacion: formDataWithCompany.cajaCompensacion,
          banco: formDataWithCompany.banco,
          tipoCuenta: formDataWithCompany.tipoCuenta || 'ahorros',
          numeroCuenta: formDataWithCompany.numeroCuenta,
          titularCuenta: formDataWithCompany.titularCuenta,
          formaPago: formDataWithCompany.formaPago || 'dispersion',
          regimenSalud: formDataWithCompany.regimenSalud || 'contributivo',
          estadoAfiliacion: formDataWithCompany.estadoAfiliacion || 'pendiente',
          customFields: formDataWithCompany.customFields || {},
          // Handle other fields with proper defaults
          fechaFirmaContrato: formDataWithCompany.fechaFirmaContrato,
          fechaFinalizacionContrato: formDataWithCompany.fechaFinalizacionContrato,
          tipoJornada: formDataWithCompany.tipoJornada || 'completa',
          diasTrabajo: formDataWithCompany.diasTrabajo || 30,
          horasTrabajo: formDataWithCompany.horasTrabajo || 8,
          beneficiosExtralegales: formDataWithCompany.beneficiosExtralegales || false,
          codigoCiiu: formDataWithCompany.codigoCiiu,
          nivelRiesgoArl: formDataWithCompany.nivelRiesgoArl,
          centroCostos: formDataWithCompany.centroCostos,
          clausulasEspeciales: formDataWithCompany.clausulasEspeciales,
          tipoCotizanteId: formDataWithCompany.tipoCotizanteId,
          subtipoCotizanteId: formDataWithCompany.subtipoCotizanteId
        };
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
