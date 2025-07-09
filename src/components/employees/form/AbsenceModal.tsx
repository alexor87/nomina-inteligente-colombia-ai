
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  employeeId: string;
  companyId: string;
}

export const AbsenceModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  employeeId,
  companyId
}: AbsenceModalProps) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    absence_type: '',
    observations: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const { toast } = useToast();

  // Tipos de ausencias disponibles
  const absenceTypes = [
    { value: 'licencia_remunerada', label: 'Licencia Remunerada' },
    { value: 'licencia_no_remunerada', label: 'Licencia No Remunerada' },
    { value: 'incapacidad_eps', label: 'Incapacidad EPS' },
    { value: 'incapacidad_arl', label: 'Incapacidad ARL' },
    { value: 'licencia_maternidad', label: 'Licencia de Maternidad' },
    { value: 'licencia_paternidad', label: 'Licencia de Paternidad' },
    { value: 'calamidad_domestica', label: 'Calamidad Doméstica' }
  ];

  const calculateBusinessDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 0 = Domingo, 6 = Sábado
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Calcular días cuando ambas fechas están completas
    if (newData.start_date && newData.end_date) {
      const days = calculateBusinessDays(newData.start_date, newData.end_date);
      setCalculatedDays(days);
    } else {
      setCalculatedDays(null);
    }
  };

  const validateAndSave = async () => {
    if (!formData.start_date || !formData.end_date || !formData.absence_type) {
      toast({
        title: "Error",
        description: "Debes completar las fechas y tipo de ausencia",
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
      const daysCount = calculateBusinessDays(formData.start_date, formData.end_date);

      // TODO: Obtener período activo para asociar la ausencia
      // Por ahora usaremos un período dummy, pero esto debe mejorarse
      const { data: currentPeriod } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', companyId)
        .eq('estado', 'en_proceso')
        .single();

      if (!currentPeriod) {
        toast({
          title: "Error",
          description: "No hay un período de nómina activo. Contacta al administrador.",
          variant: "destructive"
        });
        return;
      }

      // Crear novedad de ausencia directamente en payroll_novedades
      const { error } = await supabase
        .from('payroll_novedades')
        .insert({
          company_id: companyId,
          empleado_id: employeeId,
          periodo_id: currentPeriod.id,
          tipo_novedad: 'ausencia',
          subtipo: formData.absence_type,
          fecha_inicio: formData.start_date,
          fecha_fin: formData.end_date,
          dias: daysCount,
          valor: 0, // Valor se calculará en liquidación según tipo
          observacion: formData.observations || `${absenceTypes.find(t => t.value === formData.absence_type)?.label} registrada desde perfil empleado`,
          creado_por: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Ausencia registrada ✅",
        description: `Se registró ${absenceTypes.find(t => t.value === formData.absence_type)?.label.toLowerCase()} por ${daysCount} días`,
        className: "border-green-200 bg-green-50"
      });
      
      handleClose();
      onSave();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error inesperado al registrar la ausencia",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ start_date: '', end_date: '', absence_type: '', observations: '' });
    setCalculatedDays(null);
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Ausencia</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="absence_type">Tipo de Ausencia</Label>
            <Select 
              value={formData.absence_type} 
              onValueChange={(value) => handleInputChange('absence_type', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona el tipo de ausencia" />
              </SelectTrigger>
              <SelectContent>
                {absenceTypes.map((type) => (
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
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-800">
                Días hábiles calculados: {calculatedDays}
              </p>
              <p className="text-xs text-orange-600 mt-1">
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
              placeholder="Ej: Certificado médico adjunto, motivo específico..."
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
              disabled={isSaving || !formData.start_date || !formData.end_date || !formData.absence_type}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registrando...
                </>
              ) : (
                'Registrar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
