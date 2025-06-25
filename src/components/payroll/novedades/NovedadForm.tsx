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
import { Save, X, Calculator, Info, Calendar, Clock, Users } from 'lucide-react';

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

  // Función para obtener el color de la categoría
  const getCategoryColor = () => {
    switch (currentCategory) {
      case 'devengados':
        return 'green';
      case 'deducciones':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Función para obtener el color específico del tipo de novedad
  const getTypeSpecificColor = () => {
    switch (tipoNovedad) {
      case 'incapacidad':
        return 'amber';
      case 'horas_extra':
      case 'recargo_nocturno':
        return 'blue';
      case 'vacaciones':
      case 'licencia_remunerada':
        return 'purple';
      case 'bonificacion':
      case 'comision':
      case 'prima':
        return 'emerald';
      case 'ausencia':
      case 'multa':
        return 'orange';
      case 'libranza':
      case 'descuento_voluntario':
        return 'indigo';
      case 'fondo_solidaridad':
        return 'cyan';
      default:
        return getCategoryColor();
    }
  };

  // Función para obtener información contextual por tipo
  const getContextualInfo = () => {
    switch (tipoNovedad) {
      case 'incapacidad':
        return {
          icon: <Info className="h-3 w-3" />,
          text: 'Los días se calculan automáticamente entre fechas'
        };
      case 'horas_extra':
        return {
          icon: <Clock className="h-3 w-3" />,
          text: 'Cálculo automático según factor de recargo'
        };
      case 'recargo_nocturno':
        return {
          icon: <Clock className="h-3 w-3" />,
          text: '35% de recargo sobre valor hora'
        };
      case 'vacaciones':
        return {
          icon: <Calendar className="h-3 w-3" />,
          text: 'Valor diario calculado sobre salario base'
        };
      case 'licencia_remunerada':
        return {
          icon: <Users className="h-3 w-3" />,
          text: '100% del salario por días de licencia'
        };
      case 'ausencia':
        return {
          icon: <Info className="h-3 w-3" />,
          text: 'Descuento por días no laborados'
        };
      case 'fondo_solidaridad':
        return {
          icon: <Info className="h-3 w-3" />,
          text: 'Solo aplica para salarios >= 4 SMMLV'
        };
      default:
        return null;
    }
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

  const typeColor = getTypeSpecificColor();
  const contextualInfo = getContextualInfo();

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
          {contextualInfo && (
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              {contextualInfo.icon}
              <span>{contextualInfo.text}</span>
            </div>
          )}
        </div>

        {/* Subtipo mejorado */}
        {currentTypeConfig?.subtipos && currentTypeConfig.subtipos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subtipo" className="text-sm font-medium text-gray-900">
                {tipoNovedad === 'incapacidad' ? 'Tipo de incapacidad' : 
                 tipoNovedad === 'horas_extra' ? 'Tipo de horas extra' :
                 tipoNovedad === 'bonificacion' ? 'Tipo de bonificación' :
                 tipoNovedad === 'licencia_remunerada' ? 'Tipo de licencia' :
                 'Subtipo'} *
              </Label>
              {(tipoNovedad === 'incapacidad' || tipoNovedad === 'horas_extra') && (
                <Badge variant="outline" className="text-xs">
                  Requerido para cálculo
                </Badge>
              )}
            </div>
            <Controller
              name="subtipo"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ''} onValueChange={(value) => {
                  field.onChange(value);
                  console.log('Subtipo seleccionado:', value, 'Para tipo:', tipoNovedad);
                }}>
                  <SelectTrigger className="border-gray-200 focus:border-gray-300 focus:ring-0">
                    <SelectValue placeholder={`Selecciona el ${
                      tipoNovedad === 'incapacidad' ? 'tipo de incapacidad' :
                      tipoNovedad === 'horas_extra' ? 'tipo de horas extra' :
                      tipoNovedad === 'bonificacion' ? 'tipo de bonificación' :
                      'subtipo'
                    }`} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentTypeConfig.subtipos.map((subtipo) => (
                      <SelectItem key={subtipo} value={subtipo}>
                        <div className="flex flex-col">
                          <span className="font-medium capitalize">{subtipo}</span>
                          {tipoNovedad === 'incapacidad' && (
                            <span className="text-xs text-gray-500">
                              {subtipo === 'general' && 'EPS paga desde día 4 al 66.7%'}
                              {subtipo === 'laboral' && 'ARL paga desde día 1 al 100%'}
                              {subtipo === 'maternidad' && 'EPS paga al 100%'}
                            </span>
                          )}
                          {tipoNovedad === 'horas_extra' && (
                            <span className="text-xs text-gray-500">
                              {subtipo === 'diurnas' && 'Recargo del 25%'}
                              {subtipo === 'nocturnas' && 'Recargo del 75%'}
                              {subtipo === 'dominicales' && 'Recargo del 75%'}
                              {subtipo === 'festivas' && 'Recargo del 75%'}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {/* Fechas mejoradas */}
        {(currentTypeConfig?.requiere_dias || tipoNovedad === 'vacaciones' || tipoNovedad === 'incapacidad' || tipoNovedad === 'licencia_remunerada' || tipoNovedad === 'ausencia') && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className={`h-4 w-4 text-${typeColor}-600`} />
              <Label className="text-sm font-medium text-gray-900">
                Período {currentTypeConfig?.requiere_dias ? '*' : ''}
              </Label>
              {(tipoNovedad === 'incapacidad' || tipoNovedad === 'vacaciones' || tipoNovedad === 'licencia_remunerada' || tipoNovedad === 'ausencia') && (
                <Badge variant="outline" className="text-xs">
                  Los días se calculan automáticamente
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_inicio" className="text-xs font-medium text-gray-700">
                  Fecha inicio *
                </Label>
                <Input
                  {...register('fecha_inicio')}
                  type="date"
                  id="fecha_inicio"
                  className={`border-gray-200 focus:border-${typeColor}-300 focus:ring-1 focus:ring-${typeColor}-200`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_fin" className="text-xs font-medium text-gray-700">
                  Fecha fin *
                </Label>
                <Input
                  {...register('fecha_fin')}
                  type="date"
                  id="fecha_fin"
                  className={`border-gray-200 focus:border-${typeColor}-300 focus:ring-1 focus:ring-${typeColor}-200`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Días, Horas y Valor - Layout mejorado */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentTypeConfig?.requiere_dias && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dias" className="text-sm font-medium text-gray-900">
                    Días *
                  </Label>
                  {fechaInicio && fechaFin && (
                    <Badge variant="secondary" className={`text-xs bg-${typeColor}-50 text-${typeColor}-700`}>
                      Auto-calculado
                    </Badge>
                  )}
                </div>
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
                  className={`border-gray-200 focus:border-${typeColor}-300 focus:ring-1 focus:ring-${typeColor}-200 ${
                    fechaInicio && fechaFin ? `bg-${typeColor}-50 text-${typeColor}-900` : ''
                  }`}
                />
              </div>
            )}

            {currentTypeConfig?.requiere_horas && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="horas" className="text-sm font-medium text-gray-900">
                    Horas *
                  </Label>
                  {tipoNovedad === 'horas_extra' && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Tiempo extra
                    </Badge>
                  )}
                </div>
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
                  className={`border-gray-200 focus:border-${typeColor}-300 focus:ring-1 focus:ring-${typeColor}-200`}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="valor" className="text-sm font-medium text-gray-900">
                  Valor *
                </Label>
                {currentTypeConfig?.auto_calculo && (
                  <Badge variant="secondary" className={`text-xs bg-${typeColor}-50 text-${typeColor}-700`}>
                    <Calculator className="h-3 w-3 mr-1" />
                    Auto-calculado
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
                className={`border-gray-200 focus:border-${typeColor}-300 focus:ring-1 focus:ring-${typeColor}-200 ${
                  currentTypeConfig?.auto_calculo ? `bg-${typeColor}-50 text-${typeColor}-900 font-semibold` : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Cálculo automático mejorado */}
        {currentTypeConfig?.auto_calculo && calculationDetail && (
          <Card className={`p-4 border-l-4 bg-${typeColor}-50 border-${typeColor}-200 border-l-${typeColor}-500`}>
            <div className="flex items-start space-x-3">
              <div className={`p-1 rounded bg-${typeColor}-100`}>
                <Calculator className={`h-4 w-4 text-${typeColor}-600`} />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold text-${typeColor}-900`}>
                    {tipoNovedad === 'incapacidad' ? 'Cálculo de incapacidad:' :
                     tipoNovedad === 'horas_extra' ? 'Cálculo de horas extra:' :
                     tipoNovedad === 'recargo_nocturno' ? 'Cálculo de recargo nocturno:' :
                     tipoNovedad === 'vacaciones' ? 'Cálculo de vacaciones:' :
                     tipoNovedad === 'licencia_remunerada' ? 'Cálculo de licencia:' :
                     tipoNovedad === 'ausencia' ? 'Cálculo de ausencia:' :
                     tipoNovedad === 'fondo_solidaridad' ? 'Cálculo de fondo solidaridad:' :
                     'Cálculo automático:'}
                  </span>
                  {calculatedValue > 0 && (
                    <Badge className={`text-white font-semibold bg-${typeColor}-600`}>
                      {formatCurrency(calculatedValue)}
                    </Badge>
                  )}
                </div>
                <div className={`p-3 rounded-md text-xs font-mono bg-${typeColor}-100 text-${typeColor}-800 border border-${typeColor}-200`}>
                  {calculationDetail}
                </div>
                {tipoNovedad === 'incapacidad' && subtipo === 'general' && dias && dias <= 3 && (
                  <div className={`flex items-center space-x-2 text-xs text-${typeColor}-700`}>
                    <Info className="h-3 w-3" />
                    <span>Los primeros 3 días no son pagados por la EPS</span>
                  </div>
                )}
                {tipoNovedad === 'fondo_solidaridad' && employeeSalary < (1300000 * 4) && (
                  <div className={`flex items-center space-x-2 text-xs text-${typeColor}-700`}>
                    <Info className="h-3 w-3" />
                    <span>Solo aplica para salarios de 4 SMMLV o más</span>
                  </div>
                )}
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
