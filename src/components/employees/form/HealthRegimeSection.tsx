
import { Control, FieldErrors } from 'react-hook-form';
import { FormField } from './FormField';
import { EmployeeFormData } from './types';

interface HealthRegimeSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
}

export const HealthRegimeSection = ({ control, errors }: HealthRegimeSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        name="regimenSalud"
        label="Régimen de Salud"
        type="select"
        control={control}
        errors={errors}
        options={[
          { value: 'contributivo', label: 'Contributivo' },
          { value: 'subsidiado', label: 'Subsidiado' }
        ]}
      />
      
      <FormField
        name="estadoAfiliacion"
        label="Estado de Afiliación"
        type="select"
        control={control}
        errors={errors}
        options={[
          { value: 'completa', label: 'Completa' },
          { value: 'pendiente', label: 'Pendiente' },
          { value: 'inconsistente', label: 'Inconsistente' }
        ]}
      />
    </div>
  );
};
