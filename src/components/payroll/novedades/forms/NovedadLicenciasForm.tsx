
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { NovedadType } from '@/types/novedades-enhanced';

interface NovedadLicenciasFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => Promise<number | null>;
  isSubmitting?: boolean;
}

// ✅ KISS: Tipos de licencia disponibles
const LICENCIA_SUBTIPOS = [
  { value: 'maternidad', label: 'Licencia de Maternidad', dias: 126 },
  { value: 'paternidad', label: 'Licencia de Paternidad', dias: 8 },
  { value: 'luto', label: 'Licencia por Luto', dias: 5 },
  { value: 'calamidad', label: 'Licencia por Calamidad', dias: 3 },
  { value: 'estudio', label: 'Licencia de Estudio', dias: 0 },
  { value: 'compensatorio', label: 'Licencia Compensatoria', dias: 0 }
];

export const NovedadLicenciasForm: React.FC<NovedadLicenciasFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue,
  isSubmitting = false
}) => {
  // ✅ KISS: Estado simple del formulario
  const [formData, setFormData] = useState({
    subtipo: '',
    dias: '',
    fechaInicio: '',
    fechaFin: '',
    valor: 0,
    observacion: ''
  });

  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // ✅ KISS: Effect async para calcular valor
  useEffect(() => {
    const calculateAsync = async () => {
      if (formData.dias && parseFloat(formData.dias) > 0 && formData.subtipo && calculateSuggestedValue) {
        setIsCalculating(true);
        try {
          const diasNum = parseFloat(formData.dias);
          console.log('🧮 KISS Licencias: Calculando...', {
            tipoNovedad: 'licencia_remunerada',
            subtipo: formData.subtipo,
            dias: diasNum,
            employeeSalary
          });
          
          const calculated = await calculateSuggestedValue('licencia_remunerada', formData.subtipo, undefined, diasNum);
          console.log('📊 KISS Licencias: Valor calculado:', calculated);
          
          setCalculatedValue(calculated);
        } catch (error) {
          console.error('❌ KISS Licencias: Error en cálculo:', error);
          setCalculatedValue(null);
        } finally {
          setIsCalculating(false);
        }
      } else {
        setCalculatedValue(null);
      }
    };

    calculateAsync();
  }, [formData.subtipo, formData.dias, employeeSalary, calculateSuggestedValue]);

  // ✅ KISS: Effect para aplicar valor calculado
  useEffect(() => {
    if (calculatedValue !== null && calculatedValue > 0) {
      console.log('✅ KISS Licencias: Aplicando valor calculado:', calculatedValue);
      setFormData(prev => ({ 
        ...prev, 
        valor: calculatedValue 
      }));
    }
  }, [calculatedValue]);

  const handleInputChange = (field: string, value: any) => {
    console.log('📝 KISS Licencias: Cambiando campo:', field, 'a valor:', value);
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-completar días según el tipo de licencia
    if (field === 'subtipo') {
      const tipoLicencia = LICENCIA_SUBTIPOS.find(l => l.value === value);
      if (tipoLicencia && tipoLicencia.dias > 0) {
        setFormData(prev => ({ ...prev, dias: tipoLicencia.dias.toString() }));
      }
    }
  };

  const handleSubmit = () => {
    console.log('🚀 KISS Licencias: Enviando formulario:', formData);

    if (!formData.subtipo || !formData.dias || parseFloat(formData.dias) <= 0) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    if (!formData.fechaInicio) {
      alert('Por favor ingrese la fecha de inicio');
      return;
    }

    if (formData.valor <= 0) {
      alert('El valor debe ser mayor a 0. Valor actual: ' + formData.valor);
      return;
    }

    const submitData = {
      tipo_novedad: 'licencia_remunerada',
      subtipo: formData.subtipo,
      dias: parseFloat(formData.dias),
      fecha_inicio: formData.fechaInicio,
      fecha_fin: formData.fechaFin || formData.fechaInicio,
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('📤 KISS Licencias: Enviando datos:', submitData);
    onSubmit(submitData);
  };

  const getTipoInfo = (subtipo: string) => {
    return LICENCIA_SUBTIPOS.find(l => l.value === subtipo);
  };

  const currentTipoInfo = getTipoInfo(formData.subtipo);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Licencias Remuneradas</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Licencia *</Label>
          <Select
            value={formData.subtipo}
            onValueChange={(value) => handleInputChange('subtipo', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo de licencia" />
            </SelectTrigger>
            <SelectContent>
              {LICENCIA_SUBTIPOS.map((licencia) => (
                <SelectItem key={licencia.value} value={licencia.value}>
                  <div>
                    <div className="font-medium">{licencia.label}</div>
                    {licencia.dias > 0 && (
                      <div className="text-xs text-gray-500">{licencia.dias} días</div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {currentTipoInfo && currentTipoInfo.dias > 0 && (
            <div className="text-sm text-blue-600">
              <strong>Días legales:</strong> {currentTipoInfo.dias} días
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha de Inicio *</Label>
            <Input
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha de Fin</Label>
            <Input
              type="date"
              value={formData.fechaFin}
              onChange={(e) => handleInputChange('fechaFin', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Cantidad de Días *</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={formData.dias}
            onChange={(e) => handleInputChange('dias', e.target.value)}
            placeholder="0"
          />
        </div>

        {/* ✅ KISS: Mostrar estado de cálculo */}
        {isCalculating && (
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">Calculando valor...</span>
            </div>
          </div>
        )}

        {calculatedValue !== null && calculatedValue > 0 && !isCalculating && (
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

        {!calculateSuggestedValue && (
          <div className="flex items-center gap-2 bg-yellow-50 p-3 rounded text-sm text-yellow-700">
            <Info className="h-4 w-4" />
            <span>Función de cálculo no disponible. Configure el valor manualmente.</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Valor *</Label>
            {calculatedValue && calculatedValue !== formData.valor && calculatedValue > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('valor', calculatedValue)}
                className="text-xs h-7 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Calculator className="h-3 w-3 mr-1" />
                Usar calculado: {formatCurrency(calculatedValue)}
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
            placeholder="Detalles adicionales sobre la licencia..."
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
              {formData.dias} días de {currentTipoInfo?.label || 'licencia'}
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
          disabled={!formData.subtipo || !formData.dias || formData.valor <= 0 || isSubmitting || isCalculating}
        >
          {isSubmitting ? 'Guardando...' : isCalculating ? 'Calculando...' : 'Guardar Licencia'}
        </Button>
      </div>
    </div>
  );
};
