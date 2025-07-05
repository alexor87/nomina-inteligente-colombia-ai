
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadLicenciasFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, dias?: number) => number | null;
}

const licenciaTypes = [
  { 
    value: 'remunerada', 
    label: 'Licencia Remunerada', 
    description: 'Se paga el 100% del salario',
    subtipos: ['paternidad', 'matrimonio', 'luto', 'estudio']
  },
  { 
    value: 'no_remunerada', 
    label: 'Licencia No Remunerada', 
    description: 'No genera pago pero se descuenta del salario',
    subtipos: ['personal', 'familiar', 'medica']
  }
];

export const NovedadLicenciasForm: React.FC<NovedadLicenciasFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [tipoLicencia, setTipoLicencia] = useState<string>('');
  const [subtipo, setSubtipo] = useState<string>('');
  const [dias, setDias] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');

  useEffect(() => {
    if (tipoLicencia && dias && parseFloat(dias) > 0 && calculateSuggestedValue) {
      if (tipoLicencia === 'remunerada') {
        const calculatedValue = calculateSuggestedValue('licencia_remunerada', subtipo, parseFloat(dias));
        if (calculatedValue) {
          setValorCalculado(calculatedValue);
        }
      } else {
        const calculatedValue = calculateSuggestedValue('ausencia', 'licencia_no_remunerada', parseFloat(dias));
        if (calculatedValue) {
          setValorCalculado(-calculatedValue);
        }
      }
    }
  }, [tipoLicencia, subtipo, dias, calculateSuggestedValue]);

  const handleSubmit = () => {
    if (!tipoLicencia || !dias || parseFloat(dias) <= 0) return;

    const novedadType = tipoLicencia === 'remunerada' ? 'licencia_remunerada' : 'ausencia';

    onSubmit({
      tipo_novedad: novedadType,
      subtipo: subtipo || tipoLicencia,
      dias: parseFloat(dias),
      valor: Math.abs(valorCalculado),
      observacion: `${observacion} (${tipoLicencia})`.trim()
    });
  };

  const selectedType = licenciaTypes.find(t => t.value === tipoLicencia);
  const isValid = tipoLicencia && dias && parseFloat(dias) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Licencias</h3>
      </div>

      {/* Main Content */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Información de la Licencia</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Licencia</Label>
            <Select value={tipoLicencia} onValueChange={setTipoLicencia}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {licenciaTypes.map((tipo) => (
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
            <Label htmlFor="dias" className="text-gray-700">Días</Label>
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
        </div>

        {selectedType && (
          <>
            <div>
              <Label htmlFor="subtipo" className="text-gray-700">Subtipo</Label>
              <Select value={subtipo} onValueChange={setSubtipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el subtipo" />
                </SelectTrigger>
                <SelectContent>
                  {selectedType.subtipos.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      <span className="capitalize">{sub}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-white rounded border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Info className="h-4 w-4" />
                <span className="font-medium">Información</span>
              </div>
              <p className="text-sm text-blue-600">{selectedType.description}</p>
            </div>
          </>
        )}

        {valorCalculado !== 0 && (
          <div className={`p-3 rounded border ${
            valorCalculado > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`flex items-center gap-2 ${
              valorCalculado > 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              <Calculator className="h-4 w-4" />
              <span className="font-medium">
                {valorCalculado > 0 ? 'Valor a Pagar' : 'Valor a Descontar'}
              </span>
            </div>
            <Badge variant="secondary" className={`mt-1 ${
              valorCalculado > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {valorCalculado > 0 ? '+' : ''}{formatCurrency(Math.abs(valorCalculado))}
            </Badge>
          </div>
        )}

        <div>
          <Label htmlFor="observacion" className="text-gray-700">Observaciones (Opcional)</Label>
          <Textarea
            id="observacion"
            placeholder="Detalles adicionales sobre la licencia..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          Guardar Licencia
        </Button>
      </div>
    </div>
  );
};
