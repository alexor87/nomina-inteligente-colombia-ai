
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';

interface NovedadVacacionesConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  isSubmitting?: boolean;
}

export const NovedadVacacionesConsolidatedForm: React.FC<NovedadVacacionesConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState({
    dias: '',
    fecha_inicio: '',
    fecha_fin: '',
    valor: 0,
    observacion: ''
  });

  const { calculateNovedad, isLoading: isCalculating } = useNovedadBackendCalculation();

  // Calcular valor automáticamente cuando cambien los días
  useEffect(() => {
    const calculateVacationValue = async () => {
      if (formData.dias && parseInt(formData.dias) > 0) {
        console.log('🔄 Calculating vacation value via backend');
        
        try {
          const result = await calculateNovedad({
            tipoNovedad: 'vacaciones',
            salarioBase: employeeSalary,
            dias: parseInt(formData.dias)
          });

          if (result) {
            console.log('💰 Applying calculated vacation value:', result.valor);
            setFormData(prev => ({ ...prev, valor: result.valor }));
          }
        } catch (error) {
          console.error('❌ Error calculating vacation value:', error);
        }
      } else {
        setFormData(prev => ({ ...prev, valor: 0 }));
      }
    };

    calculateVacationValue();
  }, [formData.dias, employeeSalary, calculateNovedad]);

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

    console.log('📤 Submitting vacation data:', submitData);
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

        {/* Valor calculado automáticamente */}
        {(formData.valor > 0 || isCalculating) && (
          <div className="flex items-center justify-between bg-green-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                {isCalculating ? 'Calculando valor...' : 'Valor calculado automáticamente:'}
              </span>
            </div>
            {!isCalculating && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {formatCurrency(formData.valor)}
              </Badge>
            )}
          </div>
        )}

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
        {formData.valor > 0 && !isCalculating && (
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
          disabled={!formData.dias || !formData.fecha_inicio || !formData.fecha_fin || formData.valor <= 0 || isCalculating || isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Vacaciones'}
        </Button>
      </div>
    </div>
  );
};
