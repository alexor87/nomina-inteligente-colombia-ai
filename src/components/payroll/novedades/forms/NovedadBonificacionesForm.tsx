
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Info, AlertTriangle } from 'lucide-react';
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
    
    
    if (selectedTipo.value === 'bonificacion_no_salarial' && valorNum > employeeSalary * 0.4) {
      return { type: 'warning', message: 'La bonificación supera el 40% del salario, podría perder su naturaleza no salarial' };
    }
    
    return null;
  };

  const validationMessage = getValidationMessage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Bonificaciones y Auxilios</h3>
      </div>

      {/* Main Content */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Información de la Bonificación</h4>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Bonificación</Label>
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
            <div className="p-3 bg-white rounded border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Info className="h-4 w-4" />
                <span className="font-medium">{selectedTipo.label}</span>
              </div>
              <p className="text-sm text-blue-600">{selectedTipo.description}</p>
              {selectedTipo.warning && (
                <p className="text-sm text-orange-600 mt-1">⚠️ {selectedTipo.warning}</p>
              )}
              {'info' in selectedTipo && selectedTipo.info && (
                <p className="text-sm text-green-600 mt-1">ℹ️ {selectedTipo.info}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="valor" className="text-gray-700">Valor</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="valor"
                type="number"
                placeholder="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                min="0"
                className="pl-10"
              />
            </div>
            {valor && parseFloat(valor) > 0 && (
              <div className="mt-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {formatCurrency(parseFloat(valor))}
                </Badge>
              </div>
            )}
          </div>

          {validationMessage && (
            <div className={`p-3 rounded border ${
              validationMessage.type === 'error' 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{validationMessage.message}</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="observacion" className="text-gray-700">Observaciones (Opcional)</Label>
            <Textarea
              id="observacion"
              placeholder="Detalles adicionales..."
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
          disabled={!isValid || validationMessage?.type === 'error'}
          variant="default"
          className="min-w-[120px]"
        >
          Guardar Bonificación
        </Button>
      </div>
    </div>
  );
};
