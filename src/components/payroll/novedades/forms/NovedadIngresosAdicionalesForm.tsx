
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, DollarSign, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadIngresosAdicionalesFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
}

const ingresoTypes = [
  { 
    value: 'bonificacion', 
    label: 'Bonificación', 
    constitutivo: true,
    description: 'Pagos adicionales por productividad, metas, etc.'
  },
  { 
    value: 'comision', 
    label: 'Comisión', 
    constitutivo: true,
    description: 'Comisiones por ventas o gestión'
  },
  { 
    value: 'auxilio_alimentacion', 
    label: 'Auxilio de Alimentación', 
    constitutivo: false,
    description: 'Subsidio para alimentación (no constitutivo hasta cierto monto)'
  },
  { 
    value: 'auxilio_transporte_adicional', 
    label: 'Auxilio de Transporte Adicional', 
    constitutivo: false,
    description: 'Transporte adicional al legal'
  },
  { 
    value: 'prima_extralegal', 
    label: 'Prima Extralegal', 
    constitutivo: true,
    description: 'Primas adicionales a las legales'
  },
  { 
    value: 'otros_ingresos', 
    label: 'Otros Ingresos', 
    constitutivo: false,
    description: 'Otros conceptos de ingreso'
  }
];

export const NovedadIngresosAdicionalesForm: React.FC<NovedadIngresosAdicionalesFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const [tipoIngreso, setTipoIngreso] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [esConstitutivo, setEsConstitutivo] = useState<boolean>(false);
  const [observacion, setObservacion] = useState<string>('');

  const handleTipoIngresoChange = (tipo: string) => {
    setTipoIngreso(tipo);
    const selectedType = ingresoTypes.find(t => t.value === tipo);
    if (selectedType) {
      setEsConstitutivo(selectedType.constitutivo);
    }
  };

  const handleSubmit = () => {
    if (!tipoIngreso || !valor || parseFloat(valor) <= 0) return;

    onSubmit({
      tipo_novedad: tipoIngreso,
      valor: parseFloat(valor),
      observacion: `${observacion} ${esConstitutivo ? '(Constitutivo de salario)' : '(No constitutivo de salario)'}`.trim()
    });
  };

  const handleConstitutivChange = (checked: boolean | "indeterminate") => {
    setEsConstitutivo(checked === true);
  };

  const selectedType = ingresoTypes.find(t => t.value === tipoIngreso);
  const isValid = tipoIngreso && valor && parseFloat(valor) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Ingresos Adicionales</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de Ingreso</Label>
          <Select value={tipoIngreso} onValueChange={handleTipoIngresoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de ingreso" />
            </SelectTrigger>
            <SelectContent>
              {ingresoTypes.map((tipo) => (
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
          <Label htmlFor="valor">Valor del Ingreso</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="valor"
              type="number"
              placeholder="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              min="0"
              step="1000"
              className="pl-10"
            />
          </div>
          {valor && parseFloat(valor) > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Valor: {formatCurrency(parseFloat(valor))}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="constitutivo" 
            checked={esConstitutivo}
            onCheckedChange={handleConstitutivChange}
          />
          <Label htmlFor="constitutivo" className="text-sm">
            ¿Es constitutivo de salario?
          </Label>
        </div>

        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-700">
            <strong>Nota:</strong> Los ingresos constitutivos de salario afectan el cálculo de prestaciones sociales y aportes.
          </p>
        </div>

        <div>
          <Label htmlFor="observacion">Observaciones (Opcional)</Label>
          <Textarea
            id="observacion"
            placeholder="Detalles adicionales sobre el ingreso..."
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
