
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
  // Check if subtipo is required based on available subtipos
  const isSubtipoRequired = subtiposCotizante.length > 0 && watchedValues.tipoCotizanteId;
  
  return (
    <div className="space-y-6">
      <div className="pt-6">
        <h2 className="text-base font-medium text-gray-900 mb-4">Afiliaciones</h2>
        
        {tiposError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{tiposError}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-gray-600">EPS</Label>
              <Select onValueChange={(value) => setValue('eps', value)} value={watchedValues.eps}>
                <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
                  <SelectValue placeholder="Seleccionar EPS" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {epsEntities.map((eps) => (
                    <SelectItem key={eps.id} value={eps.name} className="text-sm">
                      {eps.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-gray-600">AFP</Label>
              <Select onValueChange={(value) => setValue('afp', value)} value={watchedValues.afp}>
                <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
                  <SelectValue placeholder="Seleccionar AFP" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {afpEntities.map((afp) => (
                    <SelectItem key={afp.id} value={afp.name} className="text-sm">
                      {afp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-gray-600">ARL</Label>
              <Select onValueChange={(value) => setValue('arl', value)} value={watchedValues.arl}>
                <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
                  <SelectValue placeholder="Seleccionar ARL" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {arlEntities.map((arl) => (
                    <SelectItem key={arl.id} value={arl.name} className="text-sm">
                      {arl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-gray-600">Caja de Compensación</Label>
              <Select onValueChange={(value) => setValue('cajaCompensacion', value)} value={watchedValues.cajaCompensacion}>
                <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
                  <SelectValue placeholder="Seleccionar Caja de Compensación" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {compensationFunds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.name} className="text-sm">
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Cotizante */}
            <div className="space-y-1">
              <Label className="text-sm text-gray-600">
                Tipo de Cotizante <span className="text-red-400">*</span>
              </Label>
              <Select 
                onValueChange={(value) => {
                  handleTipoCotizanteChange(value);
                  // Clear subtipo when changing tipo
                  setValue('subtipoCotizanteId', '');
                }} 
                value={watchedValues.tipoCotizanteId}
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
                <Select 
                  onValueChange={(value) => setValue('subtipoCotizanteId', value)} 
                  value={watchedValues.subtipoCotizanteId}
                  disabled={isLoadingSubtipos}
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
                {subtiposCotizante.length === 0 && !isLoadingSubtipos && (
                  <p className="text-xs text-gray-500 mt-1">Este tipo de cotizante no requiere subtipo</p>
                )}
                {isSubtipoRequired && errors.subtipoCotizanteId && (
                  <p className="text-red-400 text-xs mt-1">Subtipo de cotizante es requerido</p>
                )}
              </div>
            )}
            
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
