import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PayrollAuditEnhancedService, AuditEntry } from '@/services/PayrollAuditEnhancedService';
import { Clock, User, FileText, TrendingUp, TrendingDown, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NovedadAuditHistoryModalProps {
  open: boolean;
  onClose: () => void;
  novedadId: string | null;
  employeeName?: string;
}

export const NovedadAuditHistoryModal: React.FC<NovedadAuditHistoryModalProps> = ({
  open,
  onClose,
  novedadId,
  employeeName
}) => {
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && novedadId) {
      loadAuditHistory();
    }
  }, [open, novedadId]);

  const loadAuditHistory = async () => {
    if (!novedadId) return;

    setLoading(true);
    try {
      const history = await PayrollAuditEnhancedService.getNovedadAuditHistory(novedadId);
      setAuditHistory(history);
    } catch (error) {
      console.error('Error loading audit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-600" />;
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

  const renderValueChanges = (entry: AuditEntry) => {
    if (entry.action === 'CREATE') {
      const newValues = entry.new_values;
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-700">Valores creados:</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Valor:</span> {PayrollAuditEnhancedService.formatValueForDisplay('valor', newValues.valor)}
            </div>
            {newValues.dias && (
              <div>
                <span className="font-medium">Días:</span> {newValues.dias}
              </div>
            )}
            {newValues.tipo_novedad && (
              <div>
                <span className="font-medium">Tipo:</span> {newValues.tipo_novedad}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (entry.action === 'DELETE') {
      const oldValues = entry.old_values;
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-700">Valores eliminados:</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Valor:</span> {PayrollAuditEnhancedService.formatValueForDisplay('valor', oldValues.valor)}
            </div>
            {oldValues.dias && (
              <div>
                <span className="font-medium">Días:</span> {oldValues.dias}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (entry.action === 'UPDATE') {
      const changes = PayrollAuditEnhancedService.getValueChanges(entry.old_values, entry.new_values);
      
      if (changes.length === 0) {
        return <p className="text-sm text-gray-500">Sin cambios detectados</p>;
      }

      return (
        <div className="space-y-3">
          <p className="text-sm font-medium text-blue-700">Cambios realizados:</p>
          {changes.map((change, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">
                  {PayrollAuditEnhancedService.getFieldDisplayName(change.field)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex-1">
                  <span className="text-gray-600">Antes:</span>
                  <span className="ml-2 font-mono bg-red-50 px-2 py-1 rounded">
                    {PayrollAuditEnhancedService.formatValueForDisplay(change.field, change.oldValue)}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="text-gray-600">Después:</span>
                  <span className="ml-2 font-mono bg-green-50 px-2 py-1 rounded">
                    {PayrollAuditEnhancedService.formatValueForDisplay(change.field, change.newValue)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Historial de Auditoría
            {employeeName && (
              <span className="text-sm font-normal text-gray-600">
                - {employeeName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : auditHistory.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay historial de cambios para esta novedad</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditHistory.map((entry, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {getActionIcon(entry.action)}
                        <Badge className={getActionColor(entry.action)}>
                          {PayrollAuditEnhancedService.getActionDescription(entry.action)}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {entry.user_email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(entry.created_at), 'PPpp', { locale: es })}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renderValueChanges(entry)}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};