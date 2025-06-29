
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { Calculator, Loader2, Clock } from 'lucide-react';
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
    subtipo: '',
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
      // Determine category based on initial data
      const isInDevengados = Object.keys(NOVEDAD_CATEGORIES_ENHANCED.devengados.types).includes(initialData.tipo_novedad);
      setSelectedCategory(isInDevengados ? 'devengados' : 'deducciones');
    }
  }, [initialData]);

  // Memoizar la validación para evitar cálculos innecesarios
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    // Validate hours
    if (formData.horas !== null && formData.horas > 24) {
      errors.horas = 'Las horas no pueden ser mayor a 24';
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
  }, [formData.horas, formData.fecha_inicio, formData.fecha_fin, formData.valor]);

  // Función memoizada para determinar si el tipo de novedad requiere horas o días
  const requiresQuantity = useMemo(() => {
    const typesRequiringHours = ['horas_extra', 'recargo_nocturno'];
    const typesRequiringDays = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'ausencia'];
    
    return {
      requiresHours: typesRequiringHours.includes(formData.tipo_novedad),
      requiresDays: typesRequiringDays.includes(formData.tipo_novedad)
    };
  }, [formData.tipo_novedad]);

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

  // Función de cálculo mejorada - completamente memoizada
  const suggestedValue = useMemo(() => {
    // Solo calcular si realmente necesitamos un valor sugerido
    if (!employeeSalary || employeeSalary <= 0) return null;
    
    // Verificar si el tipo de novedad requiere cantidades específicas
    const needsHours = requiresQuantity.requiresHours && (!formData.horas || formData.horas <= 0);
    const needsDays = requiresQuantity.requiresDays && (!formData.dias || formData.dias <= 0);
    
    // No calcular si falta información necesaria
    if (needsHours || needsDays) {
      return null;
    }
    
    // Solo calcular si tenemos datos válidos para calcular
    const hasValidHours = formData.horas && formData.horas > 0;
    const hasValidDays = formData.dias && formData.dias > 0;
    
    if (!hasValidHours && !hasValidDays) {
      return null;
    }

    try {
      // Si tenemos función personalizada del modal, usarla
      if (calculateSuggestedValue) {
        return calculateSuggestedValue(
          formData.tipo_novedad,
          formData.subtipo,
          formData.horas || undefined,
          formData.dias || undefined
        );
      }
      
      // Usar directamente el sistema de cálculo mejorado
      const resultado = calcularValorNovedadEnhanced(
        formData.tipo_novedad,
        formData.subtipo,
        employeeSalary,
        formData.dias || undefined,
        formData.horas || undefined,
        currentPeriodDate
      );
      
      console.log(`💰 Enhanced calculation for ${formData.tipo_novedad}:`, resultado.valor);
      
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
    requiresQuantity.requiresHours,
    requiresQuantity.requiresDays,
    currentPeriodDate,
    calculateSuggestedValue
  ]);

  // Memoizar isFormValid para evitar re-renders
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0 && formData.valor > 0;
  }, [validationErrors, formData.valor]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category Selection */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant={selectedCategory === 'devengados' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('devengados')}
          className="flex-1"
          disabled={modalType !== undefined}
        >
          Devengados
        </Button>
        <Button
          type="button"
          variant={selectedCategory === 'deducciones' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('deducciones')}
          className="flex-1"
          disabled={modalType !== undefined}
        >
          Deducciones
        </Button>
      </div>

      {/* Novedad Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="tipo_novedad">Tipo de Novedad</Label>
        <Select
          value={formData.tipo_novedad}
          onValueChange={(value) => handleInputChange('tipo_novedad', value as NovedadType)}
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

      {/* Subtipo especial para horas extra */}
      {formData.tipo_novedad === 'horas_extra' && (
        <div className="space-y-2">
          <Label htmlFor="subtipo">Tipo de Horas Extra</Label>
          <Select
            value={formData.subtipo || ''}
            onValueChange={(value) => handleInputChange('subtipo', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de horas extra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Diurnas (25%)</SelectItem>
              <SelectItem value="nocturnas">Nocturnas (75%)</SelectItem>
              <SelectItem value="dominicales_diurnas">Dominicales Diurnas (100%)</SelectItem>
              <SelectItem value="dominicales_nocturnas">Dominicales Nocturnas (150%)</SelectItem>
              <SelectItem value="festivas_diurnas">Festivas Diurnas (100%)</SelectItem>
              <SelectItem value="festivas_nocturnas">Festivas Nocturnas (150%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dynamic Fields based on novedad type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Fields */}
        <div className="space-y-2">
          <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
          <Input
            id="fecha_inicio"
            type="date"
            value={formData.fecha_inicio || ''}
            onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_fin">Fecha Fin</Label>
          <Input
            id="fecha_fin"
            type="date"
            value={formData.fecha_fin || ''}
            onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
          />
          {validationErrors.fecha_fin && (
            <p className="text-sm text-red-600">{validationErrors.fecha_fin}</p>
          )}
        </div>

        {/* Quantity Fields */}
        <div className="space-y-2">
          <Label htmlFor="dias">Días</Label>
          <Input
            id="dias"
            type="number"
            min="0"
            value={formData.dias || ''}
            onChange={(e) => handleInputChange('dias', e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="horas">Horas</Label>
          <Input
            id="horas"
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={formData.horas || ''}
            onChange={(e) => handleInputChange('horas', e.target.value ? parseFloat(e.target.value) : null)}
          />
          {validationErrors.horas && (
            <p className="text-sm text-red-600">{validationErrors.horas}</p>
          )}
        </div>
      </div>

      {/* Value Field with Enhanced Suggested Value */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="valor">Valor</Label>
          <div className="flex items-center space-x-2">
            <JornadaLegalTooltip fecha={currentPeriodDate} showBadge={false} />
            {suggestedValue && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('valor', suggestedValue)}
                className="text-xs flex items-center space-x-1"
              >
                <Calculator className="h-3 w-3" />
                <span>Usar: ${suggestedValue.toLocaleString()}</span>
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
        />
        {validationErrors.valor && (
          <p className="text-sm text-red-600">{validationErrors.valor}</p>
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
        />
      </div>

      {/* Preview Card con información de jornada */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Vista previa</p>
              <p className="text-xs text-gray-600">
                {formData.tipo_novedad} • {formData.valor.toLocaleString()} COP
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>Cálculo con jornada legal dinámica</span>
              </div>
            </div>
            <Badge variant={selectedCategory === 'devengados' ? 'default' : 'destructive'}>
              {selectedCategory === 'devengados' ? '+' : '-'} ${formData.valor.toLocaleString()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
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
          className="min-w-[100px]"
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
