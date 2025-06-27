
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';

interface AffiliationsSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  epsEntities: any[];
  afpEntities: any[];
  arlEntities: any[];
  compensationFunds: any[];
  tiposCotizante: any[];
  subtiposCotizante: any[];
  isLoadingTipos: boolean;
  isLoadingSubtipos: boolean;
  tiposError: string | null;
  handleTipoCotizanteChange: (tipoCotizanteId: string) => void;
}

export const AffiliationsSection = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch,
  epsEntities,
  afpEntities,
  arlEntities,
  compensationFunds,
  tiposCotizante,
  subtiposCotizante,
  isLoadingTipos,
  isLoadingSubtipos,
  tiposError,
  handleTipoCotizanteChange
}: AffiliationsSectionProps) => {
  return (
    <div className="space-y-8">
      <div className="border-t border-gray-100 pt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Afiliaciones</h2>
        
        {tiposError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
            <p className="text-red-600 text-sm">{tiposError}</p>
          </div>
        )}
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-gray-600">EPS</Label>
              <Select onValueChange={(value) => setValue('eps', value)} value={watchedValues.eps}>
                <SelectTrigger className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md">
                  <SelectValue placeholder="Seleccionar EPS" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {epsEntities.map((eps) => (
                    <SelectItem key={eps.id} value={eps.name} className="hover:bg-gray-50 focus:bg-gray-50">
                      {eps.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-gray-600">AFP</Label>
              <Select onValueChange={(value) => setValue('afp', value)} value={watchedValues.afp}>
                <SelectTrigger className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md">
                  <SelectValue placeholder="Seleccionar AFP" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {afpEntities.map((afp) => (
                    <SelectItem key={afp.id} value={afp.name} className="hover:bg-gray-50 focus:bg-gray-50">
                      {afp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-gray-600">ARL</Label>
              <Select onValueChange={(value) => setValue('arl', value)} value={watchedValues.arl}>
                <SelectTrigger className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md">
                  <SelectValue placeholder="Seleccionar ARL" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {arlEntities.map((arl) => (
                    <SelectItem key={arl.id} value={arl.name} className="hover:bg-gray-50 focus:bg-gray-50">
                      {arl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-gray-600">Caja de Compensación</Label>
              <Select onValueChange={(value) => setValue('cajaCompensacion', value)} value={watchedValues.cajaCompensacion}>
                <SelectTrigger className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md">
                  <SelectValue placeholder="Seleccionar Caja de Compensación" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {compensationFunds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.name} className="hover:bg-gray-50 focus:bg-gray-50">
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Cotizante */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-gray-600">
                Tipo de Cotizante <span className="text-red-400 ml-1">*</span>
              </Label>
              <Select 
                onValueChange={handleTipoCotizanteChange} 
                value={watchedValues.tipoCotizanteId}
                disabled={isLoadingTipos}
              >
                <SelectTrigger className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md">
                  <SelectValue placeholder={isLoadingTipos ? "Cargando..." : "Seleccionar tipo de cotizante"} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {tiposCotizante.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id} className="hover:bg-gray-50 focus:bg-gray-50">
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
              {errors.tipoCotizanteId && (
                <p className="text-red-400 text-xs mt-1">Tipo de cotizante es requerido</p>
              )}
            </div>

            {/* Subtipo de Cotizante */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-gray-600">
                Subtipo de Cotizante <span className="text-red-400 ml-1">*</span>
              </Label>
              <Select 
                onValueChange={(value) => setValue('subtipoCotizanteId', value)} 
                value={watchedValues.subtipoCotizanteId}
                disabled={!watchedValues.tipoCotizanteId || isLoadingSubtipos || subtiposCotizante.length === 0}
              >
                <SelectTrigger className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md">
                  <SelectValue placeholder={
                    !watchedValues.tipoCotizanteId 
                      ? "Primero selecciona un tipo de cotizante"
                      : isLoadingSubtipos 
                        ? "Cargando subtipos..."
                        : subtiposCotizante.length === 0
                          ? "Este tipo de cotizante no requiere subtipo"
                          : "Seleccionar subtipo de cotizante"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {subtiposCotizante.map((subtipo) => (
                    <SelectItem key={subtipo.id} value={subtipo.id} className="hover:bg-gray-50 focus:bg-gray-50">
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
              {subtiposCotizante.length === 0 && watchedValues.tipoCotizanteId && !isLoadingSubtipos && (
                <p className="text-xs text-gray-500 mt-1">Este tipo de cotizante no requiere subtipo</p>
              )}
              {errors.subtipoCotizanteId && (
                <p className="text-red-400 text-xs mt-1">Subtipo de cotizante es requerido</p>
              )}
            </div>
            
            <FormField
              name="regimenSalud"
              label="Régimen de Salud"
              type="select"
              control={control}
              errors={errors}
              options={[
                { value: 'contributivo', label: 'Contributivo' },
                { value: 'subsidiado', label: 'Subsidiado' }
              ]}
            />
            
            <FormField
              name="estadoAfiliacion"
              label="Estado de Afiliación"
              type="select"
              control={control}
              errors={errors}
              options={[
                { value: 'completa', label: 'Completa' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'inconsistente', label: 'Inconsistente' }
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
