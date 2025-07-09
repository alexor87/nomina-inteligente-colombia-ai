
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VacationPeriodsService } from '@/services/VacationPeriodsService';
import { useToast } from '@/hooks/use-toast';

interface VacationPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // ✅ FIXED: Ahora es void, el modal maneja el cierre internamente
  employeeId: string;
}

export const VacationPeriodModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  employeeId 
}: VacationPeriodModalProps) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    observations: ''
  });
  const [isSaving, setIsSaving] = useState(false); // ✅ NUEVO: Estado de guardado
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Calcular días automáticamente cuando ambas fechas están completas
    if (newData.start_date && newData.end_date) {
      const days = VacationPeriodsService.calculateBusinessDays(
        newData.start_date, 
        newData.end_date
      );
      setCalculatedDays(days);
    } else {
      setCalculatedDays(null);
    }
  };

  // ✅ FIXED: Ahora es async y maneja el cierre del modal correctamente
  const validateAndSave = async () => {
    if (!formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Debes completar las fechas de inicio y fin",
        variant: "destructive"
      });
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast({
        title: "Error",
        description: "La fecha de inicio debe ser anterior a la fecha de fin",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const daysCount = VacationPeriodsService.calculateBusinessDays(
        formData.start_date, 
        formData.end_date
      );

      // Validar período antes de guardar
      const validation = await VacationPeriodsService.validatePeriod(
        employeeId,
        formData.start_date,
        formData.end_date,
        daysCount
      );

      if (!validation.isValid) {
        toast({
          title: "Error de validación",
          description: validation.error,
          variant: "destructive"
        });
        return;
      }

      // Guardar el período
      const result = await VacationPeriodsService.createPeriod({
        employee_id: employeeId,
        company_id: 'company_id_placeholder', // Esto se obtendrá del contexto
        start_date: formData.start_date,
        end_date: formData.end_date,
        observations: formData.observations || undefined
      });

      if (result.success) {
        toast({
          title: "Vacaciones confirmadas ✅",
          description: "El período de vacaciones se registró y confirmó automáticamente",
          className: "border-green-200 bg-green-50"
        });
        
        // ✅ FIXED: Solo cerrar modal después de guardado exitoso
        handleClose();
        onSave(); // Notificar al padre para refrescar la lista
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo registrar el período",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al validar el período",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ start_date: '', end_date: '', observations: '' });
    setCalculatedDays(null);
    setIsSaving(false); // ✅ Reset saving state
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Período de Vacaciones</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="start_date">Fecha de Inicio</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              className="mt-1"
              disabled={isSaving} // ✅ Deshabilitar durante guardado
            />
          </div>

          <div>
            <Label htmlFor="end_date">Fecha de Fin</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              className="mt-1"
              disabled={isSaving} // ✅ Deshabilitar durante guardado
            />
          </div>

          {calculatedDays !== null && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">
                Días hábiles calculados: {calculatedDays}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                (Se excluyen fines de semana)
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="observations">Observaciones (opcional)</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              placeholder="Ej: Vacaciones familiares, descanso médico..."
              className="mt-1"
              rows={3}
              disabled={isSaving} // ✅ Deshabilitar durante guardado
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={validateAndSave}
              disabled={isSaving || !formData.start_date || !formData.end_date}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
