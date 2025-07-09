import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { FormField } from './FormField';
import { EmployeeFormData } from './types';

interface LaborInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  arlRiskLevels: { value: string; label: string; percentage: string }[];
  register: any;
}

export const LaborInfoSection = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch, 
  arlRiskLevels,
  register 
}: LaborInfoSectionProps) => {
  const tipoContratoOptions = [
    { value: 'indefinido', label: 'Término Indefinido' },
    { value: 'fijo', label: 'Término Fijo' },
    { value: 'obra', label: 'Obra o Labor' },
    { value: 'aprendizaje', label: 'Aprendizaje' },
    { value: 'practicas', label: 'Prácticas' }
  ];

  const periodicidadPagoOptions = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'semanal', label: 'Semanal' }
  ];

  const estadoOptions = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'incapacidad', label: 'Incapacidad' },
    { value: 'licencia', label: 'Licencia' }
  ];

  const tipoJornadaOptions = [
    { value: 'completa', label: 'Tiempo Completo' },
    { value: 'parcial', label: 'Tiempo Parcial' },
    { value: 'flexible', label: 'Horario Flexible' }
  ];

  return (
    <div className="space-y-8">
      <div className="border-t border-gray-100 pt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Información Laboral</h2>
        
        <div className="space-y-6">
          {/* Salario y Contrato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              name="salarioBase"
              label="Salario Base"
              type="number"
              control={control}
              errors={errors}
              required
              placeholder="0"
            />
            
            <FormField
              name="tipoContrato"
              label="Tipo de Contrato"
              type="select"
              control={control}
              errors={errors}
              options={tipoContratoOptions}
              required
            />
            
            <FormField
              name="periodicidadPago"
              label="Periodicidad de Pago"
              type="select"
              control={control}
              errors={errors}
              options={periodicidadPagoOptions}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="fechaIngreso"
              label="Fecha de Ingreso"
              type="date"
              control={control}
              errors={errors}
              required
            />
            
            <FormField
              name="fechaFirmaContrato"
              label="Fecha Firma Contrato"
              type="date"
              control={control}
              errors={errors}
            />
          </div>

          {/* Cargo y Centro de Costos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="cargo"
              label="Cargo"
              type="text"
              control={control}
              errors={errors}
            />
            
            <FormField
              name="centroCostos"
              label="Centro de Costos"
              type="text"
              control={control}
              errors={errors}
            />
          </div>

          {/* Código CIIU y Nivel de Riesgo ARL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="codigoCIIU"
              label="Código CIIU"
              type="text"
              control={control}
              errors={errors}
            />
            
            <FormField
              name="nivelRiesgoARL"
              label="Nivel de Riesgo ARL"
              type="select"
              control={control}
              errors={errors}
              options={arlRiskLevels}
            />
          </div>

          {/* Jornada Laboral */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              name="tipoJornada"
              label="Tipo de Jornada"
              type="select"
              control={control}
              errors={errors}
              options={tipoJornadaOptions}
            />
            
            <FormField
              name="diasTrabajo"
              label="Días de Trabajo"
              type="number"
              control={control}
              errors={errors}
            />
            
            <FormField
              name="horasTrabajo"
              label="Horas de Trabajo"
              type="number"
              control={control}
              errors={errors}
            />
          </div>

          {/* Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="estado"
              label="Estado"
              type="select"
              control={control}
              errors={errors}
              options={estadoOptions}
            />
          </div>

          {/* ✅ ACTUALIZADO: Sección de Vacaciones Iniciales con texto más claro */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-md font-medium text-gray-800 mb-4">Vacaciones Iniciales</h3>
            
            <div className="space-y-4">
              {/* Checkbox para vacaciones pendientes */}
              <div className="flex items-center space-x-3">
                <input
                  id="hasAccumulatedVacations"
                  type="checkbox"
                  {...register('hasAccumulatedVacations')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="hasAccumulatedVacations" className="text-sm font-medium text-gray-700">
                  ¿El empleado tiene vacaciones pendientes?
                </label>
              </div>

              {/* Campo condicional para días de vacaciones */}
              {watchedValues.hasAccumulatedVacations && (
                <div className="ml-7">
                  <FormField
                    name="initialVacationDays"
                    label="Días de vacaciones pendientes"
                    type="number"
                    control={control}
                    errors={errors}
                    placeholder="0"
                    className="max-w-xs"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Días de vacaciones pendientes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
