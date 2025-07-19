
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MinusCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';

interface NovedadDeduccionEspecialFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
}

const tiposDeduccion = [
  { 
    value: 'multa', 
    label: 'Multa Disciplinaria', 
    description: 'Multa por incumplimiento disciplinario',
    maxPercent: 20
  },
  { 
    value: 'descuento_nomina', 
    label: 'Descuento de Nómina', 
    description: 'Descuento autorizado por el empleado',
    maxPercent: 30
  },
  { 
    value: 'otros', 
    label: 'Otras Deducciones', 
    description: 'Otras deducciones especiales',
    maxPercent: 25
  }
];

export const NovedadDeduccionEspecialForm: React.FC<NovedadDeduccionEspecialFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const [tipoDeduccion, setTipoDeduccion] = useState<string>('');
  const [valorDeduccion, setValorDeduccion] = useState<string>('');
  const [observacion, setObservacion] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<any>(null);

  const { calculateNovedad, isLoading } = useNovedadBackendCalculation();

  // ✅ Calcular con backend cuando cambian los valores
  useEffect(() => {
    if (tipoDeduccion && valorDeduccion && parseFloat(valorDeduccion) > 0) {
      calculateNovedad({
        tipoNovedad: 'deduccion_especial',
        subtipo: tipoDeduccion,
        salarioBase: employeeSalary,
        valorManual: parseFloat(valorDeduccion),
        fechaPeriodo: new Date().toISOString()
      }).then((result) => {
        if (result) {
          setCalculationResult(result);
        }
      });
    }
  }, [tipoDeduccion, valorDeduccion, employeeSalary, calculateNovedad]);

  const handleSubmit = () => {
    if (!tipoDeduccion || !valorDeduccion || parseFloat(valorDeduccion) <= 0) return;

    onSubmit({
      tipo_novedad: 'deduccion_especial',
      subtipo: tipoDeduccion,
      valor: parseFloat(valorDeduccion),
      observacion: observacion || calculationResult?.detalleCalculo
    });
  };

  const selectedType = tiposDeduccion.find(t => t.value === tipoDeduccion);
  const isValid = tipoDeduccion && valorDeduccion && parseFloat(valorDeduccion) > 0;
  
  const valorDeduccionNumerico = parseFloat(valorDeduccion) || 0;
  const porcentajeSalario = employeeSalary > 0 ? (valorDeduccionNumerico / employeeSalario) * 100 : 0;
  const excedeLimite = selectedType && porcentajeSalario > selectedType.maxPercent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Deducciones Especiales</h3>
      </div>

      {/* Main Content */}
      <div className="bg-orange-50 p-4 rounded-lg space-y-4">
        <h4 className="text-orange-800 font-medium">Información de la Deducción</h4>
        
        <div className="p-3 bg-white rounded border border-orange-200">
          <div className="flex items-center gap-2 text-orange-700 mb-2">
            <Info className="h-4 w-4" />
            <span className="font-medium">Información del Empleado</span>
          </div>
          <div className="text-sm text-orange-600 space-y-1">
            <p>Salario mensual: {formatCurrency(employeeSalary)}</p>
            <p className="text-xs text-orange-500">
              Las deducciones requieren autorización legal o del empleado
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Deducción</Label>
            <Select value={tipoDeduccion} onValueChange={setTipoDeduccion}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposDeduccion.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div>
                      <div className="font-medium">{tipo.label}</div>
                      <div className="text-xs text-gray-500">
                        {tipo.description} - Máx: {tipo.maxPercent}%
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType && (
            <div className="p-3 bg-white rounded border border-orange-200">
              <div className="flex items-center gap-2 text-orange-700 mb-1">
                <Info className="h-4 w-4" />
                <span className="font-medium">Límites Recomendados</span>
              </div>
              <p className="text-sm text-orange-600">
                {selectedType.description} - Máximo recomendado: {formatCurrency(employeeSalary * (selectedType.maxPercent / 100))} ({selectedType.maxPercent}%)
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="valorDeduccion" className="text-gray-700">Valor de la Deducción</Label>
            <div className="relative">
              <MinusCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="valorDeduccion"
                type="number"
                placeholder="0"
                value={valorDeduccion}
                onChange={(e) => setValorDeduccion(e.target.value)}
                min="0"
                step="1000"
                className="pl-10"
              />
            </div>
            {valorDeduccion && parseFloat(valorDeduccion) > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    -{formatCurrency(parseFloat(valorDeduccion))}
                  </Badge>
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                <p className="text-sm text-gray-600">
                  Porcentaje del salario: {porcentajeSalario.toFixed(1)}%
                </p>
                {calculationResult && (
                  <p className="text-xs text-gray-500">
                    {calculationResult.detalleCalculo}
                  </p>
                )}
              </div>
            )}
          </div>

          {excedeLimite && (
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Advertencia</span>
              </div>
              <p className="text-sm text-red-600">
                Esta deducción excede el límite recomendado del {selectedType?.maxPercent}% del salario. 
                Verifique la normativa aplicable.
              </p>
            </div>
          )}

          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="font-medium">Normativa</span>
            </div>
            <p className="text-sm text-yellow-700">
              Las deducciones especiales deben cumplir con el Código Sustantivo del Trabajo. 
              Requieren autorización expresa y justificación legal.
            </p>
          </div>

          <div>
            <Label htmlFor="observacion" className="text-gray-700">Observaciones</Label>
            <Textarea
              id="observacion"
              placeholder="Justificación legal, autorización, resolución número, etc..."
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
          className="bg-orange-600 hover:bg-orange-700 min-w-[120px]"
        >
          {isLoading ? 'Procesando...' : 'Guardar Deducción'}
        </Button>
      </div>
    </div>
  );
};
