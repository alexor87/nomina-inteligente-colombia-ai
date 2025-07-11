
import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';
import { useAffiliationEntities } from '@/hooks/useAffiliationEntities';

interface AffiliationsSectionProps {
  control?: Control<EmployeeFormData>;
  errors?: FieldErrors<EmployeeFormData>;
  watchedValues?: EmployeeFormData;
  setValue?: UseFormSetValue<EmployeeFormData>;
  watch?: UseFormWatch<EmployeeFormData>;
  formData?: any;
  updateFormData?: (data: any) => void;
}

export const AffiliationsSection: React.FC<AffiliationsSectionProps> = ({
  control,
  errors = {},
  watchedValues,
  setValue,
  watch,
  formData,
  updateFormData
}) => {
  const isWizardMode = !!formData && !!updateFormData;

  if (!control && !isWizardMode) {
    return null;
  }

  // Watch the tipo cotizante to filter subtipos
  const selectedTipoCotizanteId = watch ? watch('tipoCotizanteId') : watchedValues?.tipoCotizanteId;
  
  // Get dynamic options from the database
  const {
    epsOptions,
    afpOptions,
    arlOptions,
    compensationOptions,
    tipoCotizanteOptions,
    subtipoCotizanteOptions,
    isLoading
  } = useAffiliationEntities(selectedTipoCotizanteId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Afiliaciones</h3>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando opciones...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Afiliaciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="eps"
            label="EPS"
            type="select"
            control={control!}
            errors={errors}
            options={epsOptions.length > 0 ? epsOptions : [
              { value: 'Sanitas', label: 'Sanitas' },
              { value: 'Compensar', label: 'Compensar' },
              { value: 'Nueva EPS', label: 'Nueva EPS' },
              { value: 'SURA', label: 'SURA' },
              { value: 'Famisanar', label: 'Famisanar' }
            ]}
            placeholder="Seleccionar EPS"
          />

          <FormField
            name="afp"
            label="AFP (Fondo de Pensiones)"
            type="select"
            control={control!}
            errors={errors}
            options={afpOptions.length > 0 ? afpOptions : [
              { value: 'Porvenir', label: 'Porvenir' },
              { value: 'Protección', label: 'Protección' },
              { value: 'Colfondos', label: 'Colfondos' },
              { value: 'Old Mutual', label: 'Old Mutual' }
            ]}
            placeholder="Seleccionar AFP"
          />

          <FormField
            name="arl"
            label="ARL"
            type="select"
            control={control!}
            errors={errors}
            options={arlOptions.length > 0 ? arlOptions : [
              { value: 'Positiva', label: 'Positiva' },
              { value: 'SURA', label: 'SURA' },
              { value: 'Colmena', label: 'Colmena' },
              { value: 'Mapfre', label: 'Mapfre' }
            ]}
            placeholder="Seleccionar ARL"
          />

          <FormField
            name="cajaCompensacion"
            label="Caja de Compensación"
            type="select"
            control={control!}
            errors={errors}
            options={compensationOptions.length > 0 ? compensationOptions : [
              { value: 'Compensar', label: 'Compensar' },
              { value: 'Colsubsidio', label: 'Colsubsidio' },
              { value: 'Comfama', label: 'Comfama' },
              { value: 'Cafam', label: 'Cafam' }
            ]}
            placeholder="Seleccionar Caja de Compensación"
          />

          <FormField
            name="tipoCotizanteId"
            label="Tipo de Cotizante"
            type="select"
            control={control!}
            errors={errors}
            options={tipoCotizanteOptions.length > 0 ? tipoCotizanteOptions : [
              { value: '01', label: '01 - Empleado' },
              { value: '02', label: '02 - Pensionado' },
              { value: '03', label: '03 - Independiente' },
              { value: '19', label: '19 - Aprendiz SENA' },
              { value: '21', label: '21 - Estudiante' }
            ]}
            placeholder="Seleccionar Tipo de Cotizante"
          />

          <FormField
            name="subtipoCotizanteId"
            label="Subtipo de Cotizante"
            type="select"
            control={control!}
            errors={errors}
            options={subtipoCotizanteOptions.length > 0 ? subtipoCotizanteOptions : [
              { value: '00', label: '00 - Cotizante' },
              { value: '01', label: '01 - Beneficiario' },
              { value: '02', label: '02 - Adicional' }
            ]}
            placeholder="Seleccionar Subtipo de Cotizante"
            disabled={!selectedTipoCotizanteId}
          />

          <FormField
            name="regimenSalud"
            label="Régimen de Salud"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: 'contributivo', label: 'Contributivo' },
              { value: 'subsidiado', label: 'Subsidiado' },
              { value: 'especial', label: 'Especial' }
            ]}
            placeholder="Seleccionar Régimen"
          />

          <FormField
            name="estadoAfiliacion"
            label="Estado de Afiliación"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'completa', label: 'Completa' },
              { value: 'inconsistente', label: 'Inconsistente' }
            ]}
            placeholder="Seleccionar Estado"
          />
        </div>
      </div>
    </div>
  );
};
