
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NovedadFormData, NOVEDAD_CATEGORIES, NovedadType } from '@/types/novedades';
import { Calculator, Loader2 } from 'lucide-react';

interface NovedadFormProps {
  onSubmit: (data: NovedadFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<NovedadFormData>;
  isLoading?: boolean;
  employeeSalary?: number;
}

export const NovedadForm = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  employeeSalary = 1300000
}: NovedadFormProps) => {
  const [formData, setFormData] = useState<NovedadFormData>({
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<'devengados' | 'deducciones'>('devengados');

  useEffect(() => {
    if (initialData?.tipo_novedad) {
      // Determine category based on initial data
      const isInDevengados = Object.keys(NOVEDAD_CATEGORIES.devengados.types).includes(initialData.tipo_novedad);
      setSelectedCategory(isInDevengados ? 'devengados' : 'deducciones');
    }
  }, [initialData]);

  const validateForm = (): boolean => {
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

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
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

  const handleInputChange = (field: keyof NovedadFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const calculateSuggestedValue = () => {
    if (formData.tipo_novedad === 'horas_extra' && formData.horas) {
      const hourlyRate = employeeSalary / (30 * 8); // Assuming 30 days, 8 hours per day
      const extraRate = hourlyRate * 1.25; // 25% extra for overtime
      return Math.round(extraRate * formData.horas);
    }
    return null;
  };

  const suggestedValue = calculateSuggestedValue();
  const isFormValid = validateForm() && formData.valor > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category Selection */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant={selectedCategory === 'devengados' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('devengados')}
          className="flex-1"
        >
          Devengados
        </Button>
        <Button
          type="button"
          variant={selectedCategory === 'deducciones' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('deducciones')}
          className="flex-1"
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
            {Object.entries(NOVEDAD_CATEGORIES[selectedCategory].types).map(([key, config]) => (
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

      {/* Value Field with Suggested Value */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="valor">Valor</Label>
          {suggestedValue && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleInputChange('valor', suggestedValue)}
              className="text-xs"
            >
              <Calculator className="h-3 w-3 mr-1" />
              Usar sugerido: ${suggestedValue.toLocaleString()}
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
        />
        {validationErrors.valor && (
          <p className="text-sm text-red-600">{validationErrors.valor}</p>
        )}
      </div>

      {/* Subtipo Field */}
      <div className="space-y-2">
        <Label htmlFor="subtipo">Subtipo (Opcional)</Label>
        <Input
          id="subtipo"
          value={formData.subtipo || ''}
          onChange={(e) => handleInputChange('subtipo', e.target.value)}
          placeholder="Especifica un subtipo si es necesario"
        />
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

      {/* Preview Card */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Vista previa</p>
              <p className="text-xs text-gray-600">
                {formData.tipo_novedad} • {formData.valor.toLocaleString()} COP
              </p>
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
