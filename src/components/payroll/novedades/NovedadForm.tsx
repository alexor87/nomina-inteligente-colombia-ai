import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { Calculator, Loader2, Clock, Info, CheckCircle2 } from 'lucide-react';
import { JornadaLegalTooltip } from '@/components/ui/JornadaLegalTooltip';

// Define the enhanced categories structure that matches the enhanced types
const NOVEDAD_CATEGORIES_ENHANCED = {
  devengados: {
    label: 'Devengados',
    types: {
      horas_extra: { label: 'Horas Extra', icon: '⏰' },
      recargo_nocturno: { label: 'Recargo Nocturno', icon: '🌙' },
      vacaciones: { label: 'Vacaciones', icon: '🏖️' },
      licencia_remunerada: { label: 'Licencia Remunerada', icon: '📋' },
      incapacidad: { label: 'Incapacidad', icon: '🏥' },
      bonificacion: { label: 'Bonificación', icon: '🎁' },
      comision: { label: 'Comisión', icon: '💰' },
      prima: { label: 'Prima', icon: '⭐' },
      otros_ingresos: { label: 'Otros Ingresos', icon: '💵' }
    }
  },
  deducciones: {
    label: 'Deducciones',
    types: {
      libranza: { label: 'Libranza', icon: '🏦' },
      multa: { label: 'Multa', icon: '⚠️' },
      ausencia: { label: 'Ausencia', icon: '❌' },
      descuento_voluntario: { label: 'Descuento Voluntario', icon: '📝' },
      retencion_fuente: { label: 'Retención en la Fuente', icon: '📊' },
      fondo_solidaridad: { label: 'Fondo de Solidaridad', icon: '🤝' },
      salud: { label: 'Salud', icon: '🏥' },
      pension: { label: 'Pensión', icon: '👴' },
      arl: { label: 'ARL', icon: '🛡️' },
      caja_compensacion: { label: 'Caja de Compensación', icon: '👨‍👩‍👧‍👦' },
      icbf: { label: 'ICBF', icon: '👶' },
      sena: { label: 'SENA', icon: '🎓' }
    }
  }
} as const;

