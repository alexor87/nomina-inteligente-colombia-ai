
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calculator, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadRecargoFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number) => number | null;
}

const tiposRecargo = [
  { 
    value: 'nocturno', 
    label: 'Recargo Nocturno', 
    porcentaje: 35,
    descripcion: 'Trabajo entre 10:00 PM y 6:00 AM',
    info: '35% adicional sobre el valor de la hora ordinaria'
  },
  { 
    value: 'dominical', 
    label: 'Recargo Dominical', 
    porcentaje: 75,
    descripcion: 'Trabajo en día domingo',
    info: '75% adicional sobre el valor de la hora ordinaria'
  },
  { 
    value: 'nocturno_dominical', 
    label: 'Recargo Nocturno Dominical', 
    porcentaje: 110,
    descripcion: 'Trabajo nocturno en día domingo',
    info: '110% adicional (35% nocturno + 75% dominical)'
  },
  { 
    value: 'festivo', 
    label: 'Recargo Festivo', 
    porcentaje: 75,
    descripcion: 'Trabajo en día festivo',
    info: '75% adicional sobre el valor de la hora ordinaria'
  },
  { 
    value: 'nocturno_festivo', 
    label: 'Recargo Nocturno Festivo', 
    porcentaje: 110,
    descripcion: 'Trabajo nocturno en día festivo',
    info: '110% adicional (35% nocturno + 75% festivo)'
  }
];

export const NovedadRecargoForm: React.FC<NovedadRecargoFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [tipoRecargo, setTipoRecargo] = useState<string>('');
  const [horas, setHoras] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');

  useEffect(() => {
    if (horas && parseFloat(horas) > 0 && tipoRecargo && calculateSuggestedValue) {
      const calculatedValue = calculateSuggestedValue('recargo_nocturno', tipoRecargo, parseFloat(horas));
      if (calculatedValue) {
        setValorCalculado(calculatedValue);
      }
    } else if (horas && parseFloat(horas) > 0 && tipoRecargo) {
      // Cálculo manual si no hay función de cálculo
      const tipoConfig = tiposRecargo.find(t => t.value === tipoRecargo);
      if (tipoConfig) {
        const valorHora = employeeSalary / 240; // 30 días × 8 horas
        const valor = Math.round(valorHora * (1 + tipoConfig.porcentaje / 100) * parseFloat(horas));
        setValorCalculado(valor);
      }
    }
  }, [horas, tipoRecargo, calculateSuggestedValue, employeeSalary]);

  const handleSubmit = () => {
    if (!tipoRecargo || !horas || parseFloat(horas) <= 0) return;

    onSubmit({
      tipo_novedad: 'recargo_nocturno',
      subtipo: tipoRecargo,
      horas: parseFloat(horas),
      valor: valorCalculado,
      observacion
    });
  };

  const selectedTipo = tiposRecargo.find(t => t.value === tipoRecargo);
  const isValid = tipoRecargo && horas && parseFloat(horas) > 0 && valorCalculado > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Recargos</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de Recargo</Label>
          <Select value={tipoRecargo} onValueChange={setTipoRecargo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de recargo" />
            </SelectTrigger>
            <SelectContent>
              {tiposRecargo.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  <div>
                    <div className="font-medium">{tipo.label} ({tipo.porcentaje}%)</div>
                    <div className="text-xs text-gray-500">{tipo.descripcion}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTipo && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{selectedTipo.label}</span>
            </div>
            <p className="text-sm text-blue-600">{selectedTipo.info}</p>
          </div>
        )}

        <div>
          <Label htmlFor="horas">Cantidad de Horas</Label>
          <Input
            id="horas"
            type="number"
            placeholder="0"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            min="0"
            step="0.5"
          />
        </div>

        {valorCalculado > 0 && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Valor Calculado: {formatCurrency(valorCalculado)}</span>
            </div>
            {selectedTipo && (
              <p className="text-sm text-green-600 mt-1">
                {horas} horas × {selectedTipo.porcentaje}% de recargo
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="observacion">Observaciones (Opcional)</Label>
          <Textarea
            id="observacion"
            placeholder="Detalles adicionales sobre el recargo..."
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
