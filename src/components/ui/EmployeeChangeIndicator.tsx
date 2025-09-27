import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertTriangle, Loader2, DollarSign, Calendar, User } from "lucide-react";
import type { PeriodEmployee } from '@/contexts/UnifiedPeriodEditContext';

interface EmployeeChangeIndicatorProps {
  employee: PeriodEmployee;
  hasChanges: boolean;
  isRecalculating: boolean;
  validationErrors?: number;
  validationWarnings?: number;
  originalNetPay?: number;
  newNetPay?: number;
}

export const EmployeeChangeIndicator = ({
  employee,
  hasChanges,
  isRecalculating,
  validationErrors = 0,
  validationWarnings = 0,
  originalNetPay,
  newNetPay
}: EmployeeChangeIndicatorProps) => {
  
  const getChangeType = (): 'addition' | 'removal' | 'modification' | 'none' => {
    if (employee.isNew) return 'addition';
    if (employee.isRemoved) return 'removal';
    if (hasChanges) return 'modification';
    return 'none';
  };

  const getIndicatorColor = () => {
    if (validationErrors > 0) return 'destructive';
    if (validationWarnings > 0) return 'secondary'; // Use 'secondary' instead of 'warning'
    if (isRecalculating) return 'secondary';
    if (hasChanges) return 'default';
    return 'outline';
  };

  const getIndicatorIcon = () => {
    if (isRecalculating) return <Loader2 className="h-3 w-3 animate-spin" />;
    if (validationErrors > 0) return <AlertTriangle className="h-3 w-3" />;
    if (validationWarnings > 0) return <AlertTriangle className="h-3 w-3" />;
    if (hasChanges) return <CheckCircle className="h-3 w-3" />;
    return null;
  };

  const getTooltipContent = () => {
    const changeType = getChangeType();
    const messages: string[] = [];

    switch (changeType) {
      case 'addition':
        messages.push('🆕 Empleado agregado al período');
        break;
      case 'removal':
        messages.push('🗑️ Empleado removido del período');
        break;
      case 'modification':
        messages.push('📝 Empleado modificado');
        break;
      default:
        messages.push('✅ Sin cambios');
    }

    if (validationErrors > 0) {
      messages.push(`❌ ${validationErrors} error${validationErrors > 1 ? 'es' : ''} de validación`);
    }

    if (validationWarnings > 0) {
      messages.push(`⚠️ ${validationWarnings} advertencia${validationWarnings > 1 ? 's' : ''}`);
    }

    if (originalNetPay && newNetPay && originalNetPay !== newNetPay) {
      const diff = newNetPay - originalNetPay;
      const percentage = ((diff / originalNetPay) * 100).toFixed(1);
      const direction = diff > 0 ? '📈' : '📉';
      messages.push(`${direction} Cambio: ${diff.toLocaleString()} (${percentage}%)`);
    }

    // Note: Novedades are handled separately in the unified editor context
    if (hasChanges) {
      messages.push('📋 Cambios en el empleado');
    }

    return messages.join('\n');
  };

  const getBadgeText = () => {
    const changeType = getChangeType();
    
    if (isRecalculating) return 'Calculando...';
    if (validationErrors > 0) return `${validationErrors} Error${validationErrors > 1 ? 'es' : ''}`;
    if (validationWarnings > 0) return `${validationWarnings} Advertencia${validationWarnings > 1 ? 's' : ''}`;
    
    switch (changeType) {
      case 'addition': return 'Nuevo';
      case 'removal': return 'Removido';
      case 'modification': return 'Modificado';
      default: return 'Sin cambios';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Badge 
              variant={getIndicatorColor()}
              className="text-xs flex items-center gap-1"
            >
              {getIndicatorIcon()}
              {getBadgeText()}
            </Badge>
            
            {/* Additional indicators */}
            {hasChanges && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Cambios
              </Badge>
            )}
            
            {originalNetPay && newNetPay && originalNetPay !== newNetPay && (
              <Badge 
                variant={newNetPay > originalNetPay ? "default" : "secondary"}
                className="text-xs"
              >
                <DollarSign className="h-3 w-3 mr-1" />
                {((newNetPay - originalNetPay) / originalNetPay * 100).toFixed(1)}%
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line text-sm">
            {getTooltipContent()}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};