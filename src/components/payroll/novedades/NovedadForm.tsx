
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NovedadFormData, NOVEDAD_CATEGORIES, calcularValorNovedad, NovedadType } from '@/types/novedades';
import { Save, X, Calculator, Info } from 'lucide-react';

interface NovedadFormProps {
  initialData?: NovedadFormData;
  onSubmit: (data: NovedadFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  employeeSalary?: number;
}

export const NovedadForm = ({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  employeeSalary = 1300000
}: NovedadFormProps) => {
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<NovedadFormData>({
    defaultValues: initialData || {
      tipo_novedad: 'bonificacion',
      valor: 0
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<'devengados' | 'deducciones'>('devengados');
  const [calculatedValue, setCalculatedValue] = useState(0);
  const [calculationDetail, setCalculationDetail] = useState('');

  const tipoNovedad = watch('tipo_novedad');
  const subtipo = watch('subtipo');
  const dias = watch('dias');
  const horas = watch('horas');
  const manualValue = watch('valor');

  // Determinar categoría actual con type assertion segura
  const currentCategory = Object.entries(NOVEDAD_CATEGORIES).find(([_, cat]) => 
    Object.keys(cat.types).includes(tipoNovedad)
  )?.[0] as 'devengados' | 'deducciones' || 'devengados';

  // Get current type config with proper typing
  const getCurrentTypeConfig = () => {
    const category = NOVEDAD_CATEGORIES[currentCategory];
    if (!category) return null;
    
    const typeKey = tipoNovedad as keyof typeof category.types;
    return category.types[typeKey] || null;
  };

  const currentTypeConfig = getCurrentTypeConfig();

  // Calcular valor automáticamente
  useEffect(() => {
    if (currentTypeConfig?.auto_calculo) {
      const result = calcularValorNovedad(tipoNovedad, subtipo, employeeSalary, dias, horas);
      setCalculatedValue(result.valor);
      setCalculationDetail(result.baseCalculo.detalle_calculo);
      
      if (result.valor > 0) {
        setValue('valor', result.valor);
      }
    }
  }, [tipoNovedad, subtipo, dias, horas, employeeSalary, currentTypeConfig, setValue]);

  const handleFormSubmit = async (data: NovedadFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting novedad:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
        {/* Selector de categoría */}
        <div className="space-y-3">
          <Label className="text-base font-semibold text-gray-900">Categoría</Label>
          <div className="flex space-x-2">
            {Object.entries(NOVEDAD_CATEGORIES).map(([key, category]) => (
              <Button
                key={key}
                type="button"
                variant={selectedCategory === key ? "default" : "outline"}
                onClick={() => setSelectedCategory(key as 'devengados' | 'deducciones')}
                className={`flex items-center space-x-2 ${selectedCategory === key ? category.color : 'border-gray-200'}`}
              >
                <span>{category.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Tipo de novedad */}
        <div className="space-y-2">
          <Label htmlFor="tipo_novedad" className="text-sm font-medium text-gray-900">
            Tipo de novedad
          </Label>
          <Controller
            name="tipo_novedad"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="border-gray-200 focus:border-gray-300 focus:ring-0">
                  <SelectValue placeholder="Selecciona el tipo de novedad" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOVEDAD_CATEGORIES[selectedCategory].types).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center space-x-2">
                        <span>{config.label}</span>
                        {config.auto_calculo && (
                          <Badge variant="secondary" className="text-xs">Auto</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Subtipo si aplica */}
        {currentTypeConfig?.subtipos && (
          <div className="space-y-2">
            <Label htmlFor="subtipo" className="text-sm font-medium text-gray-900">
              Subtipo
            </Label>
            <Controller
              name="subtipo"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ''} onValueChange={(value) => {
                  field.onChange(value);
                  console.log('Subtipo seleccionado:', value, 'Para tipo:', tipoNovedad);
                }}>
                  <SelectTrigger className="border-gray-200 focus:border-gray-300 focus:ring-0">
                    <SelectValue placeholder="Selecciona el subtipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentTypeConfig.subtipos.map((subtipo) => (
                      <SelectItem key={subtipo} value={subtipo}>
                        {subtipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {/* Fechas si son requeridas */}
        {(currentTypeConfig?.requiere_dias || tipoNovedad === 'vacaciones' || tipoNovedad === 'incapacidad') && (
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

        {/* Días, Horas y Valor */}
        <div className="grid grid-cols-3 gap-4">
          {currentTypeConfig?.requiere_dias && (
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
                max="30"
                className="border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          )}

          {currentTypeConfig?.requiere_horas && (
            <div className="space-y-2">
              <Label htmlFor="horas" className="text-sm font-medium text-gray-900">
                Horas
              </Label>
              <Input
                {...register('horas', { valueAsNumber: true })}
                type="number"
                id="horas"
                placeholder="0"
                min="0"
                step="0.5"
                onChange={(e) => {
                  console.log('Horas cambiadas:', e.target.value, 'Para subtipo:', subtipo);
                }}
                className="border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="valor" className="text-sm font-medium text-gray-900">
                Valor
              </Label>
              {currentTypeConfig?.auto_calculo && (
                <Badge variant="outline" className="text-xs">
                  <Calculator className="h-3 w-3 mr-1" />
                  Auto
                </Badge>
              )}
            </div>
            <Input
              {...register('valor', { valueAsNumber: true })}
              type="number"
              id="valor"
              placeholder="0"
              min="0"
              step="1000"
              readOnly={currentTypeConfig?.auto_calculo}
              className={`border-gray-200 focus:border-gray-300 focus:ring-0 ${
                currentTypeConfig?.auto_calculo ? 'bg-gray-50' : ''
              }`}
            />
          </div>
        </div>

        {/* Cálculo automático */}
        {currentTypeConfig?.auto_calculo && calculationDetail && calculatedValue > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-900">Cálculo automático:</span>
                  <Badge className="bg-blue-600 text-white">{formatCurrency(calculatedValue)}</Badge>
                </div>
                <p className="text-xs text-blue-700 font-mono">{calculationDetail}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Observaciones */}
        <div className="space-y-2">
          <Label htmlFor="observacion" className="text-sm font-medium text-gray-900">
            Observaciones
          </Label>
          <Textarea
            {...register('observacion')}
            id="observacion"
            placeholder="Observaciones adicionales sobre esta novedad..."
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
