
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadCalculation } from '@/hooks/useNovedadCalculation';
import { NovedadType } from '@/types/novedades-enhanced';

interface NovedadVacacionesFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

export const NovedadVacacionesForm: React.FC<NovedadVacacionesFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [formData, setFormData] = useState({
    dias: '',
    fecha_inicio: '',
    fecha_fin: '',
    valor: 0,
    observacion: ''
  });

  const { calculatedValue, calculateValue } = useNovedadCalculation({
    employeeSalary,
    calculateSuggestedValue
  });

  // Calcular valor automáticamente cuando cambien los días
  useEffect(() => {
    if (formData.dias && parseInt(formData.dias) > 0) {
      console.log('🔄 Calculating value for vacaciones:', {
        dias: parseInt(formData.dias)
      });
      
      calculateValue(
        'vacaciones' as NovedadType,
        undefined,
        undefined,
        parseInt(formData.dias)
      );
    } else {
      calculateValue('vacaciones' as NovedadType, undefined, undefined, 0);
    }
  }, [formData.dias, calculateValue]);

  // Aplicar valor calculado automáticamente
  useEffect(() => {
    if (calculatedValue && calculatedValue > 0) {
      console.log('💰 Applying calculated value for vacaciones:', calculatedValue);
      setFormData(prev => ({ ...prev, valor: calculatedValue }));
    }
  }, [calculatedValue]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.dias || parseInt(formData.dias) <= 0) {
      alert('Por favor ingrese los días de vacaciones');
      return;
    }

    if (!formData.fecha_inicio) {
      alert('Por favor seleccione la fecha de inicio');
      return;
    }

    if (!formData.fecha_fin) {
      alert('Por favor seleccione la fecha de fin');
      return;
    }

    if (formData.valor <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    const submitData = {
      tipo_novedad: 'vacaciones',
      dias: parseInt(formData.dias),
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('📤 Submitting vacaciones:', submitData);
    onSubmit(submitData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Vacaciones</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha Inicio *</Label>
            <Input
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha Fin *</Label>
            <Input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Días de Vacaciones *</Label>
          <Input
            type="number"
            min="1"
            max="15"
            value={formData.dias}
            onChange={(e) => handleInputChange('dias', e.target.value)}
            placeholder="0"
          />
          <div className="text-xs text-gray-500">
            Máximo 15 días hábiles por período
          </div>
        </div>

        {/* Valor calculado */}
        {calculatedValue && calculatedValue > 0 && (
          <div className="flex items-center justify-between bg-green-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">Valor calculado automáticamente:</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {formatCurrency(calculatedValue)}
            </Badge>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Valor *</Label>
            {calculatedValue && calculatedValue !== formData.valor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('valor', calculatedValue)}
                className="text-xs h-7 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Calculator className="h-3 w-3 mr-1" />
                Usar calculado: ${calculatedValue.toLocaleString()}
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
            value={formData.observacion}
            onChange={(e) => handleInputChange('observacion', e.target.value)}
            placeholder="Período de vacaciones, resolución, etc..."
            rows={3}
          />
        </div>

        {/* Preview */}
        {formData.valor > 0 && (
          <div className="p-3 bg-gray-50 rounded text-center">
            <Badge variant="default" className="text-sm px-3 py-1">
              +{formatCurrency(formData.valor)}
            </Badge>
            <div className="text-xs text-gray-500 mt-1">
              {formData.dias} días de vacaciones
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.dias || !formData.fecha_inicio || !formData.fecha_fin || formData.valor <= 0}
        >
          Guardar Vacaciones
        </Button>
      </div>
    </div>
  );
};
