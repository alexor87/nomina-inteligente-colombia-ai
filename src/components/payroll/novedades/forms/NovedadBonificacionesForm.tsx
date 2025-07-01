
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, DollarSign, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadBonificacionesFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
}

const tiposBonificacion = [
  { 
    value: 'bonificacion_salarial', 
    label: 'Bonificación Salarial',
    description: 'Afecta el cálculo de prestaciones sociales',
    warning: 'Esta bonificación es parte del salario para efectos legales'
  },
  { 
    value: 'bonificacion_no_salarial', 
    label: 'Bonificación No Salarial',
    description: 'No afecta el cálculo de prestaciones sociales',
    info: 'Límite: hasta 40% del salario para mantener naturaleza no salarial'
  },
  { 
    value: 'auxilio_conectividad', 
    label: 'Auxilio de Conectividad Digital',
    description: 'Solo para empleados con salario ≤ 2 SMMLV',
    limit: 'Máximo: $162,000 mensuales'
  }
];

export const NovedadBonificacionesForm: React.FC<NovedadBonificacionesFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const [tipoBonificacion, setTipoBonificacion] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [observacion, setObservacion] = useState<string>('');

  const handleSubmit = () => {
    if (!tipoBonificacion || !valor || parseFloat(valor) <= 0) return;

    onSubmit({
      tipo_novedad: tipoBonificacion,
      valor: parseFloat(valor),
      observacion
    });
  };

  const selectedTipo = tiposBonificacion.find(t => t.value === tipoBonificacion);
  const isValid = tipoBonificacion && valor && parseFloat(valor) > 0;

  // Validaciones específicas
  const getValidationMessage = () => {
    if (!selectedTipo || !valor) return null;
    
    const valorNum = parseFloat(valor);
    
    if (selectedTipo.value === 'auxilio_conectividad' && employeeSalary > 2600000) {
      return { type: 'error', message: 'El auxilio de conectividad solo aplica para salarios ≤ 2 SMMLV' };
    }
    
    if (selectedTipo.value === 'bonificacion_no_salarial' && valorNum > employeeSalary * 0.4) {
      return { type: 'warning', message: 'La bonificación supera el 40% del salario, podría perder su naturaleza no salarial' };
    }
    
    return null;
  };

  const validationMessage = getValidationMessage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Bonificaciones y Auxilios</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de Bonificación</Label>
          <Select value={tipoBonificacion} onValueChange={setTipoBonificacion}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de bonificación" />
            </SelectTrigger>
            <SelectContent>
              {tiposBonificacion.map((tipo) => (
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

        {selectedTipo && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="font-medium">{selectedTipo.label}</span>
            </div>
            <p className="text-sm text-blue-600">{selectedTipo.description}</p>
            {selectedTipo.warning && (
              <p className="text-sm text-orange-600 mt-1">⚠️ {selectedTipo.warning}</p>
            )}
            {selectedTipo.limit && (
              <p className="text-sm text-green-600 mt-1">ℹ️ {selectedTipo.limit}</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="valor">Valor</Label>
          <Input
            id="valor"
            type="number"
            placeholder="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            min="0"
          />
        </div>

        {validationMessage && (
          <div className={`p-3 rounded-lg border ${
            validationMessage.type === 'error' 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}>
            {validationMessage.message}
          </div>
        )}

        <div>
          <Label htmlFor="observacion">Observaciones (Opcional)</Label>
          <Textarea
            id="observacion"
            placeholder="Detalles adicionales..."
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
          disabled={!isValid || validationMessage?.type === 'error'}
          className="min-w-[120px]"
        >
          Agregar Novedad
        </Button>
      </div>
    </div>
  );
};
