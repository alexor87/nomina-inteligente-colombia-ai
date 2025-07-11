
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VacationAbsence, VacationAbsenceFormData } from '@/types/vacations';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Save, X } from 'lucide-react';

interface VacationAbsenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VacationAbsenceFormData) => Promise<void>;
  editingVacation?: VacationAbsence | null;
  isSubmitting?: boolean;
}

export const VacationAbsenceForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingVacation,
  isSubmitting = false
}: VacationAbsenceFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<VacationAbsenceFormData>({
    employee_id: '',
    start_date: '',
    end_date: '',
    observations: ''
  });
  const [calculatedDays, setCalculatedDays] = useState<number>(0);

  // Obtener lista de empleados activos con configuración optimizada
  const { data: employees = [] } = useQuery({
    queryKey: ['vacation-form-employees', user?.id],
    queryFn: async () => {
      console.log('🔍 Fetching employees for vacation form...');
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cedula')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('❌ Error fetching employees:', error);
        throw error;
      }

      console.log('✅ Employees fetched for form:', data?.length || 0);
      
      // Filtrar duplicados por ID como medida de seguridad
      const uniqueEmployees = data?.filter((employee, index, array) => 
        array.findIndex(e => e.id === employee.id) === index
      ) || [];

      return uniqueEmployees;
    },
    enabled: isOpen && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
    refetchOnWindowFocus: false,
  });

  // Cargar datos de edición
  useEffect(() => {
    if (editingVacation) {
      setFormData({
        employee_id: editingVacation.employee_id,
        start_date: editingVacation.start_date,
        end_date: editingVacation.end_date,
        observations: editingVacation.observations || ''
      });
    } else {
      setFormData({
        employee_id: '',
        start_date: '',
        end_date: '',
        observations: ''
      });
    }
  }, [editingVacation, isOpen]);

  // Calcular días automáticamente
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCalculatedDays(diffDays);
      } else {
        setCalculatedDays(0);
      }
    } else {
      setCalculatedDays(0);
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.start_date || !formData.end_date) {
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <CustomModal isOpen={isOpen} onClose={handleClose} className="max-w-2xl">
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {editingVacation ? 'Editar Ausencia' : 'Nueva Ausencia'}
        </CustomModalTitle>
      </CustomModalHeader>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        {/* Empleado */}
        <div className="space-y-2">
          <Label htmlFor="employee_id">Empleado *</Label>
          <Select
            value={formData.employee_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar empleado..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={`employee-${employee.id}`} value={employee.id}>
                  {employee.nombre} {employee.apellido} - {employee.cedula}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Fecha de Inicio *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">Fecha de Fin *</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {/* Días calculados */}
        {calculatedDays > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <CalendarDays className="h-4 w-4" />
              <span className="font-medium">Días calculados: {calculatedDays}</span>
            </div>
          </div>
        )}

        {/* Observaciones */}
        <div className="space-y-2">
          <Label htmlFor="observations">Observaciones</Label>
          <Textarea
            id="observations"
            placeholder="Observaciones adicionales..."
            value={formData.observations}
            onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.employee_id || !formData.start_date || !formData.end_date}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Guardando...' : editingVacation ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </CustomModal>
  );
};
