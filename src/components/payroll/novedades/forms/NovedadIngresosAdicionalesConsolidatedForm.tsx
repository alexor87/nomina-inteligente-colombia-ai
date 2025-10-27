
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Info, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useMultipleNovedadEntries } from '@/hooks/useMultipleNovedadEntries';

interface IngresoEntry {
  id: string;
  tipo_novedad: string;
  valor: number;
  observacion?: string;
  constitutivo: boolean;
}

interface NovedadIngresosAdicionalesConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formDataArray: any[]) => void;
  employeeSalary: number;
}

const ingresoTypes = [
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

export const NovedadIngresosAdicionalesConsolidatedForm: React.FC<NovedadIngresosAdicionalesConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const { entries, addEntry, updateEntry, removeEntry, getTotalValue } = useMultipleNovedadEntries<IngresoEntry>();
  
  const [newEntry, setNewEntry] = useState({
    tipo_novedad: '',
    valor: '',
    observacion: '',
    constitutivo: false
  });

  const handleTipoIngresoChange = (tipo: string) => {
    const selectedType = ingresoTypes.find(t => t.value === tipo);
    setNewEntry(prev => ({
      ...prev,
      tipo_novedad: tipo,
      constitutivo: selectedType?.constitutivo || false
    }));
  };

  const handleAddEntry = () => {
    if (!newEntry.tipo_novedad || !newEntry.valor || parseFloat(newEntry.valor) <= 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const valorNum = parseFloat(newEntry.valor);

    addEntry({
      tipo_novedad: newEntry.tipo_novedad,
      valor: valorNum,
      observacion: newEntry.observacion || undefined,
      constitutivo: newEntry.constitutivo
    });

    // Reset form
    setNewEntry({
      tipo_novedad: '',
      valor: '',
      observacion: '',
      constitutivo: false
    });
  };

  const handleSubmit = () => {
    if (entries.length === 0) {
      alert('Agregue al menos un ingreso adicional');
      return;
    }

    const formDataArray = entries.map(entry => ({
      tipo_novedad: entry.tipo_novedad,
      valor: entry.valor,
      observacion: entry.observacion || undefined,
      constitutivo_salario: entry.constitutivo
    }));

    onSubmit(formDataArray);
  };

  const getTypeInfo = (tipo: string) => {
    return ingresoTypes.find(t => t.value === tipo);
  };

  const totalValue = getTotalValue();
  const totalConstitutivo = entries.filter(e => e.constitutivo).reduce((sum, e) => sum + e.valor, 0);
  const totalNoConstitutivo = entries.filter(e => !e.constitutivo).reduce((sum, e) => sum + e.valor, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Ingresos Adicionales</h3>
      </div>

      {/* Form to add new entry */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Agregar Nuevo Ingreso</h4>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Ingreso</Label>
            <Select 
              value={newEntry.tipo_novedad} 
              onValueChange={handleTipoIngresoChange}
            >
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

          <div>
            <Label htmlFor="valor" className="text-gray-700">Valor del Ingreso</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                placeholder="0"
                value={newEntry.valor}
                onChange={(e) => setNewEntry(prev => ({ ...prev, valor: e.target.value }))}
                min="0"
                step="1000"
                className="pl-10"
              />
            </div>
            {newEntry.valor && parseFloat(newEntry.valor) > 0 && (
              <div className="mt-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  +{formatCurrency(parseFloat(newEntry.valor))}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 p-3 bg-white rounded border border-blue-200">
            <Checkbox 
              id="constitutivo" 
              checked={newEntry.constitutivo}
              onCheckedChange={(checked) => setNewEntry(prev => ({ ...prev, constitutivo: checked === true }))}
            />
            <Label htmlFor="constitutivo" className="text-sm text-gray-700">
              ¿Es constitutivo de salario?
            </Label>
          </div>

          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="font-medium">Nota</span>
            </div>
            <p className="text-sm text-yellow-700">
              Los ingresos constitutivos de salario afectan el cálculo de prestaciones sociales y aportes.
            </p>
          </div>

          <div>
            <Label htmlFor="observacion" className="text-gray-700">Observaciones (Opcional)</Label>
            <Textarea
              placeholder="Detalles adicionales sobre el ingreso..."
              value={newEntry.observacion}
              onChange={(e) => setNewEntry(prev => ({ ...prev, observacion: e.target.value }))}
              rows={2}
              className="resize-none"
            />
          </div>

          <Button 
            onClick={handleAddEntry}
            disabled={!newEntry.tipo_novedad || !newEntry.valor || parseFloat(newEntry.valor) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Ingreso
          </Button>
        </div>
      </div>

      {/* List of added entries */}
      {entries.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Ingresos Agregados ({entries.length})</h4>
          
          <div className="space-y-2">
            {entries.map((entry) => {
              const typeInfo = getTypeInfo(entry.tipo_novedad);

              return (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg bg-white">
                  <div className="flex-1">
                    <div className="font-medium">{typeInfo?.label}</div>
                    <div className="text-sm text-gray-600">{formatCurrency(entry.valor)}</div>
                    <div className="text-xs text-gray-500">
                      {entry.constitutivo ? 'Constitutivo de salario' : 'No constitutivo de salario'}
                    </div>
                    {entry.observacion && (
                      <div className="text-xs text-gray-500 mt-1">{entry.observacion}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Constitutivo:</span>
              <span className="font-medium text-green-600">{formatCurrency(totalConstitutivo)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total No Constitutivo:</span>
              <span className="font-medium text-blue-600">{formatCurrency(totalNoConstitutivo)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total General:</span>
              <span className="text-xl font-bold text-blue-700">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={entries.length === 0}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          Guardar {entries.length} Ingreso{entries.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};
