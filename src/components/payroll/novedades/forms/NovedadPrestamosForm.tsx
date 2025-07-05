
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Info, AlertTriangle } from 'lucide-react';
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
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Préstamos</h3>
      </div>

      {/* Main Content */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Información del Préstamo</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Préstamo</Label>
            <Select value={tipoPrestamo} onValueChange={setTipoPrestamo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
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

          <div>
            <Label htmlFor="numeroCuotas" className="text-gray-700">Cuotas Restantes (Opcional)</Label>
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
        </div>

        {selectedType && (
          <div className="p-3 bg-white rounded border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="font-medium">Información</span>
            </div>
            <p className="text-sm text-blue-600">{selectedType.description}</p>
          </div>
        )}

        <div>
          <Label htmlFor="valorCuota" className="text-gray-700">Valor de la Cuota</Label>
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
            <div className="mt-2 space-y-1">
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                -{formatCurrency(parseFloat(valorCuota))}
              </Badge>
              <p className="text-sm text-gray-600">
                Porcentaje del salario: {porcentajeSalario.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {excedeLimite && (
          <div className="p-3 bg-red-50 rounded border border-red-200">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Advertencia</span>
            </div>
            <p className="text-sm text-red-600">
              Esta cuota excede el límite legal del {selectedType.maxPercent}% del salario.
            </p>
          </div>
        )}

        <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-700 mb-1">
            <Info className="h-4 w-4" />
            <span className="font-medium">Recordatorio</span>
          </div>
          <p className="text-sm text-yellow-700">
            Los descuentos por préstamos requieren autorización expresa del empleado y están limitados por ley.
          </p>
        </div>

        <div>
          <Label htmlFor="observacion" className="text-gray-700">Observaciones</Label>
          <Textarea
            id="observacion"
            placeholder="Número de préstamo, entidad, fecha de inicio, etc..."
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
          Guardar Préstamo
        </Button>
      </div>
    </div>
  );
};
