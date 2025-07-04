
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadHorasExtraFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number) => number | null;
}

const tiposHorasExtra = [
  { value: 'diurnas', label: 'Horas Extra Diurnas', factor: '125%', descripcion: 'Lunes a sábado de 6:00 AM a 9:00 PM' },
  { value: 'nocturnas', label: 'Horas Extra Nocturnas', factor: '175%', descripcion: 'Lunes a sábado de 9:00 PM a 6:00 AM' },
  { value: 'dominicales', label: 'Horas Extra Dominicales', factor: '200%', descripcion: 'Domingos y festivos de 6:00 AM a 9:00 PM' },
  { value: 'festivas', label: 'Horas Extra Festivas', factor: '200%', descripcion: 'Domingos y festivos de 9:00 PM a 6:00 AM' }
];

export const NovedadHorasExtraForm: React.FC<NovedadHorasExtraFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [tipoHorasExtra, setTipoHorasExtra] = useState<string>('');
  const [horas, setHoras] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');

  useEffect(() => {
    if (tipoHorasExtra && horas && parseFloat(horas) > 0 && calculateSuggestedValue) {
      const tipoMapping: Record<string, string> = {
        'diurnas': 'horas_extra_diurnas',
        'nocturnas': 'horas_extra_nocturnas', 
        'dominicales': 'horas_extra_dominicales',
        'festivas': 'horas_extra_festivas'
      };
      
      const calculatedValue = calculateSuggestedValue(tipoMapping[tipoHorasExtra], tipoHorasExtra, parseFloat(horas));
      if (calculatedValue) {
        setValorCalculado(calculatedValue);
      }
    }
  }, [tipoHorasExtra, horas, calculateSuggestedValue]);

  const handleSubmit = () => {
    if (!tipoHorasExtra || !horas || parseFloat(horas) <= 0) return;

    onSubmit({
      tipo_novedad: 'horas_extra',
      subtipo: tipoHorasExtra,
      horas: parseFloat(horas),
      valor: valorCalculado,
      observacion
    });
  };

  const selectedTipo = tiposHorasExtra.find(t => t.value === tipoHorasExtra);
  const isValid = tipoHorasExtra && horas && parseFloat(horas) > 0 && valorCalculado > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Horas Extra</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de Horas Extra</Label>
          <Select value={tipoHorasExtra} onValueChange={setTipoHorasExtra}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de horas extra" />
            </SelectTrigger>
            <SelectContent>
              {tiposHorasExtra.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  <div>
                    <div className="font-medium">{tipo.label} ({tipo.factor})</div>
                    <div className="text-xs text-gray-500">{tipo.descripcion}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                {horas} horas × {selectedTipo.factor} = {formatCurrency(valorCalculado)}
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="observacion">Observaciones (Opcional)</Label>
          <Textarea
            id="observacion"
            placeholder="Detalles adicionales sobre las horas extra..."
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
