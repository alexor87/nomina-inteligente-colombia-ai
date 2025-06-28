
import { Button } from '@/components/ui/button';
import { Edit, Clock } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { useSmartPeriodEdit } from '@/hooks/useSmartPeriodEdit';

interface SmartEditButtonProps {
  period: PayrollHistoryPeriod;
  canUserEdit?: boolean;
}

export const SmartEditButton = ({ period, canUserEdit = false }: SmartEditButtonProps) => {
  const { handleSmartEdit, isProcessing } = useSmartPeriodEdit();

  if (!canUserEdit) return null;

  // No mostrar si está reportado a DIAN
  if (period.reportedToDian) return null;

  const isReopened = period.reopenedBy !== null && period.reopenedBy !== undefined;
  const canEdit = period.status === 'cerrado' || period.status === 'con_errores' || isReopened;

  if (!canEdit) return null;

  const buttonText = isReopened ? 'Continuar' : 'Editar';
  const buttonColor = isReopened ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <Button 
      size="sm"
      onClick={() => handleSmartEdit(period)}
      disabled={isProcessing}
      className={`${buttonColor} text-white transition-all duration-200 hover:scale-105`}
    >
      {isProcessing ? (
        <>
          <Clock className="h-4 w-4 mr-1 animate-spin" />
          Abriendo...
        </>
      ) : (
        <>
          <Edit className="h-4 w-4 mr-1" />
          {buttonText}
        </>
      )}
    </Button>
  );
};
