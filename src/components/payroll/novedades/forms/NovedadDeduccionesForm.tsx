
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Minus, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadDeduccionesFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
}

const deduccionTypes = [
  { 
    value: 'multa', 
    label: 'Multa', 
    description: 'Sanciones disciplinarias',
    maxPercent: 50 // Máximo 50% del salario
  },
  { 
    value: 'descuento_voluntario', 
    label: 'Descuento Voluntario', 
    description: 'Descuentos autorizados por el empleado',
    maxPercent: 100
  },
  { 
    value: 'embargo', 
    label: 'Embargo', 
    description: 'Órdenes judiciales de embargo',
    maxPercent: 50
  },
  { 
    value: 'cooperativa', 
    label: 'Cooperativa', 
    description: 'Aportes a cooperativas',
    maxPercent: 30
  },
  { 
    value: 'seguro', 
    label: 'Seguro', 
    description: 'Pólizas de seguro',
    maxPercent: 20
  },
  { 
    value: 'prestamo_empresa', 
    label: 'Préstamo de la Empresa', 
    description: 'Descuentos por préstamos de la empresa',
    maxPercent: 30
  },
  { 
    value: 'otros_descuentos', 
    label: 'Otros Descuentos', 
    description: 'Otros conceptos de deducción',
    maxPercent: 50
  }
];

export const NovedadDeduccionesForm: React.FC<NovedadDeduccionesFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const [tipoDeduccion, setTipoDeduccion] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [observacion, setObservacion] = useState<string>('');

  const handleSubmit = () => {
    if (!tipoDeduccion || !valor || parseFloat(valor) <= 0) return;

    onSubmit({
      tipo_novedad: tipoDeduccion,
      valor: parseFloat(valor),
      observacion
    });
  };

  const selectedType = deduccionTypes.find(t => t.value === tipoDeduccion);
  const isValid = tipoDeduccion && valor && parseFloat(valor) > 0;
  
  const valorNumerico = parseFloat(valor) || 0;
  const porcentajeSalario = (valorNumerico / employeeSalary) * 100;
  const excedeLimite = selectedType && porcentajeSalario > selectedType.maxPercent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Deducciones</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de Deducción</Label>
          <Select value={tipoDeduccion} onValueChange={setTipoDeduccion}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de deducción" />
            </SelectTrigger>
            <SelectContent>
              {deduccionTypes.map((tipo) => (
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
          <Label htmlFor="valor">Valor de la Deducción</Label>
          <div className="relative">
            <Minus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-600">
                Valor: {formatCurrency(parseFloat(valor))}
              </p>
              <p className="text-sm text-gray-600">
                Porcentaje del salario: {porcentajeSalario.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {excedeLimite && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Advertencia</span>
            </div>
            <p className="text-sm text-red-600">
              Esta deducción excede el límite legal del {selectedType.maxPercent}% del salario. 
              Revisa la normatividad aplicable.
            </p>
          </div>
        )}

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Recordatorio:</strong> Las deducciones están sujetas a límites legales según el Código Sustantivo del Trabajo.
          </p>
        </div>

        <div>
          <Label htmlFor="observacion">Observaciones</Label>
          <Textarea
            id="observacion"
            placeholder="Justificación y detalles de la deducción (requerido)..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            required
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
          disabled={!isValid || !observacion.trim()}
          className="min-w-[120px]"
        >
          Agregar Novedad
        </Button>
      </div>
    </div>
  );
};
