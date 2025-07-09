import React from 'react';
import { UseFormRegister, Control, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Briefcase, Calendar, DollarSign, Clock, Building2 } from 'lucide-react';
import { EmployeeFormData } from './types';

interface LaborInfoSectionProps {
  register: UseFormRegister<EmployeeFormData>;
  control: Control<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  errors: any;
}

export const LaborInfoSection: React.FC<LaborInfoSectionProps> = ({
  register,
  control,
  watch,
  errors
}) => {
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
    <div className="space-y-6">
      {/* Información Laboral */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
            Información Laboral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                {...register('cargo')}
                placeholder="Ej: Desarrollador Senior"
              />
              {errors.cargo && (
                <p className="text-red-500 text-sm mt-1">{errors.cargo.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="centroCostos">Centro de Costos</Label>
              <Input
                id="centroCostos"
                {...register('centroCostos')}
                placeholder="Ej: Tecnología"
              />
            </div>

            <div>
              <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
              <Select 
                value={watch('tipoContrato')} 
                onValueChange={(value) => register('tipoContrato').onChange({ target: { value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="fijo">Término Fijo</SelectItem>
                  <SelectItem value="obra_labor">Obra o Labor</SelectItem>
                  <SelectItem value="prestacion_servicios">Prestación de Servicios</SelectItem>
                  <SelectItem value="aprendizaje">Contrato de Aprendizaje</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipoContrato && (
                <p className="text-red-500 text-sm mt-1">{errors.tipoContrato.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select 
                value={watch('estado')} 
                onValueChange={(value) => register('estado').onChange({ target: { value } })}
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
                  <SelectItem value="licencia">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      En Licencia
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
              {errors.estado && (
                <p className="text-red-500 text-sm mt-1">{errors.estado.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fechas del Contrato */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-green-600" />
            Fechas del Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fechaIngreso">Fecha de Ingreso</Label>
              <Input
                id="fechaIngreso"
                type="date"
                {...register('fechaIngreso')}
              />
              {errors.fechaIngreso && (
                <p className="text-red-500 text-sm mt-1">{errors.fechaIngreso.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="fechaFirmaContrato">Fecha Firma Contrato</Label>
              <Input
                id="fechaFirmaContrato"
                type="date"
                {...register('fechaFirmaContrato')}
              />
            </div>

            {watch('tipoContrato') === 'fijo' && (
              <div>
                <Label htmlFor="fechaFinalizacionContrato">Fecha Finalización</Label>
                <Input
                  id="fechaFinalizacionContrato"
                  type="date"
                  {...register('fechaFinalizacionContrato')}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Salario y Beneficios */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-yellow-600" />
            Salario y Beneficios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salarioBase">Salario Base</Label>
              <Input
                id="salarioBase"
                type="number"
                {...register('salarioBase', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.salarioBase && (
                <p className="text-red-500 text-sm mt-1">{errors.salarioBase.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="periodicidadPago">Periodicidad de Pago</Label>
              <Select 
                value={watch('periodicidadPago')} 
                onValueChange={(value) => register('periodicidadPago').onChange({ target: { value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="beneficiosExtralegales"
                  checked={watch('beneficiosExtralegales')}
                  onCheckedChange={(checked) => 
                    register('beneficiosExtralegales').onChange({ target: { value: checked } })
                  }
                />
                <Label htmlFor="beneficiosExtralegales" className="text-sm">
                  ¿Tiene beneficios extralegales?
                </Label>
              </div>
              {watch('beneficiosExtralegales') && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Nota:</strong> Los beneficios extralegales serán considerados para el cálculo de prestaciones sociales según la normativa vigente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jornada Laboral */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-purple-600" />
            Jornada Laboral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="tipoJornada">Tipo de Jornada</Label>
              <Select 
                value={watch('tipoJornada')} 
                onValueChange={(value) => register('tipoJornada').onChange({ target: { value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar jornada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Jornada Completa</SelectItem>
                  <SelectItem value="medio_tiempo">Medio Tiempo</SelectItem>
                  <SelectItem value="por_horas">Por Horas</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="diasTrabajo">Días de Trabajo (mes)</Label>
              <Input
                id="diasTrabajo"
                type="number"
                {...register('diasTrabajo', { valueAsNumber: true })}
                placeholder="30"
                min="1"
                max="31"
              />
            </div>

            <div>
              <Label htmlFor="horasTrabajo">Horas de Trabajo (día)</Label>
              <Input
                id="horasTrabajo"
                type="number"
                {...register('horasTrabajo', { valueAsNumber: true })}
                placeholder="8"
                min="1"
                max="24"
              />
            </div>
          </div>

          {watch('tipoJornada') !== 'completa' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Nota:</strong> Para jornadas diferentes a tiempo completo, verifique el cumplimiento de la normativa laboral vigente sobre jornadas especiales.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cláusulas Especiales */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
            Información Adicional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clausulasEspeciales">Cláusulas Especiales del Contrato</Label>
            <Textarea
              id="clausulasEspeciales"
              {...register('clausulasEspeciales')}
              placeholder="Ej: Cláusula de confidencialidad, no competencia, etc."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="codigoCiiu">Código CIIU</Label>
            <Input
              id="codigoCiiu"
              {...register('codigoCiiu')}
              placeholder="Ej: 6201"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
