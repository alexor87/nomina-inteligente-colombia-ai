
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateNovedadData, NovedadType, PayrollNovedad } from '@/types/novedades-enhanced';

interface NovedadFormProps {
  initialData?: PayrollNovedad;
  employeeSalary: number;
  onSubmit: (data: CreateNovedadData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export const NovedadForm: React.FC<NovedadFormProps> = ({
  initialData,
  employeeSalary,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateNovedadData>({
    defaultValues: {
      tipo_novedad: initialData?.tipo_novedad || 'bonificacion',
      valor: initialData?.valor || 0,
      observacion: initialData?.observacion || '',
      dias: initialData?.dias || undefined,
      horas: initialData?.horas || undefined,
      constitutivo_salario: initialData?.constitutivo_salario || false
    }
  });

  const tipoNovedad = watch('tipo_novedad');

  const novedadTypes: { value: NovedadType; label: string }[] = [
    { value: 'horas_extra', label: 'Horas Extra' },
    { value: 'recargo_nocturno', label: 'Recargo Nocturno' },
    { value: 'bonificacion', label: 'Bonificación' },
    { value: 'comision', label: 'Comisión' },
    { value: 'prima', label: 'Prima' },
    { value: 'otros_ingresos', label: 'Otros Ingresos' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'incapacidad', label: 'Incapacidad' },
    { value: 'licencia_remunerada', label: 'Licencia Remunerada' },
    { value: 'licencia_no_remunerada', label: 'Licencia No Remunerada' },
    { value: 'salud', label: 'Descuento Salud' },
    { value: 'pension', label: 'Descuento Pensión' },
    { value: 'arl', label: 'Descuento ARL' },
    { value: 'retencion_fuente', label: 'Retención en la Fuente' }
  ];

  const handleFormSubmit = async (data: CreateNovedadData) => {
    await onSubmit(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? 'Editar Novedad' : 'Nueva Novedad'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="tipo_novedad">Tipo de Novedad</Label>
            <Select
              value={tipoNovedad}
              onValueChange={(value: NovedadType) => setValue('tipo_novedad', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {novedadTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_novedad && (
              <p className="text-red-500 text-sm mt-1">{errors.tipo_novedad.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              {...register('valor', { 
                required: 'El valor es requerido',
                min: { value: 0, message: 'El valor debe ser mayor a 0' }
              })}
            />
            {errors.valor && (
              <p className="text-red-500 text-sm mt-1">{errors.valor.message}</p>
            )}
          </div>

          {(tipoNovedad === 'horas_extra' || tipoNovedad === 'recargo_nocturno') && (
            <div>
              <Label htmlFor="horas">Horas</Label>
              <Input
                id="horas"
                type="number"
                step="0.1"
                {...register('horas')}
              />
            </div>
          )}

          {(tipoNovedad === 'vacaciones' || tipoNovedad === 'incapacidad' || tipoNovedad === 'licencia_remunerada' || tipoNovedad === 'licencia_no_remunerada') && (
            <div>
              <Label htmlFor="dias">Días</Label>
              <Input
                id="dias"
                type="number"
                {...register('dias')}
              />
            </div>
          )}

          <div>
            <Label htmlFor="observacion">Observaciones</Label>
            <Textarea
              id="observacion"
              {...register('observacion')}
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
