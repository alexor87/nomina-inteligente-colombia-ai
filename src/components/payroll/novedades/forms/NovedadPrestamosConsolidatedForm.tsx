
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Préstamos</h3>
      </div>

      {/* Form to add new entry */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Agregar Nuevo Préstamo</h4>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Préstamo</Label>
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
            <Label htmlFor="valor" className="text-gray-700">Valor de la Cuota</Label>
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
              <div className="mt-2 space-y-1">
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  -{formatCurrency(parseFloat(newEntry.valor))}
                </Badge>
                <p className="text-sm text-gray-600">
                  Porcentaje del salario: {((parseFloat(newEntry.valor) / employeeSalary) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="numeroCuotas" className="text-gray-700">Número de Cuotas Restantes (Opcional)</Label>
            <Input
              type="number"
              placeholder="0"
              value={newEntry.numeroCuotas}
              onChange={(e) => setNewEntry(prev => ({ ...prev, numeroCuotas: e.target.value }))}
              min="0"
              step="1"
            />
          </div>

          <div className="p-3 bg-white rounded border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="font-medium">Recordatorio</span>
            </div>
            <p className="text-sm text-blue-600">
              Los descuentos por préstamos requieren autorización expresa del empleado y están limitados por ley.
            </p>
          </div>

          <div>
            <Label htmlFor="observacion" className="text-gray-700">Observaciones</Label>
            <Textarea
              placeholder="Número de préstamo, entidad, fecha de inicio, etc..."
              value={newEntry.observacion}
              onChange={(e) => setNewEntry(prev => ({ ...prev, observacion: e.target.value }))}
              rows={2}
              className="resize-none"
            />
          </div>

          <Button 
            onClick={handleAddEntry}
            disabled={!newEntry.subtipo || !newEntry.valor || parseFloat(newEntry.valor) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Préstamo
          </Button>
        </div>
      </div>

      {/* List of added entries */}
      {entries.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Préstamos Agregados ({entries.length})</h4>
          
          <div className="space-y-2">
            {entries.map((entry) => {
              const typeInfo = getTypeInfo(entry.subtipo);
              const percent = (entry.valor / employeeSalary) * 100;
              const exceedsLimit = typeInfo && percent > typeInfo.maxPercent;

              return (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg bg-white">
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
          </div>

          {/* Total */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center font-semibold">
              <span>Total Préstamos:</span>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-700">
                  {formatCurrency(totalValue)} / mes
                </div>
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
          Guardar {entries.length} Préstamo{entries.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};
