
import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';
import { CONTRACT_TYPES } from '@/types/employee-config';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';
import { ConfigurationService } from '@/services/ConfigurationService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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

  const currentYear = new Date().getFullYear().toString();
  const { salarioMinimo } = ConfigurationService.getConfiguration(currentYear);
  const salarioActual = control ? Number(control._getWatch('salarioBase')) || 0 : 0;
  const salarioInferior = salarioActual > 0 && salarioActual < salarioMinimo;

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormField
              name="salarioBase"
              label="Salario Base"
              type="number"
              control={control!}
              errors={errors}
              required
              placeholder="2500000"
            />
            {salarioInferior && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  Este salario es inferior al salario mínimo legal vigente ({fmtCOP(salarioMinimo)}).
                  Verifica que esta persona realmente tendrá un salario inferior al mínimo.
                </AlertDescription>
              </Alert>
            )}
          </div>

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

          {/* Días de descanso */}
          <div className="mt-2 space-y-2 col-span-full">
            <label className="text-sm font-medium text-gray-700">Días de descanso</label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {[
                { value: 'lunes', label: 'Lunes' },
                { value: 'martes', label: 'Martes' },
                { value: 'miercoles', label: 'Miércoles' },
                { value: 'jueves', label: 'Jueves' },
                { value: 'viernes', label: 'Viernes' },
                { value: 'sabado', label: 'Sábado' },
                { value: 'domingo', label: 'Domingo' },
              ].map((day) => {
                const currentDays = watch ? watch('diasDescanso') || ['sabado', 'domingo'] : ['sabado', 'domingo'];
                const isChecked = currentDays.includes(day.value);

                return (
                  <label key={day.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (!setValue) return;
                        const updated = e.target.checked
                          ? [...currentDays, day.value]
                          : currentDays.filter((d: string) => d !== day.value);
                        setValue('diasDescanso', updated);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">{day.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">
              Estos días se excluyen del conteo de días hábiles en vacaciones y licencias
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
