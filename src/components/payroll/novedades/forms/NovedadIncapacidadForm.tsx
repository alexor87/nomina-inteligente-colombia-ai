
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadIncapacidadFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, dias?: number) => number | null;
}

const incapacidadTypes = [
  { 
    value: 'comun', 
    label: 'Incapacidad Común', 
    description: 'EPS paga 66.7% desde el día 4',
    porcentaje: '66.7%',
    entidad: 'EPS'
  },
  { 
    value: 'laboral', 
    label: 'Incapacidad Laboral', 
    description: 'ARL paga 100% desde el día 1',
    porcentaje: '100%',
    entidad: 'ARL'
  },
  { 
    value: 'maternidad', 
    label: 'Licencia de Maternidad', 
    description: 'EPS paga 100% durante la licencia',
    porcentaje: '100%',
    entidad: 'EPS'
  }
];

export const NovedadIncapacidadForm: React.FC<NovedadIncapacidadFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [tipoIncapacidad, setTipoIncapacidad] = useState<string>('');
  const [dias, setDias] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');

  useEffect(() => {
    if (tipoIncapacidad && dias && parseFloat(dias) > 0 && calculateSuggestedValue) {
      const calculatedValue = calculateSuggestedValue('incapacidad', tipoIncapacidad, parseFloat(dias));
      if (calculatedValue) {
        setValorCalculado(calculatedValue);
      }
    }
  }, [tipoIncapacidad, dias, calculateSuggestedValue]);

  const handleSubmit = () => {
    if (!tipoIncapacidad || !dias || parseFloat(dias) <= 0) return;

    onSubmit({
      tipo_novedad: 'incapacidad',
      subtipo: tipoIncapacidad,
      dias: parseFloat(dias),
      valor: valorCalculado,
      observacion
    });
  };

  const selectedType = incapacidadTypes.find(t => t.value === tipoIncapacidad);
  const isValid = tipoIncapacidad && dias && parseFloat(dias) > 0 && valorCalculado > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Incapacidades</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de Incapacidad</Label>
          <Select value={tipoIncapacidad} onValueChange={setTipoIncapacidad}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de incapacidad" />
            </SelectTrigger>
            <SelectContent>
              {incapacidadTypes.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  <div>
                    <div className="font-medium">{tipo.label}</div>
                    <div className="text-xs text-gray-500">
                      {tipo.entidad} - {tipo.porcentaje}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedType && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="font-medium">Información</span>
            </div>
            <p className="text-sm text-blue-600">{selectedType.description}</p>
          </div>
        )}

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
            placeholder="Detalles adicionales sobre la incapacidad..."
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
