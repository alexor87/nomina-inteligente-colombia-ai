
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CreditCard, Info, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useMultipleNovedadEntries } from '@/hooks/useMultipleNovedadEntries';

interface PrestamoEntry {
  id: string;
  tipo_novedad: string;
  subtipo: string;
  valor: number;
  numeroCuotas?: number;
  observacion?: string;
}

interface NovedadPrestamosConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formDataArray: any[]) => void;
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

export const NovedadPrestamosConsolidatedForm: React.FC<NovedadPrestamosConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const { entries, addEntry, updateEntry, removeEntry, getTotalValue } = useMultipleNovedadEntries<PrestamoEntry>();
  
  const [newEntry, setNewEntry] = useState({
    subtipo: '',
    valor: '',
    numeroCuotas: '',
    observacion: ''
  });

  const handleAddEntry = () => {
    if (!newEntry.subtipo || !newEntry.valor || parseFloat(newEntry.valor) <= 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const selectedType = prestamoTypes.find(t => t.value === newEntry.subtipo);
    const valorNumerico = parseFloat(newEntry.valor);
    const porcentajeSalario = (valorNumerico / employeeSalary) * 100;
    
    if (selectedType && porcentajeSalario > selectedType.maxPercent) {
      if (!window.confirm(`Esta cuota excede el límite legal del ${selectedType.maxPercent}% del salario. ¿Desea continuar?`)) {
        return;
      }
    }

    const observacionCompleta = `${newEntry.observacion} ${newEntry.numeroCuotas ? `- ${newEntry.numeroCuotas} cuotas restantes` : ''}`.trim();

    addEntry({
      tipo_novedad: 'libranza',
      subtipo: newEntry.subtipo,
      valor: valorNumerico,
      numeroCuotas: newEntry.numeroCuotas ? parseInt(newEntry.numeroCuotas) : undefined,
      observacion: observacionCompleta || undefined
    });

    // Reset form
    setNewEntry({
      subtipo: '',
      valor: '',
      numeroCuotas: '',
      observacion: ''
    });
  };

  const handleSubmit = () => {
    if (entries.length === 0) {
      alert('Agregue al menos un préstamo');
      return;
    }

    // Check total loans don't exceed safe limits
    const totalPercent = (getTotalValue() / employeeSalary) * 100;
    if (totalPercent > 50) {
      if (!window.confirm(`El total de préstamos (${totalPercent.toFixed(1)}%) excede el 50% del salario. ¿Desea continuar?`)) {
        return;
      }
    }

    const formDataArray = entries.map(entry => ({
      tipo_novedad: 'libranza',
      subtipo: entry.subtipo,
      valor: entry.valor,
      observacion: entry.observacion
    }));

    onSubmit(formDataArray);
  };

  const getTypeInfo = (subtipo: string) => {
    return prestamoTypes.find(t => t.value === subtipo);
  };

  const totalValue = getTotalValue();
  const totalPercent = (totalValue / employeeSalary) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Préstamos</h3>
      </div>

      {/* Form to add new entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar Nuevo Préstamo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de Préstamo</Label>
            <Select 
              value={newEntry.subtipo} 
              onValueChange={(value) => setNewEntry(prev => ({ ...prev, subtipo: value }))}
            >
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

          <div>
            <Label>Valor de la Cuota</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                Porcentaje del salario: {((parseFloat(newEntry.valor) / employeeSalary) * 100).toFixed(1)}%
              </div>
            )}
          </div>

          <div>
            <Label>Número de Cuotas Restantes (Opcional)</Label>
            <Input
              type="number"
              placeholder="0"
              value={newEntry.numeroCuotas}
              onChange={(e) => setNewEntry(prev => ({ ...prev, numeroCuotas: e.target.value }))}
              min="0"
              step="1"
            />
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Número de préstamo, entidad, fecha de inicio, etc..."
              value={newEntry.observacion}
              onChange={(e) => setNewEntry(prev => ({ ...prev, observacion: e.target.value }))}
              rows={2}
            />
          </div>

          <Button 
            onClick={handleAddEntry}
            disabled={!newEntry.subtipo || !newEntry.valor || parseFloat(newEntry.valor) <= 0}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Préstamo
          </Button>
        </CardContent>
      </Card>

      {/* List of added entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Préstamos Agregados ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((entry) => {
              const typeInfo = getTypeInfo(entry.subtipo);
              const percent = (entry.valor / employeeSalary) * 100;
              const exceedsLimit = typeInfo && percent > typeInfo.maxPercent;

              return (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{typeInfo?.label}</div>
                    <div className="text-sm text-gray-600">{formatCurrency(entry.valor)} / mes</div>
                    <div className="text-xs text-gray-500">
                      {percent.toFixed(1)}% del salario
                      {entry.numeroCuotas && ` - ${entry.numeroCuotas} cuotas restantes`}
                      {exceedsLimit && (
                        <span className="text-red-600 ml-2">
                          ⚠️ Excede límite ({typeInfo.maxPercent}%)
                        </span>
                      )}
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

            {/* Total */}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center font-semibold">
                <span>Total Préstamos:</span>
                <div className="text-right">
                  <div>{formatCurrency(totalValue)} / mes</div>
                  <div className="text-sm text-gray-600">
                    {totalPercent.toFixed(1)}% del salario
                  </div>
                </div>
              </div>
              
              {totalPercent > 50 && (
                <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  El total excede el límite recomendado del 50% del salario
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <strong>Recordatorio:</strong> Los descuentos por préstamos requieren autorización expresa del empleado y están limitados por ley.
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
          Guardar {entries.length} Préstamo{entries.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};
