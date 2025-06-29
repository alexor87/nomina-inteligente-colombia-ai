
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Receipt, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadRetefuenteFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
}

const retencionRanges = [
  { min: 0, max: 1340000, rate: 0, description: 'Sin retención' },
  { min: 1340001, max: 1770000, rate: 19, base: 1340000, description: '19% sobre exceso de $1,340,000' },
  { min: 1770001, max: 4113000, rate: 28, base: 1770000, description: '28% sobre exceso de $1,770,000' },
  { min: 4113001, max: 8548000, rate: 33, base: 4113000, description: '33% sobre exceso de $4,113,000' },
  { min: 8548001, max: Infinity, rate: 39, base: 8548000, description: '39% sobre exceso de $8,548,000' }
];

const tiposRetencion = [
  { value: 'automatica', label: 'Cálculo Automático', description: 'Basado en tabla de retención vigente' },
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

  const calcularRetencion = (salarioMensual: number): { valor: number; detalle: string } => {
    const salarioAnual = salarioMensual * 12;
    
    const rango = retencionRanges.find(r => salarioAnual >= r.min && salarioAnual <= r.max);
    
    if (!rango || rango.rate === 0) {
      return { valor: 0, detalle: 'Salario no sujeto a retención en la fuente' };
    }

    const baseGravable = salarioAnual - rango.base;
    const retencionAnual = baseGravable * (rango.rate / 100);
    const retencionMensual = Math.round(retencionAnual / 12);

    return {
      valor: retencionMensual,
      detalle: `${rango.description}. Base gravable anual: ${formatCurrency(baseGravable)}. Retención mensual: ${formatCurrency(retencionMensual)}`
    };
  };

  useEffect(() => {
    if (tipoCalculo === 'automatica') {
      const calculo = calcularRetencion(employeeSalary);
      setValorCalculado(calculo.valor);
      setObservacion(calculo.detalle);
    } else if (tipoCalculo === 'manual' && valorManual) {
      setValorCalculado(parseFloat(valorManual));
    }
  }, [tipoCalculo, valorManual, employeeSalary]);

  const handleSubmit = () => {
    if (!tipoCalculo || valorCalculado <= 0) return;

    onSubmit({
      tipo_novedad: 'retencion_fuente',
      valor: valorCalculado,
      observacion: `${observacion} (${tipoCalculo})`.trim()
    });
  };

  const isValid = tipoCalculo && valorCalculado > 0;
  const rangoActual = retencionRanges.find(r => 
    employeeSalary * 12 >= r.min && employeeSalary * 12 <= r.max
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Retención en la Fuente</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Info className="h-4 w-4" />
            <span className="font-medium">Información del Empleado</span>
          </div>
          <div className="text-sm text-blue-600 space-y-1">
            <p>Salario mensual: {formatCurrency(employeeSalary)}</p>
            <p>Salario anual: {formatCurrency(employeeSalary * 12)}</p>
            {rangoActual && (
              <p>Rango de retención: {rangoActual.description}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="tipo">Tipo de Cálculo</Label>
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
            <Label htmlFor="valorManual">Valor a Retener</Label>
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

        {valorCalculado > 0 && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Retención Calculada</span>
            </div>
            <div className="text-sm text-green-600 space-y-1">
              <p>Valor mensual: {formatCurrency(valorCalculado)}</p>
              <p>Porcentaje del salario: {((valorCalculado / employeeSalary) * 100).toFixed(2)}%</p>
            </div>
          </div>
        )}

        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-700">
            <strong>Nota:</strong> Los valores se basan en la tabla de retención vigente para 2025. 
            Consulta con el área contable para casos especiales.
          </p>
        </div>

        <div>
          <Label htmlFor="observacion">Observaciones</Label>
          <Textarea
            id="observacion"
            placeholder="Detalles adicionales sobre la retención..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid}
          className="min-w-[120px]"
        >
          Agregar Novedad
        </Button>
      </div>
    </div>
  );
};
