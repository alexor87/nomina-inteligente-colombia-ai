import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad } from '@/types/novedades-enhanced';
import { Database } from '@/integrations/supabase/types'; // ✅ FIXED: Use Database type instead of PayrollPeriod
import { NovedadForm } from './forms/NovedadForm';

interface NovedadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | undefined;
  employeeSalary: number | undefined;
  periodId: string | undefined;
  onNovedadCreated?: () => void;
  onNovedadUpdated?: () => void;
  onNovedadDeleted?: () => void;
}

export const NovedadDrawer: React.FC<NovedadDrawerProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeSalary,
  periodId,
  onNovedadCreated,
  onNovedadUpdated,
  onNovedadDeleted
}) => {
  const [novedades, setNovedades] = useState<PayrollNovedad[]>([]);
  const [editingNovedad, setEditingNovedad] = useState<PayrollNovedad | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (employeeId && periodId) {
      fetchNovedades();
    }
  }, [employeeId, periodId, isOpen]);

  const fetchNovedades = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching novedades:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las novedades",
          variant: "destructive",
        });
      }

      if (data) {
        const typedData: PayrollNovedad[] = data as PayrollNovedad[];
        setNovedades(typedData);
      }
    } catch (error) {
      console.error('Unexpected error fetching novedades:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar las novedades",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (novedad: PayrollNovedad) => {
    setEditingNovedad(novedad);
  };

  const handleSaveNovedad = async (novedadData: any) => {
    if (!employeeId || !periodId) {
      toast({
        title: "Error",
        description: "Faltan datos del empleado o período",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('payroll_novedades')
        .upsert([{
          id: editingNovedad?.id,
          empleado_id: employeeId,
          periodo_id: periodId,
          tipo_novedad: editingNovedad?.tipo_novedad,
          valor: Number(novedadData.valor),
          observacion: novedadData.observacion,
        }], { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error saving novedad:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar la novedad",
          variant: "destructive",
        });
      }

      if (data) {
        fetchNovedades();
        setEditingNovedad(null);
        toast({
          title: "Novedad guardada",
          description: "La novedad se ha guardado correctamente",
        });
        onNovedadUpdated?.();
      }
    } catch (error) {
      console.error('Unexpected error saving novedad:', error);
      toast({
        title: "Error",
        description: "Error inesperado al guardar la novedad",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId);

      if (error) {
        console.error('Error deleting novedad:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la novedad",
          variant: "destructive",
        });
      } else {
        fetchNovedades();
        toast({
          title: "Novedad eliminada",
          description: "La novedad se ha eliminado correctamente",
        });
        onNovedadDeleted?.();
      }
    } catch (error) {
      console.error('Unexpected error deleting novedad:', error);
      toast({
        title: "Error",
        description: "Error inesperado al eliminar la novedad",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNovedadTypeLabel = (tipo: Database['public']['Enums']['novedad_type']): string => {
    const labels: Record<Database['public']['Enums']['novedad_type'], string> = {
      horas_extra: 'Horas Extra',
      recargo_nocturno: 'Recargo Nocturno',
      vacaciones: 'Vacaciones',
      licencia_remunerada: 'Licencia Remunerada',
      licencia_no_remunerada: 'Licencia No Remunerada', // ✅ FIXED: Add missing label
      incapacidad: 'Incapacidad',
      bonificacion: 'Bonificación',
      comision: 'Comisión',
      prima: 'Prima',
      otros_ingresos: 'Otros Ingresos',
      salud: 'Descuento Salud',
      pension: 'Descuento Pensión',
      libranza: 'Libranza',
      descuento_voluntario: 'Descuento Voluntario',
      multa: 'Multa',
      retencion_fuente: 'Retención en la Fuente'
    };
    return labels[tipo] || tipo;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Novedades del Empleado</SheetTitle>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          {novedades.length === 0 ? (
            <div className="text-center text-gray-500">
              No hay novedades registradas para este empleado en este período.
            </div>
          ) : (
            novedades.map((novedad) => (
              <div key={novedad.id} className="border rounded-md p-4">
                <div className="font-semibold">{getNovedadTypeLabel(novedad.tipo_novedad)}</div>
                <div className="text-sm text-gray-500">Valor: {novedad.valor}</div>
                <div className="text-sm text-gray-500">Observación: {novedad.observacion}</div>
                <div className="flex justify-end mt-2 space-x-2">
                  <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(novedad)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteNovedad(novedad.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {editingNovedad && (
          <NovedadForm
            initialData={editingNovedad}
            employeeSalary={employeeSalary}
            onSave={handleSaveNovedad} // ✅ FIXED: Use onSave instead of onSubmit
            onCancel={() => setEditingNovedad(null)}
            isLoading={isSubmitting}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
