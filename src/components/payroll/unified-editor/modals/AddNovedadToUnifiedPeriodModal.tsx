import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUnifiedPeriodEdit } from '@/contexts/UnifiedPeriodEditContext';

interface AddNovedadToUnifiedPeriodModalProps {
  open: boolean;
  onClose: () => void;
  preselectedEmployeeId?: string;
}

export const AddNovedadToUnifiedPeriodModal: React.FC<AddNovedadToUnifiedPeriodModalProps> = ({
  open,
  onClose,
  preselectedEmployeeId
}) => {
  const { editState, addNovedad } = useUnifiedPeriodEdit();
  const [formData, setFormData] = useState({
    employee_id: preselectedEmployeeId || '',
    tipo_novedad: '',
    subtipo: '',
    valor: 0,
    dias: 0,
    observacion: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addNovedad({
      employee_id: formData.employee_id,
      tipo_novedad: formData.tipo_novedad,
      subtipo: formData.subtipo || undefined,
      valor: formData.valor,
      dias: formData.dias || undefined,
      observacion: formData.observacion || undefined
    });

    onClose();
    setFormData({
      employee_id: preselectedEmployeeId || '',
      tipo_novedad: '',
      subtipo: '',
      valor: 0,
      dias: 0,
      observacion: ''
    });
  };

  const activeEmployees = editState.employees.filter(emp => !emp.isRemoved);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Novedad</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Empleado</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nombre} {emp.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Novedad</Label>
            <Select
              value={formData.tipo_novedad}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_novedad: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horas_extra">Horas Extra</SelectItem>
                <SelectItem value="bonificacion">Bonificación</SelectItem>
                <SelectItem value="otros_ingresos">Otros Ingresos</SelectItem>
                <SelectItem value="descuento_voluntario">Descuento</SelectItem>
                <SelectItem value="libranza">Libranza</SelectItem>
                <SelectItem value="incapacidad">Incapacidad</SelectItem>
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                value={formData.valor}
                onChange={(e) => setFormData(prev => ({ ...prev, valor: Number(e.target.value) }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias">Días (opcional)</Label>
              <Input
                id="dias"
                type="number"
                value={formData.dias}
                onChange={(e) => setFormData(prev => ({ ...prev, dias: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtipo">Subtipo (opcional)</Label>
            <Input
              id="subtipo"
              value={formData.subtipo}
              onChange={(e) => setFormData(prev => ({ ...prev, subtipo: e.target.value }))}
              placeholder="Especificar subtipo si aplica"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacion">Observación</Label>
            <Textarea
              id="observacion"
              value={formData.observacion}
              onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
              placeholder="Descripción de la novedad..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Agregar Novedad
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};