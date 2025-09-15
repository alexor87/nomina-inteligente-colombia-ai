import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; 
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus, 
  Edit3, 
  User,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { EmployeeVersionChange, PeriodVersionComparisonService } from '@/services/PeriodVersionComparisonService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EmployeeChangeCardProps {
  change: EmployeeVersionChange;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const EmployeeChangeCard: React.FC<EmployeeChangeCardProps> = ({
  change,
  isExpanded = false,
  onToggleExpanded
}) => {
  const getChangeIcon = () => {
    switch (change.changeType) {
      case 'employee_added':
        return <Plus className="h-4 w-4 text-success" />;
      case 'employee_removed':
        return <Minus className="h-4 w-4 text-destructive" />;
      case 'values_modified':
        return <Edit3 className="h-4 w-4 text-primary" />;
      case 'novedades_added':
        return <Plus className="h-4 w-4 text-warning" />;
      case 'novedades_removed':
        return <Minus className="h-4 w-4 text-secondary" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChangeDescription = () => {
    switch (change.changeType) {
      case 'employee_added':
        return 'Empleado agregado a la nómina';
      case 'employee_removed':
        return 'Empleado retirado de la nómina';
      case 'values_modified':
        return 'Valores de nómina modificados';
      case 'novedades_added':
        return 'Se agregaron novedades';
      case 'novedades_removed':
        return 'Se eliminaron novedades';
      default:
        return 'Sin cambios';
    }
  };

  const getImpactSummary = () => {
    const amount = Math.abs(change.impactAmount);
    const isPositive = change.impactAmount >= 0;
    
    if (amount === 0) return 'Sin impacto económico';
    
    return isPositive 
      ? `Incremento de ${PeriodVersionComparisonService.formatCurrency(amount)}`
      : `Reducción de ${PeriodVersionComparisonService.formatCurrency(amount)}`;
  };

  const hasDetails = change.fieldChanges.length > 0 || change.novedadesChanges.length > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          {/* Employee Info */}
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {change.employeeName?.trim() 
                  ? change.employeeName.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
                  : 'EM'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div>
                <h4 className="font-medium text-foreground">{change.employeeName}</h4>
                <p className="text-sm text-muted-foreground">Cédula: {change.cedula}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {getChangeIcon()}
                <span className="text-sm font-medium">{getChangeDescription()}</span>
              </div>
              
              <p className="text-sm text-muted-foreground">{getImpactSummary()}</p>
            </div>
          </div>

          {/* Impact & Actions */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1">
                {change.impactAmount > 0 && <TrendingUp className="h-4 w-4 text-success" />}
                {change.impactAmount < 0 && <TrendingDown className="h-4 w-4 text-destructive" />}
                <span className={`font-medium ${
                  change.impactAmount > 0 ? 'text-success' : 
                  change.impactAmount < 0 ? 'text-destructive' : 
                  'text-muted-foreground'
                }`}>
                  {change.impactAmount > 0 ? '+' : ''}
                  {PeriodVersionComparisonService.formatCurrency(change.impactAmount)}
                </span>
              </div>
              
              <Badge 
                variant="outline" 
                className={PeriodVersionComparisonService.getChangeTypeColor(change.changeType)}
              >
                {PeriodVersionComparisonService.getChangeTypeLabel(change.changeType)}
              </Badge>
            </div>

            {hasDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {hasDetails && (
          <Collapsible open={isExpanded}>
            <CollapsibleContent className="mt-4 pt-4 border-t">
              {/* Field Changes */}
              {change.fieldChanges.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium text-sm">Cambios en Valores:</h5>
                  <div className="space-y-2">
                    {change.fieldChanges.map((fieldChange, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium text-sm">{fieldChange.fieldLabel}</span>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {PeriodVersionComparisonService.formatCurrency(fieldChange.initialValue || 0)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className={fieldChange.changeType === 'increase' ? 'text-success font-medium' : 'text-destructive font-medium'}>
                            {PeriodVersionComparisonService.formatCurrency(fieldChange.currentValue || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Novedad Changes */}
              {change.novedadesChanges.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h5 className="font-medium text-sm">Cambios en Novedades:</h5>
                  <div className="space-y-2">
                    {change.novedadesChanges.map((novedadChange, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          {novedadChange.action === 'added' && <Plus className="h-3 w-3 text-success" />}
                          {novedadChange.action === 'removed' && <Minus className="h-3 w-3 text-destructive" />}
                          {novedadChange.action === 'modified' && <Edit3 className="h-3 w-3 text-primary" />}
                          <span className="font-medium text-sm">{novedadChange.tipo}</span>
                          {novedadChange.subtipo && (
                            <span className="text-xs text-muted-foreground">({novedadChange.subtipo})</span>
                          )}
                        </div>
                        <Badge 
                          variant={novedadChange.action === 'added' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {novedadChange.action === 'added' ? '+' : novedadChange.action === 'removed' ? '-' : '±'}
                          {PeriodVersionComparisonService.formatCurrency(
                            novedadChange.currentValue || novedadChange.initialValue || 0
                          )}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};