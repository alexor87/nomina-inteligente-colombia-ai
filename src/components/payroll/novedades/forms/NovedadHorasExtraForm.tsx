import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getJornadaLegal, getDailyHours } from '@/utils/jornadaLegal';

interface NovedadHorasExtraFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number) => number | null;
}

const horasExtraSubtipos = [
  { value: 'diurnas', label: 'Diurnas (25%)', description: 'Lunes a sábado 6:00 AM - 10:00 PM' },
  { value: 'nocturnas', label: 'Nocturnas (75%)', description: 'Lunes a sábado 10:00 PM - 6:00 AM' },
  { value: 'dominicales_diurnas', label: 'Dominicales Diurnas (100%)', description: 'Domingos 6:00 AM - 10:00 PM' },
  { value: 'dominicales_nocturnas', label: 'Dominicales Nocturnas (150%)', description: 'Domingos 10:00 PM - 6:00 AM' },
  { value: 'festivas_diurnas', label: 'Festivas Diurnas (100%)', description: 'Días festivos 6:00 AM - 10:00 PM' },
  { value: 'festivas_nocturnas', label: 'Festivas Nocturnas (150%)', description: 'Días festivos 10:00 PM - 6:00 AM' }
];

export const NovedadHorasExtraForm: React.FC<NovedadHorasExtraFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [subtipo, setSubtipo] = useState<string>('');
  const [horas, setHoras] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');

  // Get current legal workday info for display
  const jornadaLegal = getJornadaLegal();
  const horasPorDia = getDailyHours();

  useEffect(() => {
    if (subtipo && horas && parseFloat(horas) > 0 && calculateSuggestedValue) {
      const calculatedValue = calculateSuggestedValue('horas_extra', subtipo, parseFloat(horas));
      if (calculatedValue) {
        setValorCalculado(calculatedValue);
      }
    }
  }, [subtipo, horas, calculateSuggestedValue]);

  const handleSubmit = () => {
    if (!subtipo || !horas || parseFloat(horas) <= 0) return;

    onSubmit({
      tipo_novedad: 'horas_extra',
      subtipo,
      horas: parseFloat(horas),
      valor: valorCalculado,
      observacion
    });
  };

  const isValid = subtipo && horas && parseFloat(horas) > 0 && valorCalculado > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Horas Extra</h3>
      </div>

      {/* Legal workday info */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2 text-blue-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Jornada legal vigente: {jornadaLegal.horasSemanales} horas semanales</p>
            <p>Horas por día: {horasPorDia.toFixed(2)} según {jornadaLegal.ley}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="subtipo">Tipo de Horas Extra</Label>
          <Select value={subtipo} onValueChange={setSubtipo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de horas extra" />
            </SelectTrigger>
            <SelectContent>
              {horasExtraSubtipos.map((tipo) => (
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
