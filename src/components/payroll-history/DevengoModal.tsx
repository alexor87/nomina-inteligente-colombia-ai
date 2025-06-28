
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNovedades } from '@/hooks/useNovedades';
import { CreateNovedadData } from '@/types/novedades';
import { formatCurrency } from '@/lib/utils';
import { X, Plus, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';

interface DevengoModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeSalary: number;
  payrollId: string;
  periodId: string;
  onNovedadCreated?: (employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => void;
}

const tiposNovedadDevengados = [
  { value: 'horas_extra', label: 'Horas Extra' },
  { value: 'recargo_nocturno', label: 'Recargo Nocturno' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'bonificacion', label: 'Bonificación' },
  { value: 'comision', label: 'Comisión' },
  { value: 'prima', label: 'Prima' },
  { value: 'otros_ingresos', label: 'Otros Ingresos' }
];

const tiposNovedadDeducciones = [
  { value: 'descuento_prestamo', label: 'Descuento Préstamo' },
  { value: 'fondo_empleados', label: 'Fondo de Empleados' },
  { value: 'otros_descuentos', label: 'Otros Descuentos' }
];

export const DevengoModal: React.FC<DevengoModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeSalary,
  payrollId,
  periodId,
  onNovedadCreated
}) => {
  const { toast } = useToast();
  const { 
    createNovedad, 
    getEmployeeNovedades, 
    loadNovedadesForEmployee,
    deleteNovedad,
    isLoading 
  } = useNovedades(periodId, async () => {
    // Callback when novedad changes - recalculate employee totals
    console.log('🔄 Novedad changed, recalculating employee totals');
    try {
      await PayrollHistoryService.recalculateEmployeeTotalsWithNovedades(employeeId, periodId);
      console.log('✅ Employee totals recalculated successfully');
      
      // Trigger parent component refresh
      if (onNovedadCreated) {
        // Get the updated totals to pass to parent
        const novedades = getEmployeeNovedades(employeeId);
        const totalDevengados = novedades
          .filter(n => tiposNovedadDevengados.some(t => t.value === n.tipo_novedad))
          .reduce((sum, n) => sum + n.valor, 0);
        
        onNovedadCreated(employeeId, totalDevengados, 'devengado');
      }
    } catch (error) {
      console.error('❌ Error recalculating employee totals:', error);
    }
  });

  const [formData, setFormData] = useState({
    tipo_novedad: '',
    valor: '',
    horas: '',
    dias: '',
    observacion: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  // Load novedades when modal opens
  useEffect(() => {
    if (isOpen && employeeId && periodId) {
      console.log('🔍 Loading novedades for employee in modal:', employeeId, 'period:', periodId);
      loadNovedadesForEmployee(employeeId);
    }
  }, [isOpen, employeeId, periodId, loadNovedadesForEmployee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo_novedad || !formData.valor) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa tipo de novedad y valor",
        variant: "destructive"
      });
      return;
    }

    try {
      const novedadData: CreateNovedadData = {
        empleado_id: employeeId,
        periodo_id: periodId,
        tipo_novedad: formData.tipo_novedad as any,
        valor: parseFloat(formData.valor),
        horas: formData.horas ? parseFloat(formData.horas) : undefined,
        dias: formData.dias ? parseInt(formData.dias) : undefined,
        observacion: formData.observacion || undefined,
        fecha_inicio: formData.fecha_inicio || undefined,
        fecha_fin: formData.fecha_fin || undefined
      };

      console.log('📝 Creating novedad with data:', novedadData);
      await createNovedad(novedadData);
      
      // Reset form
      setFormData({
        tipo_novedad: '',
        valor: '',
        horas: '',
        dias: '',
        observacion: '',
        fecha_inicio: '',
        fecha_fin: ''
      });

      toast({
        title: "Novedad creada",
        description: "La novedad se ha registrado correctamente y los totales se actualizarán automáticamente",
        duration: 3000
      });

    } catch (error) {
      console.error('❌ Error creating novedad:', error);
      toast({
        title: "Error al crear novedad",
        description: "No se pudo crear la novedad. Intenta nuevamente.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    try {
      await deleteNovedad(novedadId, employeeId);
      toast({
        title: "Novedad eliminada",
        description: "La novedad se ha eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la novedad",
        variant: "destructive"
      });
    }
  };

  const novedades = getEmployeeNovedades(employeeId);
  console.log('📊 Novedades for modal display:', novedades);

  const getTipoNovedadLabel = (tipo: string) => {
    const allTypes = [...tiposNovedadDevengados, ...tiposNovedadDeducciones];
    return allTypes.find(t => t.value === tipo)?.label || tipo;
  };

  const isDevengado = (tipo: string) => {
    return tiposNovedadDevengados.some(t => t.value === tipo);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>Gestionar Novedades - {employeeName}</span>
              <div className="text-sm text-gray-500 font-normal mt-1">
                Salario Base: {formatCurrency(employeeSalary)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario para nueva novedad */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Nueva Novedad
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo_novedad">Tipo de Novedad *</Label>
                <Select 
                  value={formData.tipo_novedad} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_novedad: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs font-medium text-green-600">DEVENGADOS</div>
                    {tiposNovedadDevengados.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-medium text-red-600 border-t mt-1">DEDUCCIONES</div>
                    {tiposNovedadDeducciones.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horas">Horas</Label>
                  <Input
                    id="horas"
                    type="number"
                    step="0.1"
                    value={formData.horas}
                    onChange={(e) => setFormData(prev => ({ ...prev, horas: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="dias">Días</Label>
                  <Input
                    id="dias"
                    type="number"
                    value={formData.dias}
                    onChange={(e) => setFormData(prev => ({ ...prev, dias: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_fin">Fecha Fin</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_fin: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="observacion">Observaciones</Label>
                <Textarea
                  id="observacion"
                  value={formData.observacion}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Guardando...' : 'Guardar Novedad'}
              </Button>
            </form>
          </div>

          {/* Lista de novedades existentes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Novedades Registradas ({novedades.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {novedades.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No hay novedades registradas</p>
                  <p className="text-sm">Crea la primera novedad usando el formulario</p>
                </div>
              ) : (
                novedades.map((novedad) => (
                  <div key={novedad.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={isDevengado(novedad.tipo_novedad) ? "default" : "destructive"}
                          className={isDevengado(novedad.tipo_novedad) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {getTipoNovedadLabel(novedad.tipo_novedad)}
                        </Badge>
                        <span className="font-semibold">
                          {formatCurrency(novedad.valor)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNovedad(novedad.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {(novedad.horas || novedad.dias) && (
                      <div className="text-sm text-gray-600">
                        {novedad.horas && <span>Horas: {novedad.horas} </span>}
                        {novedad.dias && <span>Días: {novedad.dias}</span>}
                      </div>
                    )}
                    
                    {novedad.observacion && (
                      <p className="text-sm text-gray-600">{novedad.observacion}</p>
                    )}
                    
                    <div className="text-xs text-gray-400">
                      {new Date(novedad.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {novedades.length > 0 && (
              <div className="border-t pt-4">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Total Devengados:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(
                        novedades
                          .filter(n => isDevengado(n.tipo_novedad))
                          .reduce((sum, n) => sum + n.valor, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Deducciones:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(
                        novedades
                          .filter(n => !isDevengado(n.tipo_novedad))
                          .reduce((sum, n) => sum + n.valor, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
