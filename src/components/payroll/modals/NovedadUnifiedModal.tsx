
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface NovedadUnifiedModalProps {
  open: boolean;
  onClose: () => void;
  employeeId: string | null;
  periodId: string;
  startDate: string;
  endDate: string;
  year: string;
}

export const NovedadUnifiedModal: React.FC<NovedadUnifiedModalProps> = ({
  open,
  onClose,
  employeeId,
  periodId,
  startDate,
  endDate,
  year
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar Novedades</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Período: {startDate} - {endDate}</p>
            <p>Año: {year}</p>
            <p>Empleado ID: {employeeId}</p>
            <p>Período ID: {periodId}</p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <p className="text-center text-muted-foreground">
              Funcionalidad de novedades en desarrollo
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onClose}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
