
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Receipt, Calculator, Info, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';

interface NovedadRetefuenteFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
}

const tiposRetencion = [
  { value: 'automatica', label: 'Cálculo Automático', description: 'Basado en tabla de retención vigente 2025' },
  { value: 'manual', label: 'Valor Manual', description: 'Ingreso manual del valor a retener' },
  { value: 'ajuste', label: 'Ajuste', description: 'Ajuste a retención calculada automáticamente' }
];

export const NovedadRetefuenteForm: React.FC<NovedadRetefuenteFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const [tipoCalculo, setTipoCalculo] = useState<string>('');
  const [valorManual, setValorManual] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');
  const [calculationDetails, setCalculationDetails] = useState<string>('');

  const { calculateNovedad, isLoading } = useNovedadBackendCalculation();

  // ✅ Calcular automáticamente cuando se selecciona tipo automático
  useEffect(() => {
    if (tipoCalculo === 'automatica') {
      calculateNovedad({
        tipoNovedad: 'retencion_fuente',
        salarioBase: employeeSalary,
        fechaPeriodo: new Date().toISOString()
      }).then((result) => {
        if (result) {
          setValorCalculado(result.valor);
          setCalculationDetails(result.detalleCalculo);
          setObservacion(`Cálculo automático 2025: ${result.detalleCalculo}`);
        }
      });
    } else if (tipoCalculo === 'manual' && valorManual) {
      const valorNumerico = parseFloat(valorManual);
      if (!isNaN(valorNumerico) && valorNumerico > 0) {
        calculateNovedad({
          tipoNovedad: 'retencion_fuente',
          salarioBase: employeeSalary,
          valorManual: valorNumerico,
          fechaPeriodo: new Date().toISOString()
        }).then((result) => {
          if (result) {
            setValorCalculado(result.valor);
            setCalculationDetails(result.detalleCalculo);
          }
        });
      }
    }
  }, [tipoCalculo, valorManual, employeeSalary, calculateNovedad]);

  const handleSubmit = () => {
    if (!tipoCalculo || valorCalculado <= 0) return;

    onSubmit({
      tipo_novedad: 'retencion_fuente',
      valor: valorCalculado,
      observacion: observacion || calculationDetails
    });
  };

  const isValid = tipoCalculo && valorCalculado > 0;
  const porcentajeSalario = employeeSalary > 0 ? (valorCalculado / employeeSalary) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Retención en la Fuente</h3>
      </div>

      {/* Main Content */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Información de la Retención</h4>
        
        <div className="p-3 bg-white rounded border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Info className="h-4 w-4" />
            <span className="font-medium">Información del Empleado</span>
          </div>
          <div className="text-sm text-blue-600 space-y-1">
            <p>Salario mensual: {formatCurrency(employeeSalary)}</p>
            <p>Salario anual: {formatCurrency(employeeSalary * 12)}</p>
            <p className="text-xs text-blue-500">UVT 2025: $47.065 - Tabla actualizada según DIAN</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Cálculo</Label>
            <Select value={tipoCalculo} onValueChange={setTipoCalculo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de cálculo" />
              </SelectTrigger>
              <SelectContent>
                {tiposRetencion.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div>
                      <div className="font-medium">{tipo.label}</div>
                      <div className="text-xs text-gray-500">{tipo.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipoCalculo === 'manual' && (
            <div>
              <Label htmlFor="valorManual" className="text-gray-700">Valor a Retener</Label>
              <div className="relative">
                <Receipt className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="valorManual"
                  type="number"
                  placeholder="0"
                  value={valorManual}
                  onChange={(e) => setValorManual(e.target.value)}
                  min="0"
                  step="1000"
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {(isLoading || valorCalculado > 0) && (
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {isLoading ? 'Calculando...' : 'Retención Calculada'}
                </span>
              </div>
              
              {!isLoading && (
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    -{formatCurrency(valorCalculado)}
                  </Badge>
                  <p className="text-sm text-green-600">
                    Porcentaje del salario: {porcentajeSalario.toFixed(2)}%
                  </p>
                  {calculationDetails && (
                    <p className="text-xs text-green-500 mt-1">
                      {calculationDetails}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="font-medium">Actualización 2025</span>
            </div>
            <p className="text-sm text-yellow-700">
              Los valores se calculan automáticamente con la tabla de retención DIAN 2025. 
              UVT actualizado: $47.065. Consulta con el área contable para casos especiales.
            </p>
          </div>

          <div>
            <Label htmlFor="observacion" className="text-gray-700">Observaciones</Label>
            <Textarea
              id="observacion"
              placeholder="Detalles adicionales sobre la retención..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {isLoading ? 'Calculando...' : 'Guardar Retención'}
        </Button>
      </div>
    </div>
  );
};
