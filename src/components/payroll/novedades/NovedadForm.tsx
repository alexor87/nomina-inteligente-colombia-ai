
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
      valor: 0,
      dias: undefined,
      horas: undefined
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<'devengados' | 'deducciones'>('devengados');
  const [calculatedValue, setCalculatedValue] = useState(0);
  const [calculationDetail, setCalculationDetail] = useState('');

  const tipoNovedad = watch('tipo_novedad');
  const subtipo = watch('subtipo');
  const dias = watch('dias');
  const horas = watch('horas');
  const fechaInicio = watch('fecha_inicio');
  const fechaFin = watch('fecha_fin');
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

  // Función para calcular días entre fechas
  const calculateDaysBetweenDates = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return 0;
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
    
    return diffDays;
  };

  // Actualizar categoría cuando cambie el tipo de novedad
  useEffect(() => {
    const newCategory = Object.entries(NOVEDAD_CATEGORIES).find(([_, cat]) => 
      Object.keys(cat.types).includes(tipoNovedad)
    )?.[0] as 'devengados' | 'deducciones';
    
    if (newCategory && newCategory !== selectedCategory) {
      setSelectedCategory(newCategory);
    }
  }, [tipoNovedad, selectedCategory]);

  // Calcular días automáticamente cuando cambien las fechas
  useEffect(() => {
    if (currentTypeConfig?.requiere_dias && fechaInicio && fechaFin) {
      const calculatedDays = calculateDaysBetweenDates(fechaInicio, fechaFin);
      console.log('📅 Calculando días automáticamente:', {
        fechaInicio,
        fechaFin,
        calculatedDays
      });
      
      if (calculatedDays > 0 && calculatedDays !== dias) {
        setValue('dias', calculatedDays);
      }
    }
  }, [fechaInicio, fechaFin, tipoNovedad, currentTypeConfig, setValue, dias]);

  // Calcular valor automáticamente
  useEffect(() => {
    console.log('🧮 Calculando automáticamente...', {
      tipoNovedad,
      subtipo,
      dias: typeof dias === 'number' ? dias : 'undefined',
      horas: typeof horas === 'number' ? horas : 'undefined',
      employeeSalary,
      autoCalculo: currentTypeConfig?.auto_calculo
    });

    if (currentTypeConfig?.auto_calculo) {
      // Validar que tenemos los datos necesarios para el cálculo
      let canCalculate = false;
      
      // Convertir valores de forma segura
      const diasNum = typeof dias === 'number' && !isNaN(dias) && dias > 0 ? dias : 0;
      const horasNum = typeof horas === 'number' && !isNaN(horas) && horas > 0 ? horas : 0;
      
      console.log('🔍 Verificando condiciones para cálculo:', {
        requiereHoras: currentTypeConfig.requiere_horas,
        requiereDias: currentTypeConfig.requiere_dias,
        horasNum,
        diasNum,
        tipoNovedad
      });

      if (currentTypeConfig.requiere_horas && horasNum > 0) {
        canCalculate = true;
      } else if (currentTypeConfig.requiere_dias && diasNum > 0) {
        canCalculate = true;
      } else if (!currentTypeConfig.requiere_horas && !currentTypeConfig.requiere_dias) {
        canCalculate = true;
      }

      // Para incapacidades, también necesitamos el subtipo
      if (tipoNovedad === 'incapacidad' && (!subtipo || diasNum === 0)) {
        canCalculate = false;
        console.log('❌ Incapacidad requiere subtipo y días:', { subtipo, diasNum });
      }

      console.log('✅ ¿Puede calcular?', canCalculate);

      if (canCalculate) {
        const result = calcularValorNovedad(tipoNovedad, subtipo, employeeSalary, diasNum, horasNum);
        console.log('📊 Resultado del cálculo:', result);
        
        setCalculatedValue(result.valor);
        setCalculationDetail(result.baseCalculo.detalle_calculo);
        
        if (result.valor > 0) {
          setValue('valor', result.valor);
          console.log('💰 Valor actualizado en el formulario:', result.valor);
        }
      } else {
        setCalculatedValue(0);
        if (currentTypeConfig.requiere_horas && horasNum === 0) {
          setCalculationDetail('Ingrese las horas requeridas para el cálculo');
        } else if (currentTypeConfig.requiere_dias && diasNum === 0) {
          setCalculationDetail('Ingrese los días requeridos para el cálculo');
        } else if (tipoNovedad === 'incapacidad' && !subtipo) {
          setCalculationDetail('Seleccione el tipo de incapacidad para el cálculo');
        } else {
          setCalculationDetail('Ingrese los datos requeridos para el cálculo');
        }
      }
    } else {
      // Limpiar cálculo automático si no aplica
      setCalculatedValue(0);
      setCalculationDetail('');
    }
  }, [tipoNovedad, subtipo, dias, horas, employeeSalary, currentTypeConfig, setValue]);

  const handleFormSubmit = async (data: NovedadFormData) => {
    try {
      console.log('📋 Datos del formulario antes de envío:', data);
      
      // Función auxiliar para convertir a número de forma segura
      const safeNumber = (value: any): number | undefined => {
        if (value === null || value === undefined || value === '') return undefined;
        const num = Number(value);
        return isNaN(num) || num <= 0 ? undefined : num;
      };

      // Validar campos requeridos según el tipo de novedad
      const errors = [];
      
      const diasNum = safeNumber(data.dias);
      const horasNum = safeNumber(data.horas);
      
      if (currentTypeConfig?.requiere_horas && !horasNum) {
        errors.push('Las horas son requeridas para este tipo de novedad');
      }
      
      if (currentTypeConfig?.requiere_dias && !diasNum) {
        errors.push('Los días son requeridos para este tipo de novedad');
      }
      
      if (currentTypeConfig?.subtipos && currentTypeConfig.subtipos.length > 0 && !data.subtipo) {
        errors.push('El subtipo es requerido para este tipo de novedad');
      }
      
      if (!data.valor || data.valor <= 0) {
        errors.push('El valor debe ser mayor a 0');
      }
      
      if (errors.length > 0) {
        console.error('❌ Errores de validación:', errors);
        alert('Por favor corrija los siguientes errores:\n' + errors.join('\n'));
        return;
      }
      
      // Limpiar datos y asegurar tipos correctos
      const cleanData: NovedadFormData = {
        tipo_novedad: data.tipo_novedad,
        valor: Number(data.valor),
        subtipo: data.subtipo || undefined,
        fecha_inicio: data.fecha_inicio || undefined,
        fecha_fin: data.fecha_fin || undefined,
        dias: diasNum,
        horas: horasNum,
        observacion: data.observacion || undefined
      };
      
      console.log('✅ Datos limpios para envío:', cleanData);
      console.log('🔍 Tipos finales:', {
        valor: typeof cleanData.valor,
        dias: typeof cleanData.dias,
        horas: typeof cleanData.horas,
        dias_valor: cleanData.dias,
        horas_valor: cleanData.horas
      });
      
      await onSubmit(cleanData);
    } catch (error) {
      console.error('❌ Error submitting novedad:', error);
      alert('Error al guardar la novedad. Por favor intente nuevamente.');
    }
  };

  const handleCategoryChange = (category: 'devengados' | 'deducciones') => {
    setSelectedCategory(category);
    // Resetear tipo de novedad al primer elemento de la nueva categoría
    const firstType = Object.keys(NOVEDAD_CATEGORIES[category].types)[0] as NovedadType;
    setValue('tipo_novedad', firstType);
    setValue('subtipo', undefined);
    setValue('dias', undefined);
    setValue('horas', undefined);
    setValue('valor', 0);
    setValue('fecha_inicio', undefined);
    setValue('fecha_fin', undefined);
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
                onClick={() => handleCategoryChange(key as 'devengados' | 'deducciones')}
                className={`flex items-center space-x-2 ${
                  selectedCategory === key 
                    ? (key === 'devengados' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')
                    : 'border-gray-200'
                }`}
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
              <Select value={field.value} onValueChange={(value) => {
                field.onChange(value);
                console.log('Tipo de novedad cambiado a:', value);
                // Limpiar campos dependientes
                setValue('subtipo', undefined);
                setValue('dias', undefined);
                setValue('horas', undefined);
                setValue('valor', 0);
              }}>
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
        {currentTypeConfig?.subtipos && currentTypeConfig.subtipos.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="subtipo" className="text-sm font-medium text-gray-900">
              Subtipo *
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
                Fecha inicio {currentTypeConfig?.requiere_dias ? '*' : ''}
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
                Fecha fin {currentTypeConfig?.requiere_dias ? '*' : ''}
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
                Días *
                {fechaInicio && fechaFin && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Auto-calculado
                  </Badge>
                )}
              </Label>
              <Input
                {...register('dias', { 
                  setValueAs: (value) => {
                    if (value === '' || value === null || value === undefined) return undefined;
                    const num = Number(value);
                    return isNaN(num) ? undefined : num;
                  }
                })}
                type="number"
                id="dias"
                placeholder="0"
                min="0"
                max="90"
                readOnly={fechaInicio && fechaFin ? true : false}
                className={`border-gray-200 focus:border-gray-300 focus:ring-0 ${
                  fechaInicio && fechaFin ? 'bg-gray-50' : ''
                }`}
              />
            </div>
          )}

          {currentTypeConfig?.requiere_horas && (
            <div className="space-y-2">
              <Label htmlFor="horas" className="text-sm font-medium text-gray-900">
                Horas *
              </Label>
              <Input
                {...register('horas', { 
                  setValueAs: (value) => {
                    if (value === '' || value === null || value === undefined) return undefined;
                    const num = Number(value);
                    return isNaN(num) ? undefined : num;
                  }
                })}
                type="number"
                id="horas"
                placeholder="0"
                min="0"
                step="0.5"
                className="border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="valor" className="text-sm font-medium text-gray-900">
                Valor *
              </Label>
              {currentTypeConfig?.auto_calculo && (
                <Badge variant="outline" className="text-xs">
                  <Calculator className="h-3 w-3 mr-1" />
                  Auto
                </Badge>
              )}
            </div>
            <Input
              {...register('valor', { 
                setValueAs: (value) => {
                  const num = Number(value);
                  return isNaN(num) ? 0 : num;
                }
              })}
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
        {currentTypeConfig?.auto_calculo && calculationDetail && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-900">Cálculo automático:</span>
                  {calculatedValue > 0 && (
                    <Badge className="bg-blue-600 text-white">{formatCurrency(calculatedValue)}</Badge>
                  )}
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
