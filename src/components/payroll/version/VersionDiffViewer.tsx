import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Plus, Minus, Edit3 } from 'lucide-react';
import { EmployeeVersionChange, FieldChange, NovedadChange, PeriodVersionComparisonService } from '@/services/PeriodVersionComparisonService';

interface VersionDiffViewerProps {
  employeeChanges: EmployeeVersionChange[];
  showOnlyChanges?: boolean;
}

export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  employeeChanges,
  showOnlyChanges = true
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedRows(newExpanded);
  };

  const getChangeIcon = (changeType: EmployeeVersionChange['changeType']) => {
    switch (changeType) {
      case 'employee_added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'employee_removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'values_modified':
        return <Edit3 className="h-4 w-4 text-blue-600" />;
      case 'novedades_added':
        return <Plus className="h-4 w-4 text-orange-600" />;
      case 'novedades_removed':
        return <Minus className="h-4 w-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const getImpactIcon = (amount: number) => {
    if (amount > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (amount < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const formatFieldValue = (field: string, value: any): string => {
    if (field.includes('salario') || field.includes('devengado') || field.includes('deducciones') || field.includes('neto')) {
      return PeriodVersionComparisonService.formatCurrency(value || 0);
    }
    return value?.toString() || 'N/A';
  };

  const renderFieldChanges = (fieldChanges: FieldChange[]) => {
    if (fieldChanges.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <h5 className="font-medium text-sm text-muted-foreground">Campos Modificados:</h5>
        <div className="grid grid-cols-1 gap-2">
          {fieldChanges.map((change, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm">
              <span className="font-medium">{change.fieldLabel}:</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{formatFieldValue(change.field, change.initialValue)}</span>
                <span>→</span>
                <span className={change.changeType === 'increase' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {formatFieldValue(change.field, change.currentValue)}
                </span>
                {change.difference !== 0 && (
                  <Badge variant={change.changeType === 'increase' ? 'default' : 'destructive'} className="ml-2">
                    {change.changeType === 'increase' ? '+' : ''}{PeriodVersionComparisonService.formatCurrency(change.difference)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNovedadesChanges = (novedadesChanges: NovedadChange[]) => {
    if (novedadesChanges.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <h5 className="font-medium text-sm text-muted-foreground">Cambios en Novedades:</h5>
        <div className="space-y-1">
          {novedadesChanges.map((change, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/20 rounded-md text-sm">
              <div className="flex items-center gap-2">
                {change.action === 'added' && <Plus className="h-3 w-3 text-green-600" />}
                {change.action === 'removed' && <Minus className="h-3 w-3 text-red-600" />}
                {change.action === 'modified' && <Edit3 className="h-3 w-3 text-blue-600" />}
                <span className="font-medium">{change.tipo}</span>
                {change.subtipo && <span className="text-muted-foreground">({change.subtipo})</span>}
              </div>
              <div className="flex items-center gap-2">
                {change.action === 'added' && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    +{PeriodVersionComparisonService.formatCurrency(change.currentValue || 0)}
                  </Badge>
                )}
                {change.action === 'removed' && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    -{PeriodVersionComparisonService.formatCurrency(change.initialValue || 0)}
                  </Badge>
                )}
                {change.action === 'modified' && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs">
                      {PeriodVersionComparisonService.formatCurrency(change.initialValue || 0)}
                    </span>
                    <span>→</span>
                    <Badge variant={change.difference >= 0 ? 'default' : 'destructive'}>
                      {PeriodVersionComparisonService.formatCurrency(change.currentValue || 0)}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const displayedChanges = showOnlyChanges 
    ? employeeChanges.filter(change => change.changeType !== 'no_change')
    : employeeChanges;

  if (displayedChanges.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>No se encontraron cambios entre la liquidación inicial y la actual.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Comparación Detallada de Empleados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo de Cambio</TableHead>
              <TableHead>Impacto Económico</TableHead>
              <TableHead>Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedChanges.map((change) => {
              const isExpanded = expandedRows.has(change.employeeId);
              const hasDetails = change.fieldChanges.length > 0 || change.novedadesChanges.length > 0;

              return (
                <React.Fragment key={change.employeeId}>
                  <TableRow>
                    <TableCell>
                      {hasDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(change.employeeId)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChangeIcon(change.changeType)}
                        <span className="font-medium">{change.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{change.documentType && change.documentType !== 'N/A' ? `${change.documentType}: ${change.cedula || 'N/A'}` : (change.cedula || 'N/A')}</TableCell>
                    <TableCell>
                      <Badge className={PeriodVersionComparisonService.getChangeTypeColor(change.changeType)}>
                        {PeriodVersionComparisonService.getChangeTypeLabel(change.changeType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getImpactIcon(change.impactAmount)}
                        <span className={change.impactAmount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {change.impactAmount >= 0 ? '+' : ''}{PeriodVersionComparisonService.formatCurrency(change.impactAmount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {change.fieldChanges.length > 0 && (
                        <Badge variant="outline" className="mr-1">
                          {change.fieldChanges.length} campos
                        </Badge>
                      )}
                      {change.novedadesChanges.length > 0 && (
                        <Badge variant="outline">
                          {change.novedadesChanges.length} novedades
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && hasDetails && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <div className="p-4 bg-muted/10 border-t">
                          {renderFieldChanges(change.fieldChanges)}
                          {renderNovedadesChanges(change.novedadesChanges)}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};