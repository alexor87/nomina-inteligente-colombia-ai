
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Calculator, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';

interface NovedadRecargoFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  employeeSalary: number;
  isSubmitting?: boolean;
  periodoFecha?: Date;
}

const tiposRecargo = [
  { value: 'nocturno', label: 'Recargo Nocturno (35%)', factor: 0.35 },
  { value: 'dominical', label: 'Recargo Dominical (75%)', factor: 0.75 },
  { value: 'nocturno_dominical', label: 'Nocturno Dominical (115%)', factor: 1.15 }
];

export const NovedadRecargoForm: React.FC<NovedadRecargoFormProps> = ({
  onSubmit,
  onCancel,
  employeeSalary,
  isSubmitting = false,
  periodoFecha
}) => {
  const [formData, setFormData] = useState({
    subtipo: '',
    horas: '',
    observacion: '',
    constitutivo_salario: true // ✅ CORREGIDO: Default TRUE para recargos
  });

  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const { calculateNovedad, isLoading: isCalculating } = useNovedadBackendCalculation();

  const calculateValue = async () => {
    if (!formData.subtipo || !formData.horas || parseFloat(formData.horas) <= 0) {
      setCalculatedValue(null);
      return;
    }

    try {
      const result = await calculateNovedad({
        tipoNovedad: 'recargo_nocturno',
        subtipo: formData.subtipo,
        salarioBase: employeeSalary,
        horas: parseFloat(formData.horas),
        fechaPeriodo: (periodoFecha || new Date()).toISOString()
      });

      if (result) {
        setCalculatedValue(result.valor);
      }
    } catch (error) {
      console.error('Error calculating surcharge:', error);
      setCalculatedValue(null);
    }
  };

  useEffect(() => {
    calculateValue();
  }, [formData.subtipo, formData.horas, employeeSalary]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subtipo || !formData.horas || calculatedValue === null) {
      return;
    }

    onSubmit({
      tipo_novedad: 'recargo_nocturno',
      subtipo: formData.subtipo,
      horas: parseFloat(formData.horas),
      valor: calculatedValue,
      observacion: formData.observacion,
      constitutivo_salario: formData.constitutivo_salario // ✅ Incluir constitutividad
    });
  };

  const getTipoInfo = (subtipo: string) => {
    return tiposRecargo.find(t => t.value === subtipo);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Recargo Nocturno</h3>

        {/* ✅ NUEVO: Información normativa sobre constitutividad */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Normativa IBC:</strong> Los recargos nocturnos son constitutivos de IBC según Art. 127 CST. 
            Afectan el cálculo de aportes a salud y pensión.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Recargo *</Label>
            <Select 
              value={formData.subtipo} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, subtipo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposRecargo.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Horas *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.horas}
                onChange={(e) => setFormData(prev => ({ ...prev, horas: e.target.value }))}
                className="pl-10"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* ✅ NUEVO: Control de constitutividad con información legal */}
        <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="constitutivo-switch" className="font-medium text-green-800">
                Constitutiva de IBC
              </Label>
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                Recomendado: SÍ
              </Badge>
            </div>
            <Switch
              id="constitutivo-switch"
              checked={formData.constitutivo_salario}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, constitutivo_salario: checked }))}
            />
          </div>
          <p className="text-sm text-green-700">
            {formData.constitutivo_salario ? 
              '✅ Esta novedad SÍ afectará el IBC y los aportes a salud/pensión' : 
              '⚠️ Esta novedad NO afectará el IBC (no recomendado para recargos)'
            }
          </p>
        </div>

        {/* Valor calculado */}
        {calculatedValue !== null && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <Label className="font-medium text-blue-800">Valor Calculado</Label>
              {isCalculating && (
                <Badge variant="outline" className="text-xs">Calculando...</Badge>
              )}
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(calculatedValue)}
            </div>
            {formData.subtipo && (
              <div className="text-sm text-blue-700 mt-1">
                Factor: {getTipoInfo(formData.subtipo)?.factor}x | {formData.horas} horas
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Observaciones</Label>
          <Input
            value={formData.observacion}
            onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
            placeholder="Descripción opcional"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={!formData.subtipo || !formData.horas || calculatedValue === null || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
};
