
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
        // ✅ FIXED: Create updated employee with proper casting and type compatibility
        const updatedEmployee: EmployeeUnified = { 
          id: result.employeeId,
          company_id: companyId,
          empresaId: companyId,
          nombre: formDataWithCompany.nombre || '',
          apellido: formDataWithCompany.apellido || '',
          cedula: formDataWithCompany.cedula || '',
          tipoDocumento: (formDataWithCompany.tipoDocumento || 'CC') as 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT', // ✅ FIXED: Proper type casting
          email: formDataWithCompany.email,
          telefono: formDataWithCompany.telefono,
          salarioBase: formDataWithCompany.salarioBase || 0,
          tipoContrato: (formDataWithCompany.tipoContrato || 'indefinido') as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje', // ✅ FIXED: Type casting
          fechaIngreso: formDataWithCompany.fechaIngreso || new Date().toISOString().split('T')[0],
          periodicidadPago: (formDataWithCompany.periodicidadPago || 'mensual') as 'mensual' | 'quincenal', // ✅ FIXED: Type casting
          estado: (formDataWithCompany.estado || 'activo') as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad' | 'eliminado', // ✅ FIXED: Type casting
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Add other optional fields with proper type casting
          segundoNombre: formDataWithCompany.segundoNombre,
          fechaNacimiento: formDataWithCompany.fechaNacimiento,
          sexo: formDataWithCompany.sexo as 'M' | 'F' | 'O' | undefined, // ✅ FIXED: Type casting
          direccion: formDataWithCompany.direccion,
          ciudad: formDataWithCompany.ciudad,
          departamento: formDataWithCompany.departamento,
          cargo: formDataWithCompany.cargo,
          eps: formDataWithCompany.eps,
          afp: formDataWithCompany.afp,
          arl: formDataWithCompany.arl,
          cajaCompensacion: formDataWithCompany.cajaCompensacion,
          banco: formDataWithCompany.banco,
          tipoCuenta: (formDataWithCompany.tipoCuenta || 'ahorros') as 'ahorros' | 'corriente', // ✅ FIXED: Type casting
          numeroCuenta: formDataWithCompany.numeroCuenta,
          titularCuenta: formDataWithCompany.titularCuenta,
          formaPago: (formDataWithCompany.formaPago || 'dispersion') as 'dispersion' | 'manual', // ✅ FIXED: Type casting
          regimenSalud: (formDataWithCompany.regimenSalud || 'contributivo') as 'contributivo' | 'subsidiado', // ✅ FIXED: Type casting
          estadoAfiliacion: (formDataWithCompany.estadoAfiliacion || 'pendiente') as 'completa' | 'pendiente' | 'inconsistente', // ✅ FIXED: Type casting
          customFields: formDataWithCompany.customFields || {},
          // Handle other fields with proper defaults and type casting
          fechaFirmaContrato: formDataWithCompany.fechaFirmaContrato,
          fechaFinalizacionContrato: formDataWithCompany.fechaFinalizacionContrato,
          tipoJornada: (formDataWithCompany.tipoJornada || 'completa') as 'completa' | 'parcial' | 'horas', // ✅ FIXED: Type casting
          diasTrabajo: formDataWithCompany.diasTrabajo || 30,
          horasTrabajo: formDataWithCompany.horasTrabajo || 8,
          beneficiosExtralegales: formDataWithCompany.beneficiosExtralegales || false,
          codigoCiiu: formDataWithCompany.codigoCiiu,
          nivelRiesgoArl: formDataWithCompany.nivelRiesgoArl as 'I' | 'II' | 'III' | 'IV' | 'V' | undefined, // ✅ FIXED: Type casting
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
