
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Employee } from '@/types';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { useSecurityEntities } from '@/hooks/useSecurityEntities';
import { useTiposCotizante } from '@/hooks/useTiposCotizante';
import { 
  Copy,
  CheckCircle2,
  Save
} from 'lucide-react';

// Import refactored components
import { NavigationSidebar } from './form/NavigationSidebar';
import { PersonalInfoSection } from './form/PersonalInfoSection';
import { LaborInfoSection } from './form/LaborInfoSection';
import { BankingInfoSection } from './form/BankingInfoSection';
import { AffiliationsSection } from './form/AffiliationsSection';
import { useEmployeeForm } from './form/useEmployeeForm';
import { EmployeeFormData } from './form/types';

interface EmployeeFormModernProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EmployeeFormModern = ({ employee, onSuccess, onCancel }: EmployeeFormModernProps) => {
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

  // Handle tipo cotizante change
  const handleTipoCotizanteChange = async (tipoCotizanteId: string) => {
    setValue('tipoCotizanteId', tipoCotizanteId);
    setValue('subtipoCotizanteId', ''); // Clear subtipo when changing tipo
    
    if (tipoCotizanteId) {
      await fetchSubtipos(tipoCotizanteId);
    } else {
      clearSubtipos();
    }
  };

  // Load subtipos when employee has tipoCotizanteId
  useEffect(() => {
    if (employee?.tipoCotizanteId) {
      fetchSubtipos(employee.tipoCotizanteId);
    }
  }, [employee?.tipoCotizanteId, fetchSubtipos]);

  const onSubmit = async (data: EmployeeFormData) => {
    console.log('🚀 EmployeeFormModern onSubmit called with data:', data);
    console.log('📝 Employee being edited:', employee);
    
    if (!companyId) {
      console.error('No company ID available');
      return;
    }

    const employeeData = {
      empresaId: companyId,
      ...data,
      salarioBase: Number(data.salarioBase)
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
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h1>
              <p className="text-gray-600 mt-1">
                {employee ? 'Actualiza la información del empleado' : 'Completa la información para crear un nuevo empleado'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {employee && (
                <Button variant="outline" onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </Button>
              )}
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
            
            {/* Personal Information Section */}
            <div id="section-personal">
              <PersonalInfoSection
                control={control}
                errors={errors}
                watchedValues={watchedValues}
                setValue={setValue}
                watch={watch}
              />
            </div>

            {/* Labor Information Section */}
            <div id="section-laboral">
              <LaborInfoSection
                control={control}
                errors={errors}
                watchedValues={watchedValues}
                setValue={setValue}
                watch={watch}
                arlRiskLevels={arlRiskLevels}
                register={register}
              />
            </div>

            {/* Banking Information Section */}
            <div id="section-bancaria">
              <BankingInfoSection
                control={control}
                errors={errors}
                watchedValues={watchedValues}
                setValue={setValue}
                watch={watch}
                register={register}
              />
            </div>

            {/* Affiliations Section */}
            <div id="section-afiliaciones">
              <AffiliationsSection
                control={control}
                errors={errors}
                watchedValues={watchedValues}
                setValue={setValue}
                watch={watch}
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
              />
            </div>

            {/* Custom Fields Section - Only if configured */}
            {configuration.customFields.length > 0 && (
              <div id="section-personalizados">
                {/* Custom fields implementation would go here */}
              </div>
            )}
          </form>
        </div>

        {/* Fixed Bottom Bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">
                  Progreso: {completionPercentage}% completado
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="isDraft"
                  checked={isDraft}
                  onCheckedChange={setIsDraft}
                />
                <Label htmlFor="isDraft" className="text-sm">Guardar como borrador</Label>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isDraft ? 'Guardar Borrador' : 'Guardar'}
              </Button>
              
              {!isDraft && (
                <Button 
                  type="submit"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isLoading || completionPercentage < 80}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isLoading ? 'Guardando...' : employee ? 'Actualizar y Activar' : 'Crear y Activar'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
