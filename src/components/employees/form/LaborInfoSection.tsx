import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch, UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { EmployeeFormData } from './types';

// ✅ FIXED: Simplified error type to avoid FieldErrors<> conflicts
interface LaborInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: Record<string, any>; // ✅ SIMPLIFIED: Generic error type
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  arlRiskLevels: { value: string; label: string; percentage: string }[];
  register: UseFormRegister<EmployeeFormData>;
  formData?: any; // For wizard compatibility
  updateFormData?: (data: any) => void; // For wizard compatibility
}

export const LaborInfoSection: React.FC<LaborInfoSectionProps> = ({
  control,
  errors,
  watchedValues,
  setValue,
  watch,
  arlRiskLevels,
  register,
  formData,
  updateFormData
}) => {
  // ✅ SIMPLIFIED: Use formData if available (for wizard), otherwise use control
  const isWizardMode = !!formData && !!updateFormData;

  if (isWizardMode) {
    // Wizard mode - use formData and updateFormData
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salarioBase">Salario Base *</Label>
              <Input
                type="number"
                value={formData.salarioBase || 0}
                onChange={(e) => updateFormData({ salarioBase: Number(e.target.value) })}
                placeholder="2500000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoContrato">Tipo de Contrato *</Label>
              <Select 
                value={formData.tipoContrato || 'indefinido'} 
                onValueChange={(value) => updateFormData({ tipoContrato: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="fijo">Término Fijo</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="aprendizaje">Contrato de Aprendizaje</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaIngreso">Fecha de Ingreso *</Label>
              <Input
                type="date"
                value={formData.fechaIngreso || ''}
                onChange={(e) => updateFormData({ fechaIngreso: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                value={formData.cargo || ''}
                onChange={(e) => updateFormData({ cargo: e.target.value })}
                placeholder="Desarrollador Senior"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select 
                value={formData.estado || 'activo'} 
                onValueChange={(value) => updateFormData({ estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Activo
                    </span>
                  </SelectItem>
                  <SelectItem value="inactivo">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Inactivo
                    </span>
                  </SelectItem>
                  <SelectItem value="vacaciones">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      En Vacaciones
                    </span>
                  </SelectItem>
                  <SelectItem value="incapacidad">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      Incapacitado
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoJornada">Tipo de Jornada *</Label>
              <Select 
                value={formData.tipoJornada || 'completa'} 
                onValueChange={(value) => updateFormData({ tipoJornada: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar jornada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="horas">Por Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal mode - use react-hook-form control
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="salarioBase">Salario Base *</Label>
            <Controller
              name="salarioBase"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  placeholder="2500000"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
            {errors.salarioBase && (
              <p className="text-red-500 text-sm">{errors.salarioBase.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoContrato">Tipo de Contrato *</Label>
            <Controller
              name="tipoContrato"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinido">Indefinido</SelectItem>
                    <SelectItem value="fijo">Término Fijo</SelectItem>
                    <SelectItem value="obra">Obra</SelectItem>
                    <SelectItem value="aprendizaje">Contrato de Aprendizaje</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tipoContrato && (
              <p className="text-red-500 text-sm">{errors.tipoContrato.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaIngreso">Fecha de Ingreso *</Label>
            <Controller
              name="fechaIngreso"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                />
              )}
            />
            {errors.fechaIngreso && (
              <p className="text-red-500 text-sm">{errors.fechaIngreso.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodicidadPago">Periodicidad de Pago</Label>
            <Controller
              name="periodicidadPago"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar periodicidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Controller
              name="cargo"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Desarrollador Senior"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo_ciiu">Código CIIU</Label>
            <Controller
              name="codigo_ciiu"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="6201"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nivelRiesgoARL">Nivel de Riesgo ARL</Label>
            <Controller
              name="nivelRiesgoARL"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    {arlRiskLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label} - {level.percentage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Controller
              name="estado"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">
                      <span className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Activo
                      </span>
                    </SelectItem>
                    <SelectItem value="inactivo">
                      <span className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        Inactivo
                      </span>
                    </SelectItem>
                    <SelectItem value="vacaciones">
                      <span className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        En Vacaciones
                      </span>
                    </SelectItem>
                    <SelectItem value="incapacidad">
                      <span className="flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                        Incapacitado
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="centroCostos">Centro de Costos</Label>
            <Controller
              name="centroCostos"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="CC001"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaFirmaContrato">Fecha Firma Contrato</Label>
            <Controller
              name="fechaFirmaContrato"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaFinalizacionContrato">Fecha Finalización Contrato</Label>
            <Controller
              name="fechaFinalizacionContrato"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoJornada">Tipo de Jornada *</Label>
            <Controller
              name="tipoJornada"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar jornada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completa">Completa</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="horas">Por Horas</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tipoJornada && (
              <p className="text-red-500 text-sm">{errors.tipoJornada.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="diasTrabajo">Días de Trabajo</Label>
            <Controller
              name="diasTrabajo"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  placeholder="30"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="horasTrabajo">Horas de Trabajo</Label>
            <Controller
              name="horasTrabajo"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  placeholder="8"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
