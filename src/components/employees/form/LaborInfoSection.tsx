
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Briefcase, DollarSign, Calendar, Building, Clock } from 'lucide-react';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';
import { CONTRACT_TYPES } from '@/types/employee-config';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';

interface LaborInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  arlRiskLevels: { value: string; label: string; percentage: string }[];
  register: any;
}

const SALARIO_MINIMO_2025 = 1300000;

export const LaborInfoSection = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch,
  arlRiskLevels,
  register
}: LaborInfoSectionProps) => {
  return (
    <Card className="mb-6 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-green-600" />
          <CardTitle className="text-lg font-semibold">Información Laboral</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <Label className="text-sm font-medium text-gray-700">
                Salario Base <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              {...register('salarioBase', { required: 'Salario base es requerido' })}
              type="number"
              className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={`Mínimo: ${SALARIO_MINIMO_2025.toLocaleString()}`}
            />
            <p className="text-xs text-gray-500 mt-1">Salario mínimo 2025: ${SALARIO_MINIMO_2025.toLocaleString()}</p>
            {errors.salarioBase && (
              <p className="text-red-500 text-xs mt-1">{errors.salarioBase?.message}</p>
            )}
          </div>
          
          <FormField
            name="tipoContrato"
            label="Tipo de Contrato"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.tipoContrato}
            setValue={setValue}
            options={CONTRACT_TYPES.map(type => ({ value: type.value, label: type.label }))}
            required
          />
          
          <FormField
            name="fechaIngreso"
            label="Fecha de Ingreso"
            type="date"
            control={control}
            errors={errors}
            required
            icon={<Calendar className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="periodicidadPago"
            label="Periodicidad de Pago"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.periodicidadPago}
            setValue={setValue}
            options={[
              { value: 'quincenal', label: 'Quincenal' },
              { value: 'mensual', label: 'Mensual' }
            ]}
          />
          
          <FormField
            name="cargo"
            label="Cargo"
            type="text"
            control={control}
            errors={errors}
            icon={<Building className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="codigoCIIU"
            label="Código CIIU"
            type="text"
            control={control}
            errors={errors}
            required
          />
          
          <FormField
            name="nivelRiesgoARL"
            label="Nivel de Riesgo ARL"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.nivelRiesgoARL}
            setValue={setValue}
            options={arlRiskLevels.map(level => ({
              value: level.value,
              label: `${level.label} - ${level.percentage}`
            }))}
            required
          />
          
          <FormField
            name="estado"
            label="Estado"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.estado}
            setValue={setValue}
            options={ESTADOS_EMPLEADO.map(estado => ({ value: estado.value, label: estado.label }))}
          />
          
          <FormField
            name="centroCostos"
            label="Centro de Costos"
            type="text"
            control={control}
            errors={errors}
          />
        </div>
      </CardContent>
    </Card>
  );
};
