
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Info } from 'lucide-react';
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
    <Card className="mb-6 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-red-600" />
          <CardTitle className="text-lg font-semibold">Afiliaciones</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {tiposError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{tiposError}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-gray-700">EPS</Label>
            </div>
            <Select onValueChange={(value) => setValue('eps', value)} value={watchedValues.eps}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder="Seleccionar EPS" />
              </SelectTrigger>
              <SelectContent>
                {epsEntities.map((eps) => (
                  <SelectItem key={eps.id} value={eps.name}>
                    {eps.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-gray-700">AFP</Label>
            </div>
            <Select onValueChange={(value) => setValue('afp', value)} value={watchedValues.afp}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder="Seleccionar AFP" />
              </SelectTrigger>
              <SelectContent>
                {afpEntities.map((afp) => (
                  <SelectItem key={afp.id} value={afp.name}>
                    {afp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-gray-700">ARL</Label>
            </div>
            <Select onValueChange={(value) => setValue('arl', value)} value={watchedValues.arl}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder="Seleccionar ARL" />
              </SelectTrigger>
              <SelectContent>
                {arlEntities.map((arl) => (
                  <SelectItem key={arl.id} value={arl.name}>
                    {arl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-gray-700">Caja de Compensación</Label>
            </div>
            <Select onValueChange={(value) => setValue('cajaCompensacion', value)} value={watchedValues.cajaCompensacion}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder="Seleccionar Caja de Compensación" />
              </SelectTrigger>
              <SelectContent>
                {compensationFunds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.name}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Cotizante */}
          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-gray-700">
                Tipo de Cotizante <span className="text-red-500">*</span>
              </Label>
              <div className="relative group/tooltip">
                <Info className="w-3 h-3 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tooltip:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  Clasificación del empleado según normativa PILA
                </div>
              </div>
            </div>
            <Select 
              onValueChange={handleTipoCotizanteChange} 
              value={watchedValues.tipoCotizanteId}
              disabled={isLoadingTipos}
            >
              <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder={isLoadingTipos ? "Cargando..." : "Seleccionar tipo de cotizante"} />
              </SelectTrigger>
              <SelectContent>
                {tiposCotizante.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {tipo.codigo}
                      </Badge>
                      <span>{tipo.nombre}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipoCotizanteId && (
              <p className="text-red-500 text-xs mt-1">Tipo de cotizante es requerido</p>
            )}
          </div>

          {/* Subtipo de Cotizante */}
          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-gray-700">
                Subtipo de Cotizante <span className="text-red-500">*</span>
              </Label>
              <div className="relative group/tooltip">
                <Info className="w-3 h-3 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tooltip:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  Subcategoría específica del tipo de cotizante
                </div>
              </div>
            </div>
            <Select 
              onValueChange={(value) => setValue('subtipoCotizanteId', value)} 
              value={watchedValues.subtipoCotizanteId}
              disabled={!watchedValues.tipoCotizanteId || isLoadingSubtipos || subtiposCotizante.length === 0}
            >
              <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
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
              <SelectContent>
                {subtiposCotizante.map((subtipo) => (
                  <SelectItem key={subtipo.id} value={subtipo.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
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
              <p className="text-red-500 text-xs mt-1">Subtipo de cotizante es requerido</p>
            )}
          </div>
          
          <FormField
            name="regimenSalud"
            label="Régimen de Salud"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.regimenSalud}
            setValue={setValue}
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
            value={watchedValues.estadoAfiliacion}
            setValue={setValue}
            options={[
              { value: 'completa', label: 'Completa' },
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'inconsistente', label: 'Inconsistente' }
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
};
