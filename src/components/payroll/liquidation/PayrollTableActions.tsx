
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PayrollEmployee } from '@/types/payroll';
import { 
  Calculator, 
  Download, 
  Send, 
  Edit,
  StickyNote,
  FileText
} from 'lucide-react';
import { EmployeeCalculationModal } from '../modals/EmployeeCalculationModal';
import { VoucherPreviewModal } from '../modals/VoucherPreviewModal';
import { VoucherSendDialog } from '../modals/VoucherSendDialog';
import { EmployeeLiquidationModal } from '../modals/EmployeeLiquidationModal';
import { EmployeeNotesModal } from '../notes/EmployeeNotesModal';
import { NovedadUnifiedModal } from '../novedades/NovedadUnifiedModal';

interface PayrollTableActionsProps {
  employee: PayrollEmployee;
  period: {
    startDate: string;
    endDate: string;
    type: string;
  };
  canEdit: boolean;
  onUpdateEmployee?: (id: string, updates: Partial<PayrollEmployee>) => void;
}

export const PayrollTableActions: React.FC<PayrollTableActionsProps> = ({
  employee,
  period,
  canEdit,
  onUpdateEmployee
}) => {
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);
  const [showVoucherSend, setShowVoucherSend] = useState(false);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showNovedadesModal, setShowNovedadesModal] = useState(false);

  const handleCreateNovedad = async (novedadData: any) => {
    // Aquí implementarías la lógica para crear la novedad
    console.log('Creando novedad:', novedadData);
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

      {/* Modales */}
      <EmployeeCalculationModal
        isOpen={showCalculationModal}
        onClose={() => setShowCalculationModal(false)}
        employee={employee}
      />

      <VoucherPreviewModal
        isOpen={showVoucherPreview}
        onClose={() => setShowVoucherPreview(false)}
        employee={employee}
        period={period}
      />

      <VoucherSendDialog
        isOpen={showVoucherSend}
        onClose={() => setShowVoucherSend(false)}
        employee={employee}
        period={period}
      />

      <EmployeeNotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        employeeId={employee.id}
        employeeName={`${employee.name}`}
        periodId={period.startDate} // Aquí necesitarías el ID real del período
        periodName={`${period.startDate} - ${period.endDate}`}
      />

      <NovedadUnifiedModal
        isOpen={showNovedadesModal}
        onClose={() => setShowNovedadesModal(false)}
        employeeName={employee.name}
        employeeId={employee.id}
        employeeSalary={employee.baseSalary}
        onCreateNovedad={handleCreateNovedad}
      />

      {canEdit && onUpdateEmployee && (
        <EmployeeLiquidationModal
          isOpen={showLiquidationModal}
          onClose={() => setShowLiquidationModal(false)}
          employee={employee}
          onUpdateEmployee={onUpdateEmployee}
          canEdit={canEdit}
        />
      )}
    </>
  );
};
