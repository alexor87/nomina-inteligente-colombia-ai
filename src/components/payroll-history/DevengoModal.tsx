
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { NovedadesService } from '@/services/NovedadesService';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Plus, X } from 'lucide-react';

interface DevengoModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeSalary: number;
  payrollId: string; // This is the payroll UUID (not used for novedades)
  periodId: string; // This should be the real period UUID for novedades
  onNovedadCreated?: (employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => void;
}

interface DevengoFormData {
  tipo_novedad: string;
  valor: number;
  horas: number;
  observacion: string;
}

export const DevengoModal = ({ 
  isOpen, 
  onClose, 
  employeeId, 
  employeeName, 
  employeeSalary,
  payrollId,
  periodId, // Real period UUID for novedades
  onNovedadCreated 
}: DevengoModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<DevengoFormData>({
    tipo_novedad: '',
    valor: 0,
    horas: 0,
    observacion: ''
  });

  console.log('DevengoModal props:', {
    employeeId,
    employeeName,
    payrollId,
    periodId, // This should be the real period UUID
    employeeSalary
  });

  const tiposDevengado = [
    { value: 'horas_extra', label: 'Horas Extra', requiresHours: true },
    { value: 'recargo_nocturno', label: 'Recargo Nocturno', requiresHours: true },
    { value: 'bonificacion', label: 'Bonificación', requiresHours: false },
    { value: 'comision', label: 'Comisión', requiresHours: false },
    { value: 'otros_ingresos', label: 'Otros Ingresos', requiresHours: false }
  ];

  const selectedTipo = tiposDevengado.find(tipo => tipo.value === formData.tipo_novedad);
  const requiresHours = selectedTipo?.requiresHours || false;

  const calculateValue = () => {
    if (!formData.tipo_novedad || !formData.horas) return 0;

    const salarioHora = employeeSalary / 240; // Aproximadamente 30 días * 8 horas
    
    switch (formData.tipo_novedad) {
      case 'horas_extra':
        return salarioHora * formData.horas * 1.25; // 25% adicional
      case 'recargo_nocturno':
        return salarioHora * formData.horas * 1.35; // 35% adicional
      default:
        return formData.valor;
    }
  };

  const handleCalculate = () => {
    const calculatedValue = calculateValue();
    setFormData(prev => ({
      ...prev,
      valor: calculatedValue
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.tipo_novedad) {
        toast({
          title: "Error",
          description: "Debe seleccionar un tipo de devengado",
          variant: "destructive"
        });
        return;
      }

      if (!formData.valor || formData.valor <= 0) {
        toast({
          title: "Error", 
          description: "El valor debe ser mayor a 0",
          variant: "destructive"
        });
        return;
      }

      // Validate that periodId is a proper UUID
      const isValidUUID = (uuid: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      if (!periodId || !isValidUUID(periodId)) {
        console.error('❌ Invalid period ID for novedad:', periodId);
        toast({
          title: "Error de configuración",
          description: "ID de período inválido. No se puede crear la novedad.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Creating novedad with valid period UUID:', periodId);

      setIsLoading(true);

      const novedadData = {
        empleado_id: employeeId,
        periodo_id: periodId, // Using the real period UUID
        tipo_novedad: formData.tipo_novedad,
        valor: formData.valor,
        horas: requiresHours ? formData.horas : undefined,
        observacion: formData.observacion || undefined
      };

      console.log('📤 Submitting novedad data:', novedadData);

      const newNovedad = await NovedadesService.createNovedad(novedadData);
      
      if (newNovedad) {
        console.log('✅ Novedad created successfully:', newNovedad);
        
        toast({
          title: "Devengado agregado",
          description: `Se agregó ${formatCurrency(formData.valor)} al empleado ${employeeName}`,
        });

        // Notify parent component
        if (onNovedadCreated) {
          onNovedadCreated(employeeId, formData.valor, 'devengado');
        }

        // Reset form and close
        setFormData({
          tipo_novedad: '',
          valor: 0,
          horas: 0,
          observacion: ''
        });
        
        onClose();
      }
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: "Error al crear devengado",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tipo_novedad: '',
      valor: 0,
      horas: 0,
      observacion: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-green-600" />
            <span>Agregar Devengado</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-900">{employeeName}</p>
            <p className="text-xs text-blue-700">
              Salario base: {formatCurrency(employeeSalary)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Devengado</Label>
            <Select 
              value={formData.tipo_novedad} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_novedad: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione el tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposDevengado.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresHours && (
            <div className="space-y-2">
              <Label htmlFor="horas">Horas</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="horas"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.horas}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    horas: Number(e.target.value) 
                  }))}
                  placeholder="0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCalculate}
                  className="flex items-center space-x-1"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Calcular</span>
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              type="number"
              min="0"
              step="1000"
              value={formData.valor}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                valor: Number(e.target.value) 
              }))}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacion">Observación (Opcional)</Label>
            <Textarea
              id="observacion"
              value={formData.observacion}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                observacion: e.target.value 
              }))}
              placeholder="Información adicional sobre el devengado..."
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formData.tipo_novedad || !formData.valor}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Agregar Devengado'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
