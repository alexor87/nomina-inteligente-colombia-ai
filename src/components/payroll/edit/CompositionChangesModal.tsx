import React, { useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePayrollEdit } from '@/contexts/PayrollEditContext';

interface CompositionChangesModalProps {
  onApplyChanges: (summary: string) => Promise<void>;
}

export const CompositionChangesModal: React.FC<CompositionChangesModalProps> = ({
  onApplyChanges
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const { editMode } = usePayrollEdit();

  const handleApplyChanges = async () => {
    if (!summary.trim()) {
      return;
    }

    try {
      setIsApplying(true);
      await onApplyChanges(summary.trim());
      setIsOpen(false);
      setSummary('');
    } catch (error) {
      console.error('❌ Error applying changes:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!editMode.isActive || editMode.compositionChanges.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Ver Cambios ({editMode.compositionChanges.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Resumen de Cambios</DialogTitle>
          <DialogDescription>
            Revisa los cambios realizados al período antes de aplicarlos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col">
          <ScrollArea className="flex-1 border rounded-lg p-3">
            <div className="space-y-3">
              {editMode.compositionChanges.map((change, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={change.action === 'add' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {change.action === 'add' ? 'Agregar' : 'Remover'}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{change.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(change.timestamp)}
                      </p>
                    </div>
                  </div>
                  {change.action === 'remove' && (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-2">
            <Label htmlFor="summary">Resumen de cambios (requerido)</Label>
            <Textarea
              id="summary"
              placeholder="Describe los cambios realizados (ej: 'Agregado Juan Pérez por reintegro, removido María López por renuncia')"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Este resumen será guardado en el historial de versiones para auditoría.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApplyChanges}
            disabled={!summary.trim() || isApplying}
            className="bg-primary hover:bg-primary/90"
          >
            {isApplying ? 'Aplicando...' : 'Aplicar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};