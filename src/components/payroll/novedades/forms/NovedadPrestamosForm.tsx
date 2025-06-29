
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CreditCard, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadPrestamosFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
}

const prestamoTypes = [
  { 
    value: 'libranza', 
    label: 'Libranza', 
    description: 'Préstamo con descuento directo de nómina',
    maxPercent: 30
  },
  { 
    value: 'cooperativa', 
    label: 'Cooperativa', 
    description: 'Préstamo de cooperativa',
    maxPercent: 30
  },
  { 
    value: 'empresa', 
    label: 'Empresa', 
    description: 'Préstamo otorgado por la empresa',
    maxPercent: 50
  },
  { 
    value: 'banco', 
    label: 'Banco', 
    description: 'Préstamo bancario con autorización de descuento',
    maxPercent: 30
  }
];

export const NovedadPrestamosForm: React.FC<NovedadPrestamosFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const [tipoPrestamo, setTipoPrestamo] = useState<string>('');
  const [valorCuota, setValorCuota] = useState<string>('');
  const [numeroCuotas, setNumeroCuotas] = useState<string>('');
  const [observacion, setObservacion] = useState<string>('');

  const handleSubmit = () => {
    if (!tipoPrestamo || !valorCuota || parseFloat(valorCuota) <= 0) return;

    const observacionCompleta = `${observacion} ${numeroCuotas ? `- ${numeroCuotas} cuotas restantes` : ''}`.trim();

    onSubmit({
      tipo_novedad: 'libranza',
      subtipo: tipoPrestamo,
      valor: parseFloat(valorCuota),
      observacion: observacionCompleta
    });
  };

  const selectedType = prestamoTypes.find(t => t.value === tipoPrestamo);
  const isValid = tipoPrestamo && valorCuota && parseFloat(valorCuota) > 0;
  
  const valorCuotaNumerico = parseFloat(valorCuota) || 0;
  const porcentajeSalario = (valorCuotaNumerico / employeeSalary) * 100;
  const excedeLimite = selectedType && porcentajeSalario > selectedType.maxPercent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Préstamos</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de Préstamo</Label>
          <Select value={tipoPrestamo} onValueChange={setTipoPrestamo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de préstamo" />
            </SelectTrigger>
            <SelectContent>
              {prestamoTypes.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  <div>
                    <div className="font-medium">{tipo.label}</div>
                    <div className="text-xs text-gray-500">
                      {tipo.description} - Máx: {tipo.maxPercent}%
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
          <Label htmlFor="valorCuota">Valor de la Cuota</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="valorCuota"
              type="number"
              placeholder="0"
              value={valorCuota}
              onChange={(e) => setValorCuota(e.target.value)}
              min="0"
              step="1000"
              className="pl-10"
            />
          </div>
          {valorCuota && parseFloat(valorCuota) > 0 && (
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-600">
                Valor cuota: {formatCurrency(parseFloat(valorCuota))}
              </p>
              <p className="text-sm text-gray-600">
                Porcentaje del salario: {porcentajeSalario.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="numeroCuotas">Número de Cuotas Restantes (Opcional)</Label>
          <Input
            id="numeroCuotas"
            type="number"
            placeholder="0"
            value={numeroCuotas}
            onChange={(e) => setNumeroCuotas(e.target.value)}
            min="0"
            step="1"
          />
        </div>

        {excedeLimite && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <CreditCard className="h-4 w-4" />
              <span className="font-medium">Advertencia</span>
            </div>
            <p className="text-sm text-red-600">
              Esta cuota excede el límite legal del {selectedType.maxPercent}% del salario.
            </p>
          </div>
        )}

        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-700">
            <strong>Recordatorio:</strong> Los descuentos por préstamos requieren autorización expresa del empleado y están limitados por ley.
          </p>
        </div>

        <div>
          <Label htmlFor="observacion">Observaciones</Label>
          <Textarea
            id="observacion"
            placeholder="Número de préstamo, entidad, fecha de inicio, etc..."
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
