
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadRecargoNocturnoFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number) => number | null;
}

export const NovedadRecargoNocturnoForm: React.FC<NovedadRecargoNocturnoFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [horas, setHoras] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');

  useEffect(() => {
    if (horas && parseFloat(horas) > 0 && calculateSuggestedValue) {
      const calculatedValue = calculateSuggestedValue('recargo_nocturno', undefined, parseFloat(horas));
      if (calculatedValue) {
        setValorCalculado(calculatedValue);
      }
    }
  }, [horas, calculateSuggestedValue]);

  const handleSubmit = () => {
    if (!horas || parseFloat(horas) <= 0) return;

    onSubmit({
      tipo_novedad: 'recargo_nocturno',
      horas: parseFloat(horas),
      valor: valorCalculado,
      observacion
    });
  };

  const isValid = horas && parseFloat(horas) > 0 && valorCalculado > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Recargo Nocturno</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Recargo nocturno:</strong> 35% adicional sobre el valor de la hora ordinaria para trabajo entre 10:00 PM y 6:00 AM.
          </p>
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
            placeholder="Detalles adicionales sobre el recargo nocturno..."
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
