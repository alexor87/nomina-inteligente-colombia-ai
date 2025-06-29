
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadVacacionesFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, dias?: number) => number | null;
}

const vacacionesTypes = [
  { value: 'normales', label: 'Vacaciones Normales', description: 'Vacaciones disfrutadas' },
  { value: 'compensadas', label: 'Días Compensados', description: 'Días no disfrutados pagados en dinero' },
  { value: 'anticipadas', label: 'Pago Anticipado', description: 'Pago adelantado de vacaciones' }
];

export const NovedadVacacionesForm: React.FC<NovedadVacacionesFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [tipoVacaciones, setTipoVacaciones] = useState<string>('');
  const [dias, setDias] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');
  const [pagoAnticipado, setPagoAnticipado] = useState<boolean>(false);

  useEffect(() => {
    if (tipoVacaciones && dias && parseFloat(dias) > 0 && calculateSuggestedValue) {
      const calculatedValue = calculateSuggestedValue('vacaciones', tipoVacaciones, parseFloat(dias));
      if (calculatedValue) {
        setValorCalculado(calculatedValue);
      }
    }
  }, [tipoVacaciones, dias, calculateSuggestedValue]);

  const handleSubmit = () => {
    if (!tipoVacaciones || !dias || parseFloat(dias) <= 0) return;

    onSubmit({
      tipo_novedad: 'vacaciones',
      subtipo: tipoVacaciones,
      dias: parseFloat(dias),
      valor: valorCalculado,
      observacion: `${observacion}${pagoAnticipado ? ' (Pago anticipado)' : ''}`.trim()
    });
  };

  const isValid = tipoVacaciones && dias && parseFloat(dias) > 0 && valorCalculado > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Vacaciones</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de Vacaciones</Label>
          <Select value={tipoVacaciones} onValueChange={setTipoVacaciones}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de vacaciones" />
            </SelectTrigger>
            <SelectContent>
              {vacacionesTypes.map((tipo) => (
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

        <div>
          <Label htmlFor="dias">Cantidad de Días</Label>
          <Input
            id="dias"
            type="number"
            placeholder="0"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            min="0"
            step="1"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="pago-anticipado" 
            checked={pagoAnticipado}
            onCheckedChange={setPagoAnticipado}
          />
          <Label htmlFor="pago-anticipado" className="text-sm">
            ¿Pago anticipado?
          </Label>
        </div>

        {valorCalculado > 0 && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Valor Calculado: {formatCurrency(valorCalculado)}</span>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="observacion">Observaciones (Opcional)</Label>
          <Textarea
            id="observacion"
            placeholder="Detalles adicionales sobre las vacaciones..."
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
