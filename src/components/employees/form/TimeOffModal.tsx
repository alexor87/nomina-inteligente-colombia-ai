
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeOffService } from '@/services/TimeOffService';
import { useToast } from '@/hooks/use-toast';

interface TimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  employeeId: string;
}

export const TimeOffModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  employeeId
}: TimeOffModalProps) => {
  const [formData, setFormData] = useState({
    type: '',
    start_date: '',
    end_date: '',
    observations: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const { toast } = useToast();

  const timeOffTypes = [
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'licencia_remunerada', label: 'Licencia Remunerada' },
    { value: 'licencia_no_remunerada', label: 'Licencia No Remunerada' },
    { value: 'ausencia', label: 'Ausencia' },
    { value: 'incapacidad', label: 'Incapacidad' }
  ];

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Calcular días cuando ambas fechas están completas
    if (newData.start_date && newData.end_date) {
      const days = TimeOffService.calculateBusinessDays(newData.start_date, newData.end_date);
      setCalculatedDays(days);
    } else {
      setCalculatedDays(null);
    }
  };

  const validateAndSave = async () => {
    if (!formData.type || !formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Debes completar todos los campos obligatorios",
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
      const result = await TimeOffService.createTimeOff({
        employee_id: employeeId,
        type: formData.type as any,
        start_date: formData.start_date,
        end_date: formData.end_date,
        observations: formData.observations || undefined
      });

      if (result.success) {
        toast({
          title: "Registro creado ✅",
          description: `${TimeOffService.getTypeLabel(formData.type)} registrado por ${calculatedDays} días`,
          className: "border-green-200 bg-green-50"
        });
        
        handleClose();
        onSave();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo crear el registro",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error inesperado al crear el registro",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ type: '', start_date: '', end_date: '', observations: '' });
    setCalculatedDays(null);
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Tiempo Libre</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleInputChange('type', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {timeOffTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start_date">Fecha de Inicio</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              className="mt-1"
              disabled={isSaving}
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
              disabled={isSaving}
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
              placeholder="Ej: Vacaciones familiares, certificado médico..."
              className="mt-1"
              rows={3}
              disabled={isSaving}
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
              disabled={isSaving || !formData.type || !formData.start_date || !formData.end_date}
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
