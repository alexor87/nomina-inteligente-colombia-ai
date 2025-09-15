import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PayrollAuditEnhancedService, PeriodAuditSummary } from '@/services/PayrollAuditEnhancedService';
import { FileText, Download, User, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PeriodAuditSummaryProps {
  periodId: string;
  periodName: string;
}

export const PeriodAuditSummaryComponent: React.FC<PeriodAuditSummaryProps> = ({
  periodId,
  periodName
}) => {
  const [auditSummary, setAuditSummary] = useState<PeriodAuditSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (periodId) {
      loadAuditSummary();
    }
  }, [periodId]);

  const loadAuditSummary = async () => {
    setLoading(true);
    try {
      const summary = await PayrollAuditEnhancedService.getPeriodAuditSummary(periodId);
      setAuditSummary(summary);
    } catch (error) {
      console.error('Error loading audit summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'UPDATE':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'DELETE':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(value);
  };

  // Consolidate audit entries to show only final applied changes
  const consolidateAuditEntries = (entries: PeriodAuditSummary[]): PeriodAuditSummary[] => {
    // Group by employee + novedad_type
    const grouped = entries.reduce((acc, entry) => {
      const key = `${entry.employee_name}-${entry.novedad_type || 'unknown'}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(entry);
      return acc;
    }, {} as Record<string, PeriodAuditSummary[]>);

    // For each group, get the most recent entry and filter out deleted ones
    const consolidated: PeriodAuditSummary[] = [];
    
    Object.values(grouped).forEach(group => {
      // Sort by created_at to get the most recent
      const sortedGroup = group.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const mostRecent = sortedGroup[0];
      
      // Only include if the most recent action is not DELETE
      if (mostRecent.action !== 'DELETE') {
        consolidated.push(mostRecent);
      }
    });

    return consolidated;
  };

  const consolidatedEntries = consolidateAuditEntries(auditSummary);

  const getTotalAdjustments = () => {
    return consolidatedEntries.reduce((sum, entry) => sum + (entry.value_change || 0), 0);
  };

  const exportAuditReport = () => {
    const csvContent = [
      ['Empleado', 'Tipo Novedad', 'Acción', 'Cambio Valor', 'Usuario', 'Fecha'].join(','),
      ...consolidatedEntries.map(entry => [
        entry.employee_name,
        entry.novedad_type || 'N/A',
        PayrollAuditEnhancedService.getActionDescription(entry.action),
        entry.value_change || 0,
        entry.user_email,
        format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: es })
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria-aplicada-${periodName}-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Auditoría de Ajustes - {periodName}
          </CardTitle>
          <div className="flex items-center gap-2">
            {consolidatedEntries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportAuditReport}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Aplicados
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {consolidatedEntries.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay ajustes aplicados en este período</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-700">
                    {consolidatedEntries.length}
                  </div>
                  <div className="text-sm text-blue-600">Ajustes aplicados</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(getTotalAdjustments())}
                  </div>
                  <div className="text-sm text-green-600">Impacto neto</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-700">
                    {new Set(consolidatedEntries.map(entry => entry.employee_name)).size}
                  </div>
                  <div className="text-sm text-purple-600">Empleados afectados</div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Audit Entries */}
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {consolidatedEntries.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-4">
                      {getActionIcon(entry.action)}
                      <div className="space-y-1">
                         <div className="font-medium">
                           {entry.employee_name.startsWith('Empleado ') 
                             ? entry.employee_name 
                             : entry.employee_name}
                         </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <Badge className={getActionColor(entry.action)} variant="outline">
                            {PayrollAuditEnhancedService.getActionDescription(entry.action)}
                          </Badge>
                          <span>{entry.novedad_type || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className={`font-medium ${entry.value_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.value_change >= 0 ? '+' : ''}{formatCurrency(entry.value_change || 0)}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {entry.user_email}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};