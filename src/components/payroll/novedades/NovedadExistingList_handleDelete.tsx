// This file contains the enhanced delete handler logic
// It will be imported into NovedadExistingList.tsx

import { DisplayNovedad } from '@/types/vacation-integration';

export const createDeleteHandler = (
  deleteNovedad: (id: string) => Promise<{ success: boolean; error?: any }>,
  addPendingDeletion: (employeeId: string, employeeName: string, originalNovedad: any) => void,
  onEmployeeNovedadesChange: ((employeeId: string) => Promise<void>) | undefined,
  onPendingAdjustmentChange: (() => void) | undefined,
  setIntegratedData: React.Dispatch<React.SetStateAction<DisplayNovedad[]>>,
  toast: any,
  employeeId: string,
  employeeName: string
) => {
  return async (createPendingAdjustment: boolean, novedad: DisplayNovedad) => {
    try {
      if (createPendingAdjustment) {
        // Period is closed - create pending adjustment for deletion
        console.log('🔄 Creating pending deletion adjustment for closed period:', novedad.id);
        
        addPendingDeletion(employeeId, employeeName, {
          id: novedad.id,
          tipo_novedad: novedad.tipo_novedad,
          subtipo: novedad.subtipo,
          valor: novedad.valor,
          dias: novedad.dias,
          fecha_inicio: novedad.fecha_inicio,
          fecha_fin: novedad.fecha_fin,
          constitutivo_salario: false // Default for most novedades
        });

        // Trigger pending adjustment change callback immediately
        if (onPendingAdjustmentChange) {
          onPendingAdjustmentChange();
        }

        toast({
          title: "Ajuste de eliminación pendiente",
          description: `Se creó un ajuste para eliminar ${novedad.badgeLabel} en la próxima re-liquidación`,
          className: "border-orange-200 bg-orange-50"
        });
      } else {
        // Period is open - delete directly
        console.log('🗑️ Deleting novedad directly (open period):', novedad.id);
        
        const result = await deleteNovedad(novedad.id);
        if (result.success) {
          setIntegratedData(prev => prev.filter(n => n.id !== novedad.id));
          
          if (onEmployeeNovedadesChange) {
            await onEmployeeNovedadesChange(employeeId);
          }
          
          toast({
            title: "Novedad eliminada",
            description: "La novedad se ha eliminado correctamente",
          });
        } else {
          throw result.error || new Error('Failed to delete novedad');
        }
      }
    } catch (error) {
      console.error('❌ Error in delete handler:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la eliminación",
        variant: "destructive",
      });
    }
  };
};