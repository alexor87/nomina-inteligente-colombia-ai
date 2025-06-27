
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { EmployeeFormData } from './types';

interface CotizanteTypeSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  tiposCotizante: any[];
  subtiposCotizante: any[];
  isLoadingTipos: boolean;
  isLoadingSubtipos: boolean;
  handleTipoCotizanteChange: (tipoCotizanteId: string) => void;
}

export const CotizanteTypeSection = ({
  control,
  errors,
  watchedValues,
  setValue,
  tiposCotizante,
  subtiposCotizante,
  isLoadingTipos,
  isLoadingSubtipos,
  handleTipoCotizanteChange
}: CotizanteTypeSectionProps) => {
  const isSubtipoRequired = subtiposCotizante.length > 0 && watchedValues.tipoCotizanteId;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Tipo de Cotizante */}
      <div className="space-y-1">
        <Label className="text-sm text-gray-600">
          Tipo de Cotizante <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="tipoCotizanteId"
          control={control}
          render={({ field }) => (
            <Select 
              onValueChange={(value) => {
                field.onChange(value);
                handleTipoCotizanteChange(value);
                setValue('subtipoCotizanteId', '');
              }} 
              value={field.value || ''}
              disabled={isLoadingTipos}
            >
              <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
                <SelectValue placeholder={isLoadingTipos ? "Cargando..." : "Seleccionar tipo de cotizante"} />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {tiposCotizante.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                        {tipo.codigo}
                      </Badge>
                      <span>{tipo.nombre}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.tipoCotizanteId && (
          <p className="text-red-400 text-xs mt-1">Tipo de cotizante es requerido</p>
        )}
      </div>

      {/* Subtipo de Cotizante - Only show if tipo is selected */}
      {watchedValues.tipoCotizanteId && (
        <div className="space-y-1">
          <Label className="text-sm text-gray-600">
            Subtipo de Cotizante {isSubtipoRequired && <span className="text-red-400">*</span>}
          </Label>
          <Controller
            name="subtipoCotizanteId"
            control={control}
            render={({ field }) => (
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ''}
                disabled={isLoadingSubtipos || subtiposCotizante.length === 0}
              >
                <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
                  <SelectValue placeholder={
                    isLoadingSubtipos 
                      ? "Cargando subtipos..."
                      : subtiposCotizante.length === 0
                        ? "Este tipo no requiere subtipo"
                        : "Seleccionar subtipo de cotizante"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {subtiposCotizante.map((subtipo) => (
                    <SelectItem key={subtipo.id} value={subtipo.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                          {subtipo.codigo}
                        </Badge>
                        <span>{subtipo.nombre}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {subtiposCotizante.length === 0 && !isLoadingSubtipos && (
            <p className="text-xs text-gray-500 mt-1">Este tipo de cotizante no requiere subtipo</p>
          )}
          {isSubtipoRequired && errors.subtipoCotizanteId && (
            <p className="text-red-400 text-xs mt-1">Subtipo de cotizante es requerido</p>
          )}
        </div>
      )}
    </div>
  );
};
