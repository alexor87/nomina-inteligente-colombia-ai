import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Eye, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReliquidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onViewResults: () => void;
  onReliquidate: (justification: string) => void;
  periodName: string;
  summary?: {
    totalEmployees: number;
    totalDevengado: number;
    totalNeto: number;
  };
  isReliquidating?: boolean;
}

export const ReliquidationDialog: React.FC<ReliquidationDialogProps> = ({
  isOpen,
  onClose,
  onViewResults,
  onReliquidate,
  periodName,
  summary,
  isReliquidating = false
}) => {
  const [justification, setJustification] = useState('');

  const handleReliquidate = () => {
    if (justification.trim()) {
      onReliquidate(justification.trim());
    }
  };

  const handleClose = () => {
    setJustification('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <DialogTitle>Confirmar Reliquidación</DialogTitle>
          </div>
          <DialogDescription>
            Se va a reliquidar el período <strong>{periodName}</strong> con auditoría completa.
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Resumen del período:
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm font-medium">Empleados</div>
                <div className="text-lg">{summary.totalEmployees}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Total Devengado</div>
                <div className="text-lg">${summary.totalDevengado.toLocaleString()}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm font-medium">Total Neto</div>
                <div className="text-lg font-bold text-green-600">
                  ${summary.totalNeto.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <strong>La reliquidación recalculará todos los valores</strong> y creará un registro de auditoría.
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="justification">Justificación (requerida)</Label>
            <Textarea
              id="justification"
              placeholder="Describe el motivo de la reliquidación..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onViewResults}
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>Ver Auditoría</span>
          </Button>
          <Button
            onClick={handleReliquidate}
            disabled={isReliquidating || !justification.trim()}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{isReliquidating ? 'Reliquidando...' : 'Reliquidar'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};