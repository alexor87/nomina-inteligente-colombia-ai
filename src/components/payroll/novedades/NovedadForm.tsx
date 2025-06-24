
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NovedadFormData, NOVEDAD_TYPES } from '@/types/novedades';
import { Save, X } from 'lucide-react';

interface NovedadFormProps {
  initialData?: NovedadFormData;
  onSubmit: (data: NovedadFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const NovedadForm = ({ initialData, onSubmit, onCancel, isLoading = false }: NovedadFormProps) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<NovedadFormData>({
    defaultValues: initialData || {
      tipo_novedad: 'bonificacion',
      valor: 0
    }
  });

  const tipoNovedad = watch('tipo_novedad');
  const requiresDates = ['vacaciones', 'licencia', 'incapacidad', 'ausencia'].includes(tipoNovedad);

  const handleFormSubmit = async (data: NovedadFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting novedad:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tipo_novedad">Tipo de novedad *</Label>
        <Select
          value={tipoNovedad}
          onValueChange={(value) => setValue('tipo_novedad', value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo de novedad" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(NOVEDAD_TYPES).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {requiresDates && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fecha_inicio">Fecha inicio</Label>
            <Input
              {...register('fecha_inicio')}
              type="date"
              id="fecha_inicio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha_fin">Fecha fin</Label>
            <Input
              {...register('fecha_fin')}
              type="date"
              id="fecha_fin"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dias">Días</Label>
          <Input
            {...register('dias', { valueAsNumber: true })}
            type="number"
            id="dias"
            placeholder="0"
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="valor">Valor</Label>
          <Input
            {...register('valor', { valueAsNumber: true })}
            type="number"
            id="valor"
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacion">Observaciones</Label>
        <Textarea
          {...register('observacion')}
          id="observacion"
          placeholder="Observaciones adicionales..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Guardando...' : 'Guardar novedad'}
        </Button>
      </div>
    </form>
  );
};
