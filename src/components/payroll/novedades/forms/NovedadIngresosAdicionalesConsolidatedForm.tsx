
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
      observacion: `${entry.observacion || ''} ${entry.constitutivo ? '(Constitutivo de salario)' : '(No constitutivo de salario)'}`.trim()
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
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Ingresos Adicionales</h3>
      </div>

      {/* Form to add new entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar Nuevo Ingreso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de Ingreso</Label>
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
            <Label>Valor del Ingreso</Label>
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
              <div className="text-xs text-gray-500 mt-1">
                Valor: {formatCurrency(parseFloat(newEntry.valor))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="constitutivo" 
              checked={newEntry.constitutivo}
              onCheckedChange={(checked) => setNewEntry(prev => ({ ...prev, constitutivo: checked === true }))}
            />
            <Label htmlFor="constitutivo" className="text-sm">
              ¿Es constitutivo de salario?
            </Label>
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Detalles adicionales sobre el ingreso..."
              value={newEntry.observacion}
              onChange={(e) => setNewEntry(prev => ({ ...prev, observacion: e.target.value }))}
              rows={2}
            />
          </div>

          <Button 
            onClick={handleAddEntry}
            disabled={!newEntry.tipo_novedad || !newEntry.valor || parseFloat(newEntry.valor) <= 0}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Ingreso
          </Button>
        </CardContent>
      </Card>

      {/* List of added entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ingresos Agregados ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Group by constitutivo/no constitutivo */}
            {entries.filter(e => e.constitutivo).length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 mb-2">Constitutivos de Salario</h4>
                {entries.filter(e => e.constitutivo).map((entry) => {
                  const typeInfo = getTypeInfo(entry.tipo_novedad);
                  return (
                    <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg bg-green-50">
                      <div className="flex-1">
                        <div className="font-medium">{typeInfo?.label}</div>
                        <div className="text-sm text-gray-600">{formatCurrency(entry.valor)}</div>
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
            )}

            {entries.filter(e => !e.constitutivo).length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 mb-2">No Constitutivos de Salario</h4>
                {entries.filter(e => !e.constitutivo).map((entry) => {
                  const typeInfo = getTypeInfo(entry.tipo_novedad);
                  return (
                    <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg bg-blue-50">
                      <div className="flex-1">
                        <div className="font-medium">{typeInfo?.label}</div>
                        <div className="text-sm text-gray-600">{formatCurrency(entry.valor)}</div>
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
            )}

            {/* Totals */}
            <div className="border-t pt-3 mt-3 space-y-2">
              {totalConstitutivo > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Total Constitutivo:</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalConstitutivo)}</span>
                </div>
              )}
              {totalNoConstitutivo > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Total No Constitutivo:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(totalNoConstitutivo)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total General:</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <strong>Nota:</strong> Los ingresos constitutivos de salario afectan el cálculo de prestaciones sociales y aportes.
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={entries.length === 0}
        >
          Guardar {entries.length} Ingreso{entries.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};
