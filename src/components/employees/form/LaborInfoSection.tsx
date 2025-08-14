
import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';
import { CONTRACT_TYPES } from '@/types/employee-config';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';

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

  // ✅ NUEVO: Validaciones y alertas para tipos de salario
  const tipoSalario = watch?.('tipoSalario') || 'mensual';
  const salarioBase = watch?.('salarioBase') || 0;
  
  // Calcular SMLMV para 2024 (ejemplo)
  const SMLMV_2024 = 1300000; // Este valor debería venir de configuración
  const is10SMLMV = salarioBase >= (SMLMV_2024 * 10);
  
  const getSalarioAlert = () => {
    if (tipoSalario === 'integral' && salarioBase > 0 && !is10SMLMV) {
      return (
        <Alert className="mt-2 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Atención:</strong> El salario integral debe ser mínimo 10 SMLMV ($
            {(SMLMV_2024 * 10).toLocaleString()}). Valor actual: $
            {salarioBase.toLocaleString()}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (tipoSalario === 'integral' && is10SMLMV) {
      return (
        <Alert className="mt-2 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Salario Integral:</strong> 70% factor salarial ($
            {Math.round(salarioBase * 0.7).toLocaleString()}) + 30% factor prestacional ($
            {Math.round(salarioBase * 0.3).toLocaleString()})
          </AlertDescription>
        </Alert>
      );
    }
    
    if (tipoSalario === 'medio_tiempo') {
      return (
        <Alert className="mt-2 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Medio Tiempo:</strong> Salario proporcional a las horas trabajadas. 
            Verificar configuración de jornada laboral.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ✅ NUEVO: Tipo de Salario */}
          <FormField
            name="tipoSalario"
            label="Tipo de Salario"
            type="select"
            control={control!}
            errors={errors}
            required
            options={[
              { value: 'mensual', label: 'Salario Mensual Tradicional' },
              { value: 'integral', label: 'Salario Integral (mín. 10 SMLMV)' },
              { value: 'medio_tiempo', label: 'Salario Medio Tiempo' }
            ]}
            placeholder="Seleccionar tipo de salario"
          />

          {/* ✅ MODIFICADO: Valor del Salario (antes Salario Base) */}
          <div>
            <FormField
              name="salarioBase"
              label="Valor del Salario"
              type="number"
              control={control!}
              errors={errors}
              required
              placeholder="2500000"
            />
            {getSalarioAlert()}
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
