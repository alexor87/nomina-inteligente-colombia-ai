
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { Calculator, Loader2, Info } from 'lucide-react';

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
      caja_compensacion: { label: 'Caja de Compensión', icon: '👨‍👩‍👧‍👦' },
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

  // Validaciones simples
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (fieldConfig.requiresHours && (!formData.horas || formData.horas <= 0)) {
      errors.horas = 'Requerido';
    }
    if (formData.horas !== null && formData.horas > 24) {
      errors.horas = 'Máximo 24 horas';
    }
    if (fieldConfig.requiresDays && (!formData.dias || formData.dias <= 0)) {
      errors.dias = 'Requerido';
    }
    if (fieldConfig.requiresDates) {
      if (!formData.fecha_inicio) errors.fecha_inicio = 'Requerido';
      if (!formData.fecha_fin) errors.fecha_fin = 'Requerido';
    }
    if (formData.fecha_inicio && formData.fecha_fin && 
        new Date(formData.fecha_fin) < new Date(formData.fecha_inicio)) {
      errors.fecha_fin = 'Fecha fin debe ser posterior';
    }
    if (formData.valor <= 0) {
      errors.valor = 'Debe ser mayor a 0';
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

  // Función de cálculo mejorada
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
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {/* Category Selection - Only show if modalType is not defined */}
      {!modalType && (
        <div className="flex space-x-2">
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

      {/* Tipo de Novedad */}
      <div className="space-y-2">
        <Label htmlFor="tipo_novedad">Tipo de Novedad</Label>
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
          <SelectTrigger>
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
        <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">{fieldConfig.helpText}</p>
        </div>
      )}

      {/* Subtipo Selection */}
      {fieldConfig.showSubtipo && fieldConfig.subtipoOptions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="subtipo">
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
          <div className="space-y-2">
            <Label htmlFor="fecha_inicio">
              Fecha Inicio {fieldConfig.requiresDates && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="fecha_inicio"
              type="date"
              value={formData.fecha_inicio || ''}
              onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
              className={validationErrors.fecha_inicio ? 'border-red-300' : ''}
            />
            {validationErrors.fecha_inicio && (
              <p className="text-xs text-red-600">{validationErrors.fecha_inicio}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_fin">
              Fecha Fin {fieldConfig.requiresDates && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="fecha_fin"
              type="date"
              value={formData.fecha_fin || ''}
              onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
              className={validationErrors.fecha_fin ? 'border-red-300' : ''}
            />
            {validationErrors.fecha_fin && (
              <p className="text-xs text-red-600">{validationErrors.fecha_fin}</p>
            )}
          </div>
        </div>
      )}

      {/* Cantidad Fields */}
      {(fieldConfig.showDays || fieldConfig.showHours) && (
        <div className="grid grid-cols-2 gap-4">
          {fieldConfig.showDays && (
            <div className="space-y-2">
              <Label htmlFor="dias">
                Días {fieldConfig.requiresDays && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="dias"
                type="number"
                min="0"
                value={formData.dias || ''}
                onChange={(e) => handleInputChange('dias', e.target.value ? parseInt(e.target.value) : null)}
                className={validationErrors.dias ? 'border-red-300' : ''}
              />
              {validationErrors.dias && (
                <p className="text-xs text-red-600">{validationErrors.dias}</p>
              )}
            </div>
          )}

          {fieldConfig.showHours && (
            <div className="space-y-2">
              <Label htmlFor="horas">
                Horas {fieldConfig.requiresHours && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="horas"
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={formData.horas || ''}
                onChange={(e) => handleInputChange('horas', e.target.value ? parseFloat(e.target.value) : null)}
                className={validationErrors.horas ? 'border-red-300' : ''}
              />
              {validationErrors.horas && (
                <p className="text-xs text-red-600">{validationErrors.horas}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Valor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="valor">Valor <span className="text-red-500">*</span></Label>
          {suggestedValue && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleInputChange('valor', suggestedValue)}
              className="flex items-center space-x-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <Calculator className="h-4 w-4" />
              <span>Usar ${suggestedValue.toLocaleString()}</span>
            </Button>
          )}
        </div>

        <Input
          id="valor"
          type="number"
          min="0"
          step="1000"
          value={formData.valor}
          onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
          placeholder="Ingresa el valor"
          className={`text-lg ${validationErrors.valor ? 'border-red-300' : ''}`}
        />
        
        {validationErrors.valor && (
          <p className="text-xs text-red-600">{validationErrors.valor}</p>
        )}
      </div>

      {/* Observaciones */}
      <div className="space-y-2">
        <Label htmlFor="observacion">Observaciones</Label>
        <Textarea
          id="observacion"
          value={formData.observacion || ''}
          onChange={(e) => handleInputChange('observacion', e.target.value)}
          placeholder="Agrega cualquier observación adicional"
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">
              {formData.tipo_novedad.replace('_', ' ')}
            </p>
            <p className="text-sm text-gray-600">
              {fieldConfig.isAutoCalculated ? 'Cálculo automático' : 'Valor manual'}
            </p>
          </div>
          <Badge 
            variant={selectedCategory === 'devengados' ? 'default' : 'destructive'}
            className="text-lg px-3 py-1"
          >
            {selectedCategory === 'devengados' ? '+' : '-'} ${formData.valor.toLocaleString()}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
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
    </form>
  );
};
