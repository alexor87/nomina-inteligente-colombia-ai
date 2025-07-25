import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_lastname: string;
}

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  employees: Employee[];
  onSuccess: () => void;
}

interface AdjustmentForm {
  employee_id: string;
  concept: string;
  amount: number | '';
  observations: string;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  periodId,
  employees,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [adjustments, setAdjustments] = useState<AdjustmentForm[]>([{
    employee_id: '',
    concept: '',
    amount: '',
    observations: ''
  }]);

  const handleAddAdjustment = () => {
    setAdjustments([...adjustments, {
      employee_id: '',
      concept: '',
      amount: '',
      observations: ''
    }]);
  };

  const handleRemoveAdjustment = (index: number) => {
    if (adjustments.length > 1) {
      setAdjustments(adjustments.filter((_, i) => i !== index));
    }
  };

  const handleAdjustmentChange = (index: number, field: keyof AdjustmentForm, value: any) => {
    const newAdjustments = [...adjustments];
    newAdjustments[index] = { ...newAdjustments[index], [field]: value };
    setAdjustments(newAdjustments);
  };

  const validateForm = () => {
    for (const adjustment of adjustments) {
      if (!adjustment.employee_id || !adjustment.concept || adjustment.amount === '') {
        return false;
      }
      if (typeof adjustment.amount === 'number' && isNaN(adjustment.amount)) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Save each adjustment
      for (const adjustment of adjustments) {
        const { error } = await supabase.rpc('create_payroll_adjustment', {
          p_period_id: periodId,
          p_employee_id: adjustment.employee_id,
          p_concept: adjustment.concept,
          p_amount: Number(adjustment.amount),
          p_observations: adjustment.observations || null,
          p_created_by: (await supabase.auth.getUser()).data.user?.id
        });

        if (error) throw error;
      }

      onSuccess();
      
      // Reset form
      setAdjustments([{
        employee_id: '',
        concept: '',
        amount: '',
        observations: ''
      }]);

    } catch (error) {
      console.error('Error creating adjustment:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el ajuste. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdjustments([{
      employee_id: '',
      concept: '',
      amount: '',
      observations: ''
    }]);
    onClose();
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.employee_id === employeeId);
    return employee ? `${employee.employee_name} ${employee.employee_lastname}` : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Ajuste de Nómina</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Los ajustes registrados no modifican la liquidación original y quedan registrados para auditoría.
          </div>

          {adjustments.map((adjustment, index) => (
            <Card key={index}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Ajuste {index + 1}</CardTitle>
                  {adjustments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAdjustment(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`employee-${index}`}>Empleado *</Label>
                    <Select 
                      value={adjustment.employee_id} 
                      onValueChange={(value) => handleAdjustmentChange(index, 'employee_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.employee_id} value={employee.employee_id}>
                            {employee.employee_name} {employee.employee_lastname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`concept-${index}`}>Concepto *</Label>
                    <Input
                      id={`concept-${index}`}
                      value={adjustment.concept}
                      onChange={(e) => handleAdjustmentChange(index, 'concept', e.target.value)}
                      placeholder="Ej: Bonificación especial, Descuento médico"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`amount-${index}`}>Valor *</Label>
                    <Input
                      id={`amount-${index}`}
                      type="number"
                      step="0.01"
                      value={adjustment.amount}
                      onChange={(e) => handleAdjustmentChange(index, 'amount', e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0.00"
                      className="font-mono"
                    />
                    <div className="text-xs text-muted-foreground">
                      Usa valores negativos para descuentos
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`observations-${index}`}>Observaciones</Label>
                    <Textarea
                      id={`observations-${index}`}
                      value={adjustment.observations}
                      onChange={(e) => handleAdjustmentChange(index, 'observations', e.target.value)}
                      placeholder="Descripción adicional del ajuste..."
                      rows={3}
                    />
                  </div>
                </div>

                {adjustment.employee_id && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm">
                      <strong>Empleado seleccionado:</strong> {getEmployeeName(adjustment.employee_id)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleAddAdjustment}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar otro ajuste
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !validateForm()}>
              {loading ? 'Guardando...' : 'Registrar ajustes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};