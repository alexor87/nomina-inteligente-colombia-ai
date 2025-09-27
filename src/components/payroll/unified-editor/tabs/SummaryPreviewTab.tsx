import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  FileEdit, 
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useUnifiedPeriodEdit } from '@/contexts/UnifiedPeriodEditContext';
import { formatCurrency } from '@/lib/utils';

export const SummaryPreviewTab: React.FC = () => {
  const { editState } = useUnifiedPeriodEdit();

  const calculateDifferences = () => {
    return {
      employeesDiff: editState.currentTotals.totalEmployees - editState.originalTotals.totalEmployees,
      grossPayDiff: editState.currentTotals.totalGrossPay - editState.originalTotals.totalGrossPay,
      deductionsDiff: editState.currentTotals.totalDeductions - editState.originalTotals.totalDeductions,
      netPayDiff: editState.currentTotals.totalNetPay - editState.originalTotals.totalNetPay
    };
  };

  const diffs = calculateDifferences();

  const getDifferenceIndicator = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const formatDifference = (value: number, isCurrency = false) => {
    if (value === 0) return null;
    const formatted = isCurrency ? formatCurrency(Math.abs(value)) : Math.abs(value).toString();
    const sign = value > 0 ? '+' : '-';
    const colorClass = value > 0 ? 'text-green-600' : 'text-red-600';
    
    return (
      <span className={`text-sm ${colorClass} font-medium`}>
        ({sign}{formatted})
      </span>
    );
  };

  const getChangesSummary = () => {
    const changes = {
      addedEmployees: editState.employees.filter(emp => emp.isNew && !emp.isRemoved).length,
      removedEmployees: editState.employees.filter(emp => emp.isRemoved).length,
      addedNovedades: editState.novedades.filter(nov => nov.isNew && !nov.isRemoved).length,
      modifiedNovedades: editState.novedades.filter(nov => nov.isModified && !nov.isRemoved).length,
      removedNovedades: editState.novedades.filter(nov => nov.isRemoved).length
    };

    const totalChanges = Object.values(changes).reduce((sum, count) => sum + count, 0);

    return { ...changes, totalChanges };
  };

  const changes = getChangesSummary();

  const getImpactSeverity = () => {
    const grossPayImpact = Math.abs(diffs.grossPayDiff / editState.originalTotals.totalGrossPay);
    const employeeImpact = Math.abs(diffs.employeesDiff / editState.originalTotals.totalEmployees);
    
    if (grossPayImpact > 0.2 || employeeImpact > 0.3) return 'high';
    if (grossPayImpact > 0.1 || employeeImpact > 0.15) return 'medium';
    return 'low';
  };

  const impactSeverity = getImpactSeverity();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Resumen de Cambios</h3>
        <p className="text-sm text-muted-foreground">
          Vista general del impacto de las modificaciones en el período
        </p>
      </div>

      {/* Impact Alert */}
      {editState.hasChanges && (
        <Card className={`border-l-4 ${
          impactSeverity === 'high' ? 'border-l-red-500 bg-red-50' :
          impactSeverity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
          'border-l-blue-500 bg-blue-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {impactSeverity === 'high' ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <div>
                <div className="font-medium">
                  {impactSeverity === 'high' && 'Impacto Alto Detectado'}
                  {impactSeverity === 'medium' && 'Impacto Moderado'}
                  {impactSeverity === 'low' && 'Impacto Bajo'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {changes.totalChanges} cambio{changes.totalChanges !== 1 ? 's' : ''} pendiente{changes.totalChanges !== 1 ? 's' : ''}
                  {editState.isRecalculating && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Recalculando...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Before */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estado Original</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Empleados</span>
              <span className="font-medium">{editState.originalTotals.totalEmployees}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Devengado</span>
              <span className="font-medium">{formatCurrency(editState.originalTotals.totalGrossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Deducciones</span>
              <span className="font-medium">{formatCurrency(editState.originalTotals.totalDeductions)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Neto</span>
              <span className="font-bold">{formatCurrency(editState.originalTotals.totalNetPay)}</span>
            </div>
          </CardContent>
        </Card>

        {/* After */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              Estado Proyectado
              {editState.hasChanges && <Badge variant="secondary">Con cambios</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Empleados</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{editState.currentTotals.totalEmployees}</span>
                {getDifferenceIndicator(diffs.employeesDiff)}
                {formatDifference(diffs.employeesDiff)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Devengado</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(editState.currentTotals.totalGrossPay)}</span>
                {getDifferenceIndicator(diffs.grossPayDiff)}
                {formatDifference(diffs.grossPayDiff, true)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Deducciones</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(editState.currentTotals.totalDeductions)}</span>
                {getDifferenceIndicator(diffs.deductionsDiff)}
                {formatDifference(diffs.deductionsDiff, true)}
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Neto</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatCurrency(editState.currentTotals.totalNetPay)}</span>
                {getDifferenceIndicator(diffs.netPayDiff)}
                {formatDifference(diffs.netPayDiff, true)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Changes Breakdown */}
      {editState.hasChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Desglose de Cambios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Employee Changes */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Cambios de Empleados
                </h4>
                <div className="space-y-2">
                  {changes.addedEmployees > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Empleados agregados</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        +{changes.addedEmployees}
                      </Badge>
                    </div>
                  )}
                  {changes.removedEmployees > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Empleados removidos</span>
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        -{changes.removedEmployees}
                      </Badge>
                    </div>
                  )}
                  {changes.addedEmployees === 0 && changes.removedEmployees === 0 && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Sin cambios en empleados
                    </div>
                  )}
                </div>
              </div>

              {/* Novedad Changes */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileEdit className="h-4 w-4" />
                  Cambios de Novedades
                </h4>
                <div className="space-y-2">
                  {changes.addedNovedades > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Novedades agregadas</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        +{changes.addedNovedades}
                      </Badge>
                    </div>
                  )}
                  {changes.modifiedNovedades > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-600">Novedades modificadas</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        ~{changes.modifiedNovedades}
                      </Badge>
                    </div>
                  )}
                  {changes.removedNovedades > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Novedades eliminadas</span>
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        -{changes.removedNovedades}
                      </Badge>
                    </div>
                  )}
                  {changes.addedNovedades === 0 && changes.modifiedNovedades === 0 && changes.removedNovedades === 0 && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Sin cambios en novedades
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Changes State */}
      {!editState.hasChanges && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">Sin cambios pendientes</h4>
            <p className="text-sm text-muted-foreground">
              No hay modificaciones en empleados o novedades para este período.
              Usa las pestañas anteriores para realizar cambios.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};