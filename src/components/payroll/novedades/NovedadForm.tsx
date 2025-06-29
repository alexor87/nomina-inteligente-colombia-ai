
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { Calculator, Loader2 } from 'lucide-react';

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
      subtipoOptions: [] as Array<{value: string, label: string}>
    };

    switch (formData.tipo_novedad) {
      case 'horas_extra':
        config.showHours = true;
        config.requiresHours = true;
        config.showSubtipo = true;
        config.isAutoCalculated = true;
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
        break;

      case 'vacaciones':
      case 'licencia_remunerada':
        config.showDays = true;
        config.showDates = true;
        config.requiresDays = true;
        config.requiresDates = true;
        config.isAutoCalculated = true;
        break;

      case 'incapacidad':
        config.showDays = true;
        config.showDates = true;
        config.showSubtipo = true;
        config.requiresDays = true;
        config.requiresDates = true;
        config.isAutoCalculated = true;
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
        break;

      case 'bonificacion':
      case 'comision':
      case 'prima':
      case 'otros_ingresos':
        config.showHours = true;
        config.showDays = true;
        config.showDates = true;
        break;
    }

    return config;
  }, [formData.tipo_novedad]);

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

  // Auto-apply suggested value when available
  useEffect(() => {
    if (suggestedValue && suggestedValue > 0 && formData.valor === 0) {
      setFormData(prev => ({ ...prev, valor: suggestedValue }));
    }
  }, [suggestedValue, formData.valor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.valor <= 0) return;

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

  const isFormValid = formData.valor > 0;

  return (
    <div className="p-6 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection - Only show if modalType is not defined */}
        {!modalType && (
          <div className="flex rounded-lg border p-1">
            <Button
              type="button"
              variant={selectedCategory === 'devengados' ? 'default' : 'ghost'}
              onClick={() => setSelectedCategory('devengados')}
              className="flex-1"
              size="sm"
            >
              Devengados
            </Button>
            <Button
              type="button"
              variant={selectedCategory === 'deducciones' ? 'default' : 'ghost'}
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
          <Label>Tipo de Novedad</Label>
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
              <SelectValue />
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

        {/* Subtipo Selection */}
        {fieldConfig.showSubtipo && fieldConfig.subtipoOptions.length > 0 && (
          <div className="space-y-2">
            <Label>
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

        {/* Campos dinámicos en una fila */}
        {(fieldConfig.showHours || fieldConfig.showDays) && (
          <div className="grid grid-cols-2 gap-4">
            {fieldConfig.showHours && (
              <div className="space-y-2">
                <Label>Horas {fieldConfig.requiresHours && '*'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={formData.horas || ''}
                  onChange={(e) => handleInputChange('horas', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0"
                />
              </div>
            )}

            {fieldConfig.showDays && (
              <div className="space-y-2">
                <Label>Días {fieldConfig.requiresDays && '*'}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.dias || ''}
                  onChange={(e) => handleInputChange('dias', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0"
                />
              </div>
            )}
          </div>
        )}

        {/* Date Fields */}
        {fieldConfig.showDates && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio {fieldConfig.requiresDates && '*'}</Label>
              <Input
                type="date"
                value={formData.fecha_inicio || ''}
                onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin {fieldConfig.requiresDates && '*'}</Label>
              <Input
                type="date"
                value={formData.fecha_fin || ''}
                onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Valor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Valor *</Label>
            {suggestedValue && suggestedValue !== formData.valor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('valor', suggestedValue)}
                className="text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Calculator className="h-3 w-3 mr-1" />
                Usar ${suggestedValue.toLocaleString()}
              </Button>
            )}
          </div>

          <Input
            type="number"
            min="0"
            step="1000"
            value={formData.valor}
            onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="text-lg font-medium"
          />
        </div>

        {/* Observaciones */}
        <div className="space-y-2">
          <Label>Observaciones</Label>
          <Textarea
            value={formData.observacion || ''}
            onChange={(e) => handleInputChange('observacion', e.target.value)}
            placeholder="Observaciones adicionales..."
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Preview simple */}
        {formData.valor > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <Badge 
              variant={selectedCategory === 'devengados' ? 'default' : 'destructive'}
              className="text-base px-4 py-2"
            >
              {selectedCategory === 'devengados' ? '+' : '-'} ${formData.valor.toLocaleString()}
            </Badge>
          </div>
        )}

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
    </div>
  );
};
