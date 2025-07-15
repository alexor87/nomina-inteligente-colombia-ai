
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
import { RecargosCalculationService } from '@/services/RecargosCalculationService';

interface NovedadRecargoFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  periodoFecha?: Date; // ✅ NUEVO: Fecha del período para jornada legal correcta
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

const RECARGO_SUBTIPOS = [
  { value: 'nocturno', label: 'Nocturno (35%)', description: '10:00 PM - 6:00 AM' },
  { value: 'dominical', label: 'Dominical (80%)', description: 'Trabajo en domingo' },
  { value: 'nocturno_dominical', label: 'Nocturno Dominical (115%)', description: 'Domingo 10:00 PM - 6:00 AM' },
  { value: 'festivo', label: 'Festivo (75%)', description: 'Trabajo en día festivo' },
  { value: 'nocturno_festivo', label: 'Nocturno Festivo (110%)', description: 'Festivo 10:00 PM - 6:00 AM' }
];

export const NovedadRecargoForm: React.FC<NovedadRecargoFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  periodoFecha
}) => {
  const [formData, setFormData] = useState({
    subtipo: 'nocturno',
    horas: '',
    valor: 0,
    observacion: ''
  });

  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [jornadaInfo, setJornadaInfo] = useState<any>(null);

  // ✅ CORRECCIÓN: Usar fecha del período para jornada legal correcta
  const calculateRecargoValue = (subtipo: string, horas: number) => {
    if (!employeeSalary || employeeSalary <= 0 || !horas || horas <= 0) {
      return null;
    }

    try {
      console.log('💰 Calculando recargo con fecha del período:', periodoFecha?.toISOString().split('T')[0]);
      
      const result = RecargosCalculationService.calcularRecargo({
        salarioBase: employeeSalary,
        tipoRecargo: subtipo as any,
        horas: horas,
        fechaPeriodo: periodoFecha || new Date() // ✅ Usar fecha del período
      });
      
      console.log('💰 Recargo calculado:', result);
      setJornadaInfo(result.jornadaInfo);
      return result.valorRecargo;
    } catch (error) {
      console.error('❌ Error calculando recargo:', error);
      return null;
    }
  };

  // Calcular valor automáticamente cuando cambien horas o subtipo
  useEffect(() => {
    if (formData.horas && parseFloat(formData.horas) > 0) {
      console.log('🔄 Calculating value for recargo:', {
        subtipo: formData.subtipo,
        horas: parseFloat(formData.horas)
      });
      
      const calculated = calculateRecargoValue(formData.subtipo, parseFloat(formData.horas));
      setCalculatedValue(calculated);
    } else {
      setCalculatedValue(null);
    }
  }, [formData.subtipo, formData.horas, employeeSalary]);

  // Aplicar valor calculado automáticamente
  useEffect(() => {
    if (calculatedValue && calculatedValue > 0) {
      console.log('💰 Applying calculated value for recargo:', calculatedValue);
      setFormData(prev => ({ ...prev, valor: calculatedValue }));
    }
  }, [calculatedValue]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.horas || parseFloat(formData.horas) <= 0) {
      alert('Por favor ingrese las horas de recargo');
      return;
    }

    if (formData.valor <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    const submitData = {
      tipo_novedad: 'recargo_nocturno',
      subtipo: formData.subtipo,
      horas: parseFloat(formData.horas),
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('📤 Submitting recargo:', submitData);
    onSubmit(submitData);
  };

  const getSubtipoInfo = (subtipo: string) => {
    return RECARGO_SUBTIPOS.find(s => s.value === subtipo);
  };

  const currentSubtipoInfo = getSubtipoInfo(formData.subtipo);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Recargo</h3>
      </div>

      {/* ✅ NUEVO: Información de jornada legal usada */}
      {jornadaInfo && (
        <div className="flex items-center gap-2 bg-blue-50 p-3 rounded text-sm text-blue-700">
          <Info className="h-4 w-4" />
          <span>
            Jornada legal: {jornadaInfo.horasSemanales}h semanales = {jornadaInfo.divisorHorario}h mensuales
            {periodoFecha && ` (vigente desde ${periodoFecha.toLocaleDateString()})`}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Recargo</Label>
          <Select
            value={formData.subtipo}
            onValueChange={(value) => handleInputChange('subtipo', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECARGO_SUBTIPOS.map((subtipo) => (
                <SelectItem key={subtipo.value} value={subtipo.value}>
                  <div>
                    <div className="font-medium">{subtipo.label}</div>
                    <div className="text-xs text-gray-500">{subtipo.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {currentSubtipoInfo && (
            <div className="text-sm text-blue-600">
              <strong>Horario:</strong> {currentSubtipoInfo.description}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Cantidad de Horas *</Label>
          <Input
            type="number"
            min="0"
            max="8"
            step="0.5"
            value={formData.horas}
            onChange={(e) => handleInputChange('horas', e.target.value)}
            placeholder="0"
          />
          <div className="text-xs text-gray-500">
            Máximo 8 horas por jornada
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
            placeholder="Turno, horario específico, etc..."
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
              {formData.horas} horas de recargo {formData.subtipo}
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
          disabled={!formData.horas || formData.valor <= 0}
        >
          Guardar Recargo
        </Button>
      </div>
    </div>
  );
};
