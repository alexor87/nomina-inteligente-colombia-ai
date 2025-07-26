import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileText, Users, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PendingNovedad {
  employee_id: string;
  employee_name: string;
  tipo_novedad: string;
  valor: number;
  observacion?: string;
}

interface ConfirmAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
  pendingNovedades: PendingNovedad[];
  periodName: string;
  isLoading?: boolean;
}

export const ConfirmAdjustmentModal: React.FC<ConfirmAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  pendingNovedades,
  periodName,
  isLoading = false
}) => {
  const [justification, setJustification] = React.useState('');

  const handleSubmit = () => {
    onConfirm(justification);
  };

  const totalImpact = pendingNovedades.reduce((sum, novedad) => sum + novedad.valor, 0);
  const affectedEmployees = new Set(pendingNovedades.map(n => n.employee_id)).size;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirmar Ajustes al Período
          </DialogTitle>
          <DialogDescription>
            Está a punto de aplicar ajustes al período <strong>{periodName}</strong>. 
            Esta acción actualizará los comprobantes de nómina y no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{affectedEmployees}</div>
              <div className="text-sm text-muted-foreground">Empleados</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Calculator className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{pendingNovedades.length}</div>
              <div className="text-sm text-muted-foreground">Novedades</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className={`text-2xl font-bold ${totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalImpact)}
              </div>
              <div className="text-sm text-muted-foreground">Impacto Total</div>
            </div>
          </div>

          {/* Novelties List */}
          <div className="max-h-64 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Empleado</th>
                  <th className="text-left p-3 font-medium">Concepto</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pendingNovedades.map((novedad, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-3">{novedad.employee_name}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {novedad.tipo_novedad}
                      </Badge>
                    </td>
                    <td className={`p-3 text-right font-mono ${novedad.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(novedad.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">
              Justificación del Ajuste <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="justification"
              placeholder="Describa la razón de estos ajustes al período..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Esta justificación quedará registrada en el log de auditoría
            </p>
          </div>

          {/* Warning */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning mb-1">Importante:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Se recalcularán automáticamente los totales del período</li>
                  <li>• Se regenerarán los comprobantes de nómina afectados</li>
                  <li>• Esta acción quedará registrada en el log de auditoría</li>
                  <li>• Los empleados afectados recibirán sus nuevos comprobantes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!justification.trim() || isLoading}
            className="bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Procesando...
              </>
            ) : (
              'Confirmar Ajustes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};