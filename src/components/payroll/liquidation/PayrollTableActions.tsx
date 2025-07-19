
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PayrollEmployee } from '@/types/payroll';
import { 
  Calculator, 
  Download, 
  Send, 
  Edit,
  StickyNote,
  FileText,
  Calendar
} from 'lucide-react';
import { EmployeeCalculationModal } from '../modals/EmployeeCalculationModal';
import { VoucherPreviewModal } from '../modals/VoucherPreviewModal';
import { VoucherSendDialog } from '../modals/VoucherSendDialog';
import { EmployeeLiquidationModal } from '../modals/EmployeeLiquidationModal';
import { EmployeeNotesModal } from '../notes/EmployeeNotesModal';
import { NovedadUnifiedModal } from '../novedades/NovedadUnifiedModal';
import { useVacationIntegration } from '@/hooks/useVacationIntegration';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PayrollTableActionsProps {
  employee: PayrollEmployee;
  period: {
    startDate: string;
    endDate: string;
    type: string;
  };
  canEdit: boolean;
  onUpdateEmployee?: (id: string, updates: Partial<PayrollEmployee>) => void;
  periodId?: string;
}

export const PayrollTableActions: React.FC<PayrollTableActionsProps> = ({
  employee,
  period,
  canEdit,
  onUpdateEmployee,
  periodId = period.startDate // fallback to startDate if periodId not provided
}) => {
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);
  const [showVoucherSend, setShowVoucherSend] = useState(false);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showNovedadesModal, setShowNovedadesModal] = useState(false);

  const { processEmployeePendingVacations, isProcessing } = useVacationIntegration();
  const { toast } = useToast();

  const handleCreateNovedad = async (novedadData: any) => {
    console.log('Creando novedad:', novedadData);
    // TODO: Implementar lógica para crear la novedad
  };

  // ✅ NUEVA: Función para procesar licencias pendientes del empleado
  const handleProcessPendingVacations = async () => {
    try {
      // Obtener company_id del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Usuario no autenticado",
          variant: "destructive"
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Error",
          description: "No se pudo determinar la empresa",
          variant: "destructive"
        });
        return;
      }

      console.log('🔄 Procesando licencias pendientes para:', employee.name);
      
      await processEmployeePendingVacations(
        employee.id,
        periodId,
        profile.company_id
      );

      // Refrescar datos del empleado si hay callback
      if (onUpdateEmployee) {
        onUpdateEmployee(employee.id, {});
      }

    } catch (error) {
      console.error('Error procesando licencias:', error);
      toast({
        title: "Error",
        description: "No se pudieron procesar las licencias",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCalculationModal(true)}
          title="Ver cálculos detallados"
        >
          <Calculator className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVoucherPreview(true)}
          title="Vista previa del comprobante"
        >
          <Download className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVoucherSend(true)}
          title="Enviar comprobante por email"
        >
          <Send className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNotesModal(true)}
          title="Ver/Agregar notas del empleado"
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
          <StickyNote className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNovedadesModal(true)}
          title="Agregar novedad"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <FileText className="h-4 w-4" />
        </Button>

        {/* ✅ NUEVO: Botón para procesar licencias pendientes */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleProcessPendingVacations}
          disabled={isProcessing}
          title="Procesar licencias pendientes"
          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        >
          <Calendar className="h-4 w-4" />
        </Button>

        {canEdit && onUpdateEmployee && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLiquidationModal(true)}
            title="Editar liquidación"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Modal de Cálculos */}
      <EmployeeCalculationModal
        isOpen={showCalculationModal}
        onClose={() => setShowCalculationModal(false)}
        employee={employee}
      />

      {/* Modal de Vista Previa del Comprobante */}
      <VoucherPreviewModal
        isOpen={showVoucherPreview}
        onClose={() => setShowVoucherPreview(false)}
        employee={employee}
        period={period}
      />

      {/* Dialog de Envío del Comprobante */}
      <VoucherSendDialog
        isOpen={showVoucherSend}
        onClose={() => setShowVoucherSend(false)}
        employee={employee}
        period={period}
      />

      {/* Modal de Notas del Empleado */}
      <EmployeeNotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        employeeId={employee.id}
        employeeName={employee.name}
        periodId={periodId}
        periodName={`${period.startDate} - ${period.endDate}`}
      />

      {/* Modal de Novedades */}
      <NovedadUnifiedModal
        open={showNovedadesModal}
        setOpen={setShowNovedadesModal}
        employeeId={employee.id}
        employeeSalary={employee.baseSalary}
        periodId={periodId}
        onSubmit={handleCreateNovedad}
        selectedNovedadType={null}
        onClose={() => {
          setShowNovedadesModal(false);
        }}
      />

      {/* Modal de Edición de Liquidación */}
      {canEdit && onUpdateEmployee && (
        <EmployeeLiquidationModal
          isOpen={showLiquidationModal}
          onClose={() => setShowLiquidationModal(false)}
          employee={employee}
          periodId={periodId}
          onUpdateEmployee={onUpdateEmployee}
          canEdit={canEdit}
        />
      )}
    </>
  );
};
