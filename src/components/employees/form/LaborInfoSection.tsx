
import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';
import { CONTRACT_TYPES } from '@/types/employee-config';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';

interface LaborInfoSectionProps {
  control?: Control<EmployeeFormData>;
  errors?: FieldErrors<EmployeeFormData>;
  watchedValues?: EmployeeFormData;
  setValue?: UseFormSetValue<EmployeeFormData>;
  watch?: UseFormWatch<EmployeeFormData>;
  arlRiskLevels?: { value: string; label: string; percentage: string }[];
  register?: any;
  formData?: any;
  updateFormData?: (data: any) => void;
}

export const LaborInfoSection: React.FC<LaborInfoSectionProps> = ({
  control,
  errors = {},
  watchedValues,
  setValue,
  watch,
  arlRiskLevels = [],
  register,
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="salarioBase"
            label="Salario Base"
            type="number"
            control={control!}
            errors={errors}
            required
            placeholder="2500000"
          />

          <FormField
            name="tipoContrato"
            label="Tipo de Contrato"
            type="select"
            control={control!}
            errors={errors}
            required
            options={[
              { value: 'indefinido', label: 'Indefinido' },
              { value: 'fijo', label: 'Término Fijo' },
              { value: 'obra', label: 'Obra' },
              { value: 'aprendizaje', label: 'Contrato de Aprendizaje' }
            ]}
          />

          <FormField
            name="fechaIngreso"
            label="Fecha de Ingreso"
            type="date"
            control={control!}
            errors={errors}
            required
          />

          <FormField
            name="periodicidadPago"
            label="Periodicidad de Pago"
            type="select"
            control={control!}
            errors={errors}
            required
            options={[
              { value: 'mensual', label: 'Mensual' },
              { value: 'quincenal', label: 'Quincenal' },
              { value: 'semanal', label: 'Semanal' }
            ]}
          />

          <FormField
            name="cargo"
            label="Cargo"
            type="text"
            control={control!}
            errors={errors}
            placeholder="Desarrollador Senior"
          />

          <FormField
            name="codigo_ciiu"
            label="Código CIIU"
            type="text"
            control={control!}
            errors={errors}
            placeholder="6201"
          />

          <FormField
            name="nivelRiesgoARL"
            label="Nivel de Riesgo ARL"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: 'I', label: 'I - Riesgo Mínimo' },
              { value: 'II', label: 'II - Riesgo Bajo' },
              { value: 'III', label: 'III - Riesgo Medio' },
              { value: 'IV', label: 'IV - Riesgo Alto' },
              { value: 'V', label: 'V - Riesgo Máximo' }
            ]}
          />

          <FormField
            name="estado"
            label="Estado"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: 'activo', label: 'Activo' },
              { value: 'inactivo', label: 'Inactivo' },
              { value: 'vacaciones', label: 'En Vacaciones' },
              { value: 'incapacidad', label: 'Incapacitado' }
            ]}
          />

          <FormField
            name="centroCostos"
            label="Centro de Costos"
            type="text"
            control={control!}
            errors={errors}
            placeholder="CC001"
          />

          <FormField
            name="fechaFirmaContrato"
            label="Fecha Firma Contrato"
            type="date"
            control={control!}
            errors={errors}
          />

          <FormField
            name="fechaFinalizacionContrato"
            label="Fecha Finalización Contrato"
            type="date"
            control={control!}
            errors={errors}
          />

          <FormField
            name="tipoJornada"
            label="Tipo de Jornada"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: 'completa', label: 'Tiempo Completo' },
              { value: 'parcial', label: 'Tiempo Parcial' },
              { value: 'flexible', label: 'Horario Flexible' }
            ]}
          />

          <FormField
            name="diasTrabajo"
            label="Días de Trabajo"
            type="number"
            control={control!}
            errors={errors}
          />

          <FormField
            name="horasTrabajo"
            label="Horas de Trabajo"
            type="number"
            control={control!}
            errors={errors}
          />
        </div>
      </div>
    </div>
  );
};
