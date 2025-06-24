
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
    <div className="bg-white rounded-lg border border-gray-100 p-6">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Tipo de novedad */}
        <div className="space-y-2">
          <Label htmlFor="tipo_novedad" className="text-sm font-medium text-gray-900">
            Tipo de novedad
          </Label>
          <Select
            value={tipoNovedad}
            onValueChange={(value) => setValue('tipo_novedad', value as any)}
          >
            <SelectTrigger className="border-gray-200 focus:border-gray-300 focus:ring-0">
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

        {/* Fechas - Solo si es requerido */}
        {requiresDates && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio" className="text-sm font-medium text-gray-900">
                Fecha inicio
              </Label>
              <Input
                {...register('fecha_inicio')}
                type="date"
                id="fecha_inicio"
                className="border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin" className="text-sm font-medium text-gray-900">
                Fecha fin
              </Label>
              <Input
                {...register('fecha_fin')}
                type="date"
                id="fecha_fin"
                className="border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          </div>
        )}

        {/* Días y Valor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dias" className="text-sm font-medium text-gray-900">
              Días
            </Label>
            <Input
              {...register('dias', { valueAsNumber: true })}
              type="number"
              id="dias"
              placeholder="0"
              min="0"
              className="border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor" className="text-sm font-medium text-gray-900">
              Valor
            </Label>
            <Input
              {...register('valor', { valueAsNumber: true })}
              type="number"
              id="valor"
              placeholder="0"
              min="0"
              step="0.01"
              className="border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>
        </div>

        {/* Observaciones */}
        <div className="space-y-2">
          <Label htmlFor="observacion" className="text-sm font-medium text-gray-900">
            Observaciones
          </Label>
          <Textarea
            {...register('observacion')}
            id="observacion"
            placeholder="Observaciones adicionales..."
            rows={3}
            className="border-gray-200 focus:border-gray-300 focus:ring-0 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar novedad'}
          </Button>
        </div>
      </form>
    </div>
  );
};
