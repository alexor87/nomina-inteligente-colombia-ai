
import React from 'react';
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';

interface AffiliationsSectionProps {
  control?: Control<EmployeeFormData>;
  errors?: FieldErrors<EmployeeFormData>;
  watchedValues?: EmployeeFormData;
  setValue?: UseFormSetValue<EmployeeFormData>;
  formData?: any;
  updateFormData?: (data: any) => void;
}

export const AffiliationsSection: React.FC<AffiliationsSectionProps> = ({
  control,
  errors = {},
  watchedValues,
  setValue,
  formData,
  updateFormData
}) => {
  const isWizardMode = !!formData && !!updateFormData;

  if (!control && !isWizardMode) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Afiliaciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="eps"
            label="EPS"
            type="text"
            control={control!}
            errors={errors}
            placeholder="Sanitas, Compensar, Nueva EPS, etc."
          />

          <FormField
            name="afp"
            label="AFP (Fondo de Pensiones)"
            type="text"
            control={control!}
            errors={errors}
            placeholder="Porvenir, Protección, Colfondos, etc."
          />

          <FormField
            name="arl"
            label="ARL"
            type="text"
            control={control!}
            errors={errors}
            placeholder="Positiva, SURA, Colmena, etc."
          />

          <FormField
            name="cajaCompensacion"
            label="Caja de Compensación"
            type="text"
            control={control!}
            errors={errors}
            placeholder="Compensar, Colsubsidio, Comfama, etc."
          />

          <FormField
            name="tipoCotizanteId"
            label="Tipo de Cotizante"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: '01', label: '01 - Empleado' },
              { value: '02', label: '02 - Pensionado' },
              { value: '03', label: '03 - Independiente' },
              { value: '19', label: '19 - Aprendiz SENA' },
              { value: '21', label: '21 - Estudiante' }
            ]}
          />

          <FormField
            name="subtipoCotizanteId"
            label="Subtipo de Cotizante"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: '00', label: '00 - Cotizante' },
              { value: '01', label: '01 - Beneficiario' },
              { value: '02', label: '02 - Adicional' }
            ]}
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
          />

          <FormField
            name="estadoAfiliacion"
            label="Estado de Afiliación"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'afiliado', label: 'Afiliado' },
              { value: 'retirado', label: 'Retirado' }
            ]}
          />
        </div>
      </div>
    </div>
  );
};
