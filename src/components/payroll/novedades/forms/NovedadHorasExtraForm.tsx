
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Calculator } from 'lucide-react';
import { CreateNovedadData } from '@/types/novedades-enhanced';

interface NovedadHorasExtraFormProps {
  onBack: () => void;
  onSubmit: (data: CreateNovedadData) => Promise<void>;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number, dias?: number) => number | null;
}

const horasExtraOptions = [
  { value: 'diurnas', label: 'Diurnas (25%)', factor: 1.25 },
  { value: 'nocturnas', label: 'Nocturnas (75%)', factor: 1.75 },
  { value: 'dominicales_diurnas', label: 'Dominicales Diurnas (100%)', factor: 2.0 },
  { value: 'dominicales_nocturnas', label: 'Dominicales Nocturnas (150%)', factor: 2.5 },
  { value: 'festivas_diurnas', label: 'Festivas Diurnas (100%)', factor: 2.0 },
  { value: 'festivas_nocturnas', label: 'Festivas Nocturnas (150%)', factor: 2.5 }
];

export const NovedadHorasExtraForm: React.FC<NovedadHorasExtraFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [formData, setFormData] = useState<CreateNovedadData>({
    empleado_id: '', // Will be set by parent component
    periodo_id: '', // Will be set by parent component
    tipo_novedad: 'horas_extra',
    subtipo: 'diurnas',
    valor: 0,
    horas: null,
    dias: null,
    observacion: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate value when hours or type changes
  useEffect(() => {
    if (formData.horas && formData.horas > 0 && formData.subtipo) {
      let suggestedValue = null;
      
      if (calculateSuggestedValue) {
        suggestedValue = calculateSuggestedValue('horas_extra', formData.subtipo, formData.horas);
      } else {
        // Fallback calculation
        const valorHora = employeeSalary / 240;
        const option = horasExtraOptions.find(opt => opt.value === formData.subtipo);
        if (option) {
          suggestedValue = Math.round(valorHora * option.factor * formData.horas);
        }
      }
      
      if (suggestedValue && suggestedValue > 0) {
        setFormData(prev => ({ ...prev, valor: suggestedValue }));
      }
    }
  }, [formData.horas, formData.subtipo, employeeSalary, calculateSuggestedValue]);

  const handleInputChange = (field: keyof CreateNovedadData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting novedad:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.tipo_novedad &&
      formData.subtipo &&
      formData.horas !== null && 
      formData.horas > 0 &&
      formData.valor > 0
    );
  };

  const applySuggestedValue = () => {
    if (formData.horas && formData.horas > 0 && formData.subtipo) {
      let suggestedValue = null;
      
      if (calculateSuggestedValue) {
        suggestedValue = calculateSuggestedValue('horas_extra', formData.subtipo, formData.horas);
      } else {
        // Fallback calculation
        const valorHora = employeeSalary / 240;
        const option = horasExtraOptions.find(opt => opt.value === formData.subtipo);
        if (option) {
          suggestedValue = Math.round(valorHora * option.factor * formData.horas);
        }
      }
      
      if (suggestedValue && suggestedValue > 0) {
        setFormData(prev => ({ ...prev, valor: suggestedValue }));
      }
    }
  };

  const getSuggestedValue = () => {
    if (!formData.horas || formData.horas <= 0 || !formData.subtipo) return null;
    
    if (calculateSuggestedValue) {
      return calculateSuggestedValue('horas_extra', formData.subtipo, formData.horas);
    }
    
    // Fallback calculation
    const valorHora = employeeSalary / 240;
    const option = horasExtraOptions.find(opt => opt.value === formData.subtipo);
    if (option) {
      return Math.round(valorHora * option.factor * formData.horas);
    }
    
    return null;
  };

  const suggestedValue = getSuggestedValue();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Horas Extra</h3>
          <p className="text-sm text-gray-500">
            Registro de horas adicionales trabajadas
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Horas Extra *</Label>
          <Select
            value={formData.subtipo || 'diurnas'}
            onValueChange={(value) => handleInputChange('subtipo', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {horasExtraOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Cantidad de Horas *</Label>
          <Input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={formData.horas || ''}
            onChange={(e) => handleInputChange('horas', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Ej: 2.5"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Valor *</Label>
            {suggestedValue && suggestedValue !== formData.valor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applySuggestedValue}
                className="text-xs h-7 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Calculator className="h-3 w-3 mr-1" />
                ${suggestedValue.toLocaleString()}
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

        <div className="space-y-2">
          <Label>Observaciones</Label>
          <Textarea
            value={formData.observacion || ''}
            onChange={(e) => handleInputChange('observacion', e.target.value)}
            placeholder="Detalles adicionales sobre las horas extra..."
            rows={3}
            className="resize-none"
          />
        </div>

        {formData.valor > 0 && (
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <Badge variant="default" className="text-sm px-3 py-1 bg-green-600">
              + ${formData.valor.toLocaleString()}
            </Badge>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>
            Atrás
          </Button>
          <Button 
            type="submit" 
            disabled={!isFormValid() || isSubmitting}
            className="min-w-[120px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Guardando...' : 'Agregar Novedad'}
          </Button>
        </div>
      </form>
    </div>
  );
};