interface NovedadFormProps {
  onSubmit: (data: CreateNovedadData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateNovedadData>;
  isLoading?: boolean;
  employeeSalary?: number;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
  modalType?: 'devengado' | 'deduccion';
}

export const NovedadForm = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  employeeSalary = 1300000,
  calculateSuggestedValue,
  modalType = 'devengado'
}: NovedadFormProps) => {
  const [formData, setFormData] = useState<CreateNovedadData>({
    empleado_id: initialData?.empleado_id || '',
    periodo_id: initialData?.periodo_id || '',
    tipo_novedad: 'horas_extra' as NovedadType,
    subtipo: 'diurnas',
    fecha_inicio: '',
    fecha_fin: '',
    dias: null,
    horas: null,
    valor: 0,
    observacion: '',
    ...initialData
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'devengados' | 'deducciones'>(
    modalType === 'devengado' ? 'devengados' : 'deducciones'
  );
  const [currentPeriodDate] = useState<Date>(new Date());

  useEffect(() => {
    if (initialData?.tipo_novedad) {
      const isInDevengados = Object.keys(NOVEDAD_CATEGORIES_ENHANCED.devengados.types).includes(initialData.tipo_novedad);
      setSelectedCategory(isInDevengados ? 'devengados' : 'deducciones');
    }
  }, [initialData]);

  // Configuración de campos dinámicos basada en el tipo de novedad
  const fieldConfig = useMemo(() => {
    const config = {
      showHours: false,
      showDays: false,
      showDates: false,
      showSubtipo: false,
      requiresHours: false,
      requiresDays: false,
      requiresDates: false,
      isAutoCalculated: false,
      helpText: '',
      subtipoOptions: [] as Array<{value: string, label: string}>
    };

    switch (formData.tipo_novedad) {
      case 'horas_extra':
        config.showHours = true;
        config.requiresHours = true;
        config.showSubtipo = true;
        config.isAutoCalculated = true;
        config.helpText = 'Se calculará automáticamente según las horas y el tipo de recargo';
        config.subtipoOptions = [
          { value: 'diurnas', label: 'Diurnas (25%)' },
          { value: 'nocturnas', label: 'Nocturnas (75%)' },
          { value: 'dominicales_diurnas', label: 'Dominicales Diurnas (100%)' },
          { value: 'dominicales_nocturnas', label: 'Dominicales Nocturnas (150%)' },
          { value: 'festivas_diurnas', label: 'Festivas Diurnas (100%)' },
          { value: 'festivas_nocturnas', label: 'Festivas Nocturnas (150%)' }
        ];
        break;

      case 'recargo_nocturno':
        config.showHours = true;
        config.requiresHours = true;
        config.isAutoCalculated = true;
        config.helpText = 'Se calculará automáticamente con recargo del 35%';
        break;

      case 'vacaciones':
      case 'licencia_remunerada':
        config.showDays = true;
        config.showDates = true;
        config.requiresDays = true;
        config.requiresDates = true;
        config.isAutoCalculated = true;
        config.helpText = 'Se calculará automáticamente según los días especificados';
        break;

      case 'incapacidad':
        config.showDays = true;
        config.showDates = true;
        config.showSubtipo = true;
        config.requiresDays = true;
        config.requiresDates = true;
        config.isAutoCalculated = true;
        config.helpText = 'Se calculará automáticamente según el tipo de incapacidad';
        config.subtipoOptions = [
          { value: 'comun', label: 'Común - EPS (66.7%)' },
          { value: 'laboral', label: 'Laboral - ARL (100%)' },
          { value: 'maternidad', label: 'Maternidad - EPS (100%)' }
        ];
        break;

      case 'ausencia':
        config.showDays = true;
        config.showDates = true;
        config.requiresDays = true;
        config.isAutoCalculated = true;
        config.helpText = 'Se calculará automáticamente como deducción por días de ausencia';
        break;

      case 'bonificacion':
      case 'comision':
      case 'prima':
      case 'otros_ingresos':
        config.showHours = true;
        config.showDays = true;
        config.showDates = true;
        config.helpText = 'Ingrese el valor manualmente o use días/horas para cálculo automático';
        break;

      default:
        config.helpText = 'Ingrese el valor manualmente';
        break;
    }

    return config;
  }, [formData.tipo_novedad]);

  // Memoizar la validación para evitar cálculos innecesarios
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    // Validate required hours
    if (fieldConfig.requiresHours && (!formData.horas || formData.horas <= 0)) {
      errors.horas = 'Las horas son obligatorias para este tipo de novedad';
    }

    // Validate hours range
    if (formData.horas !== null && formData.horas > 24) {
      errors.horas = 'Las horas no pueden ser mayor a 24';
    }

    // Validate required days
    if (fieldConfig.requiresDays && (!formData.dias || formData.dias <= 0)) {
      errors.dias = 'Los días son obligatorios para este tipo de novedad';
    }

    // Validate required dates
    if (fieldConfig.requiresDates) {
      if (!formData.fecha_inicio) {
        errors.fecha_inicio = 'La fecha de inicio es obligatoria';
      }
      if (!formData.fecha_fin) {
        errors.fecha_fin = 'La fecha de fin es obligatoria';
      }
    }

    // Validate dates
    if (formData.fecha_inicio && formData.fecha_fin && 
        new Date(formData.fecha_fin) < new Date(formData.fecha_inicio)) {
      errors.fecha_fin = 'La fecha fin no puede ser anterior a la fecha inicio';
    }

    // Validate value
    if (formData.valor < 0) {
      errors.valor = 'El valor no puede ser negativo';
    }

    if (formData.valor === 0) {
      errors.valor = 'El valor debe ser mayor a 0';
    }

    return errors;
  }, [formData, fieldConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = useCallback((field: keyof CreateNovedadData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Función de cálculo mejorada - completamente memoizada y validada
  const suggestedValue = useMemo(() => {
    if (!employeeSalary || employeeSalary <= 0) return null;
    if (!fieldConfig.isAutoCalculated) return null;
    
    const needsHours = fieldConfig.requiresHours && (!formData.horas || formData.horas <= 0);
    const needsDays = fieldConfig.requiresDays && (!formData.dias || formData.dias <= 0);
    
    if (needsHours || needsDays) {
      return null;
    }

    try {
      if (calculateSuggestedValue) {
        return calculateSuggestedValue(
          formData.tipo_novedad,
          formData.subtipo,
          formData.horas || undefined,
          formData.dias || undefined
        );
      }
      
      const resultado = calcularValorNovedadEnhanced(
        formData.tipo_novedad,
        formData.subtipo,
        employeeSalary,
        formData.dias || undefined,
        formData.horas || undefined,
        currentPeriodDate
      );
      
      return resultado.valor > 0 ? resultado.valor : null;
    } catch (error) {
      console.error('Error calculating suggested value:', error);
      return null;
    }
  }, [
    employeeSalary,
    formData.tipo_novedad,
    formData.subtipo,
    formData.horas,
    formData.dias,
    fieldConfig.isAutoCalculated,
    fieldConfig.requiresHours,
    fieldConfig.requiresDays,
    currentPeriodDate,
    calculateSuggestedValue
  ]);

  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0 && formData.valor > 0;
  }, [validationErrors, formData.valor]);

  return (
    <div className="flex flex-col h-[600px]">
      {/* Compact Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b bg-gray-50/50">
        {/* Category Selection - Only show if modalType is not defined */}
        {!modalType && (
          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={selectedCategory === 'devengados' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('devengados')}
              className="flex-1"
              size="sm"
            >
              Devengados
            </Button>
            <Button
              type="button"
              variant={selectedCategory === 'deducciones' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('deducciones')}
              className="flex-1"
              size="sm"
            >
              Deducciones
            </Button>
          </div>
        )}

        {/* Novedad Type Selection */}
        <div className="space-y-3">
          <Label htmlFor="tipo_novedad" className="text-sm font-medium text-gray-900">
            Tipo de Novedad
          </Label>
          <Select
            value={formData.tipo_novedad}
            onValueChange={(value) => {
              const newTipoNovedad = value as NovedadType;
              setFormData(prev => ({
                ...prev,
                tipo_novedad: newTipoNovedad,
                subtipo: newTipoNovedad === 'horas_extra' ? 'diurnas' : 
                         newTipoNovedad === 'incapacidad' ? 'comun' : '',
                horas: null,
                dias: null,
                fecha_inicio: '',
                fecha_fin: '',
                valor: 0
              }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona el tipo de novedad" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NOVEDAD_CATEGORIES_ENHANCED[selectedCategory].types).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center space-x-2">
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Help Text */}
        {fieldConfig.helpText && (
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 leading-relaxed">{fieldConfig.helpText}</p>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="py-6 space-y-8">
          {/* Configuration Section */}
          {(fieldConfig.showSubtipo || fieldConfig.showDates) && (
            <Card className="border-gray-200">
              <CardContent className="p-6 space-y-6">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Configuración</span>
                </h4>

                {/* Subtipo Selection */}
                {fieldConfig.showSubtipo && fieldConfig.subtipoOptions.length > 0 && (
                  <div className="space-y-3">
                    <Label htmlFor="subtipo" className="text-sm font-medium text-gray-700">
                      {formData.tipo_novedad === 'horas_extra' ? 'Tipo de Horas Extra' : 'Tipo de Incapacidad'}
                    </Label>
                    <Select
                      value={formData.subtipo || (formData.tipo_novedad === 'horas_extra' ? 'diurnas' : 'comun')}
                      onValueChange={(value) => handleInputChange('subtipo', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldConfig.subtipoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date Fields */}
                {fieldConfig.showDates && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="fecha_inicio" className="text-sm font-medium text-gray-700">
                        Fecha Inicio {fieldConfig.requiresDates && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="fecha_inicio"
                        type="date"
                        value={formData.fecha_inicio || ''}
                        onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
                        className={validationErrors.fecha_inicio ? 'border-red-300 focus:border-red-500' : ''}
                      />
                      {validationErrors.fecha_inicio && (
                        <p className="text-xs text-red-600 flex items-center space-x-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          <span>{validationErrors.fecha_inicio}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="fecha_fin" className="text-sm font-medium text-gray-700">
                        Fecha Fin {fieldConfig.requiresDates && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="fecha_fin"
                        type="date"
                        value={formData.fecha_fin || ''}
                        onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
                        className={validationErrors.fecha_fin ? 'border-red-300 focus:border-red-500' : ''}
                      />
                      {validationErrors.fecha_fin && (
                        <p className="text-xs text-red-600 flex items-center space-x-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          <span>{validationErrors.fecha_fin}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quantity Section */}
          {(fieldConfig.showDays || fieldConfig.showHours) && (
            <Card className="border-gray-200">
              <CardContent className="p-6 space-y-6">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Calculator className="h-4 w-4" />
                  <span>Cantidades</span>
                </h4>

                <div className="grid grid-cols-2 gap-6">
                  {fieldConfig.showDays && (
                    <div className="space-y-3">
                      <Label htmlFor="dias" className="text-sm font-medium text-gray-700">
                        Días {fieldConfig.requiresDays && <span className="text-red-500">*</span>}
                        {!fieldConfig.requiresDays && <span className="text-gray-400 text-xs ml-1">(opcional)</span>}
                      </Label>
                      <Input
                        id="dias"
                        type="number"
                        min="0"
                        value={formData.dias || ''}
                        onChange={(e) => handleInputChange('dias', e.target.value ? parseInt(e.target.value) : null)}
                        className={validationErrors.dias ? 'border-red-300 focus:border-red-500' : ''}
                      />
                      {validationErrors.dias && (
                        <p className="text-xs text-red-600 flex items-center space-x-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          <span>{validationErrors.dias}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {fieldConfig.showHours && (
                    <div className="space-y-3">
                      <Label htmlFor="horas" className="text-sm font-medium text-gray-700">
                        Horas {fieldConfig.requiresHours && <span className="text-red-500">*</span>}
                        {!fieldConfig.requiresHours && <span className="text-gray-400 text-xs ml-1">(opcional)</span>}
                      </Label>
                      <Input
                        id="horas"
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={formData.horas || ''}
                        onChange={(e) => handleInputChange('horas', e.target.value ? parseFloat(e.target.value) : null)}
                        className={validationErrors.horas ? 'border-red-300 focus:border-red-500' : ''}
                      />
                      {validationErrors.horas && (
                        <p className="text-xs text-red-600 flex items-center space-x-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          <span>{validationErrors.horas}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Value Section */}
          <Card className="border-gray-200">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <span className="text-lg">💰</span>
                  <span>Valor</span>
                  <span className="text-red-500">*</span>
                </h4>
                <div className="flex items-center space-x-3">
                  <JornadaLegalTooltip fecha={currentPeriodDate} showBadge={false} />
                  {suggestedValue && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('valor', suggestedValue)}
                      className="flex items-center space-x-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <Calculator className="h-4 w-4" />
                      <span className="font-medium">${suggestedValue.toLocaleString()}</span>
                    </Button>
                  )}
                </div>
              </div>

              <Input
                id="valor"
                type="number"
                min="0"
                step="1000"
                value={formData.valor}
                onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
                placeholder="Ingresa el valor"
                className={`text-lg font-medium ${validationErrors.valor ? 'border-red-300 focus:border-red-500' : 'border-gray-300'}`}
              />
              
              {validationErrors.valor && (
                <p className="text-xs text-red-600 flex items-center space-x-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  <span>{validationErrors.valor}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Observations Section */}
          <Card className="border-gray-200">
            <CardContent className="p-6 space-y-4">
              <Label htmlFor="observacion" className="text-sm font-medium text-gray-700">
                Observaciones
              </Label>
              <Textarea
                id="observacion"
                value={formData.observacion || ''}
                onChange={(e) => handleInputChange('observacion', e.target.value)}
                placeholder="Agrega cualquier observación adicional"
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-gray-900">Vista previa</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formData.tipo_novedad.replace('_', ' ')} • {formData.valor.toLocaleString()} COP
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      {fieldConfig.isAutoCalculated ? 'Cálculo automático' : 'Valor manual'}
                    </span>
                  </div>
                </div>
                <Badge 
                  variant={selectedCategory === 'devengados' ? 'default' : 'destructive'}
                  className="text-lg px-4 py-2"
                >
                  {selectedCategory === 'devengados' ? '+' : '-'} ${formData.valor.toLocaleString()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </form>
      </ScrollArea>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50/50">
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
