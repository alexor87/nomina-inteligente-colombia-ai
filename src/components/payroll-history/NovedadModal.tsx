
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface NovedadModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  periodId: string;
}

export const NovedadModal = ({ 
  isOpen, 
  onClose, 
  employeeId, 
  employeeName, 
  periodId 
}: NovedadModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipoNovedad: '',
    subtipo: '',
    valor: '',
    observacion: '',
    fechaInicio: '',
    fechaFin: '',
    dias: '',
    horas: ''
  });

  console.log('NovedadModal render - isOpen:', isOpen, 'isLoading:', isLoading);

  const tiposNovedad = [
    { value: 'devengado', label: 'Devengado' },
    { value: 'deduccion', label: 'Deducción' },
    { value: 'incapacidad', label: 'Incapacidad' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'hora_extra', label: 'Hora Extra' },
    { value: 'auxilio', label: 'Auxilio' },
    { value: 'bonificacion', label: 'Bonificación' }
  ];

  const resetForm = () => {
    console.log('Resetting form data');
    setFormData({
      tipoNovedad: '',
      subtipo: '',
      valor: '',
      observacion: '',
      fechaInicio: '',
      fechaFin: '',
      dias: '',
      horas: ''
    });
    setIsLoading(false);
  };

  // Resetear el formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened, resetting form');
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipoNovedad || !formData.valor) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete el tipo de novedad y el valor",
        variant: "destructive"
      });
      return;
    }

    const valor = parseFloat(formData.valor);
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "El valor debe ser un número mayor a 0",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Submitting novedad form');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Novedad creada",
        description: "La novedad se ha registrado correctamente"
      });
      
      handleClose();
    } catch (error) {
      console.error('Error creating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la novedad",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    console.log('Closing modal - handleClose called');
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    console.log('Modal open change requested:', open, 'current isLoading:', isLoading);
    if (!open && !isLoading) {
      handleClose();
    }
  };

  // Prevenir el cierre accidental del modal
  const handleInteractOutside = (e: Event) => {
    if (isLoading) {
      e.preventDefault();
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
    >
      <DialogContent 
        className="sm:max-w-[500px] z-50"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={(e) => {
          if (isLoading) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Agregar Novedad</DialogTitle>
          <DialogDescription>
            Empleado: <span className="font-medium">{employeeName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoNovedad">Tipo de Novedad *</Label>
              <Select
                value={formData.tipoNovedad}
                onValueChange={(value) => setFormData({ ...formData, tipoNovedad: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {tiposNovedad.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                placeholder="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                min="0"
                step="0.01"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formData.fechaFin}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dias">Días</Label>
              <Input
                id="dias"
                type="number"
                placeholder="0"
                value={formData.dias}
                onChange={(e) => setFormData({ ...formData, dias: e.target.value })}
                min="0"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horas">Horas</Label>
              <Input
                id="horas"
                type="number"
                placeholder="0"
                value={formData.horas}
                onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                min="0"
                step="0.1"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacion">Observación</Label>
            <Textarea
              id="observacion"
              placeholder="Descripción de la novedad..."
              value={formData.observacion}
              onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Crear Novedad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
