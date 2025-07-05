
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

interface BonificacionEntry {
  id: string;
  tipo_novedad: string;
  valor: number;
  observacion?: string;
  constitutivo: boolean;
}

interface NovedadBonificacionesConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formDataArray: any[]) => void;
  employeeSalary: number;
}

const tiposBonificacion = [
  { 
    value: 'bonificacion_salarial', 
    label: 'Bonificación Salarial',
    description: 'Afecta el cálculo de prestaciones sociales',
    defaultConstitutivo: true
  },
  { 
    value: 'bonificacion_no_salarial', 
    label: 'Bonificación No Salarial',
    description: 'No afecta el cálculo de prestaciones sociales',
    defaultConstitutivo: false
  },
  { 
    value: 'auxilio_conectividad', 
    label: 'Auxilio de Conectividad Digital',
    description: 'Solo para empleados con salario ≤ 2 SMMLV',
    defaultConstitutivo: false
  }
];

export const NovedadBonificacionesConsolidatedForm: React.FC<NovedadBonificacionesConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const { entries, addEntry, updateEntry, removeEntry, getTotalValue } = useMultipleNovedadEntries<BonificacionEntry>();
  
  const [newEntry, setNewEntry] = useState({
    tipo_novedad: '',
    valor: '',
    observacion: '',
    constitutivo: false
  });

  const handleTipoBonificacionChange = (tipo: string) => {
    const selectedType = tiposBonificacion.find(t => t.value === tipo);
    setNewEntry(prev => ({
      ...prev,
      tipo_novedad: tipo,
      constitutivo: selectedType?.defaultConstitutivo || false
    }));
  };

  const handleAddEntry = () => {
    if (!newEntry.tipo_novedad || !newEntry.valor || parseFloat(newEntry.valor) <= 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const valorNum = parseFloat(newEntry.valor);
    
    // Validación específica para auxilio de conectividad
    if (newEntry.tipo_novedad === 'auxilio_conectividad' && employeeSalary > 2600000) {
      alert('El auxilio de conectividad solo aplica para salarios ≤ 2 SMMLV');
      return;
    }
    
    // Validación para bonificaciones no salariales
    if (newEntry.tipo_novedad === 'bonificacion_no_salarial' && valorNum > employeeSalary * 0.4) {
      if (!window.confirm('La bonificación supera el 40% del salario, podría perder su naturaleza no salarial. ¿Continuar?')) {
        return;
      }
    }

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
      alert('Agregue al menos una bonificación');
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
    return tiposBonificacion.find(t => t.value === tipo);
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
        <h3 className="text-lg font-semibold">Bonificaciones y Auxilios</h3>
      </div>

      {/* Form to add new entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar Nueva Bonificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de Bonificación</Label>
            <Select 
              value={newEntry.tipo_novedad} 
              onValueChange={handleTipoBonificacionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de bonificación" />
              </SelectTrigger>
              <SelectContent>
                {tiposBonificacion.map((tipo) => (
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
            <Label>Valor</Label>
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
              placeholder="Detalles adicionales sobre la bonificación..."
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
            Agregar Bonificación
          </Button>
        </CardContent>
      </Card>

      {/* List of added entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bonificaciones Agregadas ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((entry) => {
              const typeInfo = getTypeInfo(entry.tipo_novedad);

              return (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg">
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

            {/* Totals */}
            <div className="border-t pt-3 mt-3 space-y-2">
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
          Guardar {entries.length} Bonificacion{entries.length !== 1 ? 'es' : ''}
        </Button>
      </div>
    </div>
  );
};
