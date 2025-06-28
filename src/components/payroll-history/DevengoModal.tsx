
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
import { NOVEDAD_CATEGORIES, calcularValorNovedad, NovedadType, CreateNovedadData } from '@/types/novedades';
import { useNovedades } from '@/hooks/useNovedades';

interface DevengoModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeSalary: number;
  periodId: string;
  onNovedadCreated: (employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => void;
}

export const DevengoModal = ({ 
  isOpen, 
  onClose, 
  employeeId, 
  employeeName, 
  employeeSalary,
  periodId,
  onNovedadCreated
}: DevengoModalProps) => {
  const { toast } = useToast();
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
  const [calculatedValue, setCalculatedValue] = useState<number>(0);
  const [calculationDetail, setCalculationDetail] = useState<string>('');

  // Use the real novedades hook with recalculation callback
  const { createNovedad, isLoading } = useNovedades(periodId, () => {
    console.log('Novedad created, triggering parent refresh');
    // This callback will be called after the novedad is created
  });

  console.log('DevengoModal render - isOpen:', isOpen, 'isLoading:', isLoading);

  // Obtener solo los tipos de devengados
  const tiposDevengado = Object.entries(NOVEDAD_CATEGORIES.devengados.types).map(([key, config]) => ({
    value: key as NovedadType,
    label: config.label,
    requiere_horas: config.requiere_horas,
    requiere_dias: config.requiere_dias,
    auto_calculo: config.auto_calculo,
    subtipos: config.subtipos
  }));

  const resetForm = () => {
    console.log('Resetting devengado form data');
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
    setCalculatedValue(0);
    setCalculationDetail('');
  };

  // Resetear el formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened, resetting form');
      resetForm();
    }
  }, [isOpen]);

  // Calcular valor automáticamente cuando cambian los datos relevantes
  useEffect(() => {
    if (formData.tipoNovedad && employeeSalary > 0) {
      const tipoConfig = tiposDevengado.find(t => t.value === formData.tipoNovedad);
      if (tipoConfig?.auto_calculo) {
        const dias = formData.dias ? parseInt(formData.dias) : undefined;
        const horas = formData.horas ? parseFloat(formData.horas) : undefined;
        
        const { valor, baseCalculo } = calcularValorNovedad(
          formData.tipoNovedad as NovedadType,
          formData.subtipo,
          employeeSalary,
          dias,
          horas
        );
        
        setCalculatedValue(valor);
        setCalculationDetail(baseCalculo.detalle_calculo);
        setFormData(prev => ({ ...prev, valor: valor.toString() }));
      }
    }
  }, [formData.tipoNovedad, formData.subtipo, formData.dias, formData.horas, employeeSalary, tiposDevengado]);

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

    try {
      console.log('🔄 Creating real novedad with data:', {
        employeeId,
        periodId,
        tipoNovedad: formData.tipoNovedad,
        valor
      });

      // Prepare the complete novedad data
      const novedadData: CreateNovedadData = {
        empleado_id: employeeId,
        periodo_id: periodId,
        tipo_novedad: formData.tipoNovedad as NovedadType,
        subtipo: formData.subtipo || undefined,
        fecha_inicio: formData.fechaInicio || undefined,
        fecha_fin: formData.fechaFin || undefined,
        dias: formData.dias ? parseInt(formData.dias) : undefined,
        horas: formData.horas ? parseFloat(formData.horas) : undefined,
        valor: valor,
        observacion: formData.observacion || undefined,
        // Include base_calculo if it was auto-calculated
        base_calculo: calculatedValue > 0 ? {
          salario_base: employeeSalary,
          factor_calculo: calculatedValue / employeeSalary,
          detalle_calculo: calculationDetail
        } : undefined
      };

      console.log('📤 Complete novedad data:', novedadData);

      // Create the novedad using the real service
      await createNovedad(novedadData);
      
      console.log('✅ Novedad created successfully');

      // Notify parent component about the creation
      onNovedadCreated(employeeId, valor, 'devengado');
      
      toast({
        title: "Devengado agregado exitosamente",
        description: `Se ha agregado ${formatCurrency(valor)} al empleado ${employeeName}`,
        variant: "default"
      });
      
      handleClose();
    } catch (error) {
      console.error('❌ Error creating devengado:', error);
      toast({
        title: "Error al crear devengado",
        description: error instanceof Error ? error.message : "No se pudo crear el devengado",
        variant: "destructive"
      });
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

  const handleInteractOutside = (e: Event) => {
    if (isLoading) {
      e.preventDefault();
    }
  };

  const selectedTipo = tiposDevengado.find(t => t.value === formData.tipoNovedad);
  const isValueAutoCalculated = selectedTipo?.auto_calculo && calculatedValue > 0;

  // Función para formatear los nombres de subtipos
  const formatSubtipoLabel = (subtipo: string) => {
    const labels: Record<string, string> = {
      'diurnas': 'Diurnas (25% recargo)',
      'nocturnas': 'Nocturnas (75% recargo)', 
      'dominicales_diurnas': 'Dominicales Diurnas (100% recargo)',
      'dominicales_nocturnas': 'Dominicales Nocturnas (150% recargo)',
      'festivas_diurnas': 'Festivas Diurnas (100% recargo)',
      'festivas_nocturnas': 'Festivas Nocturnas (150% recargo)'
    };
    return labels[subtipo] || subtipo.charAt(0).toUpperCase() + subtipo.slice(1);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
    >
      <DialogContent 
        className="sm:max-w-[600px] z-50 max-h-[90vh] overflow-y-auto"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={(e) => {
          if (isLoading) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Agregar Devengado</DialogTitle>
          <DialogDescription>
            Empleado: <span className="font-medium">{employeeName}</span> • 
            Salario base: <span className="font-medium text-green-600">{formatCurrency(employeeSalary)}</span>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección Principal: Tipo de Devengado */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipoNovedad" className="text-base font-medium">Tipo de Devengado *</Label>
              <Select
                value={formData.tipoNovedad}
                onValueChange={(value) => setFormData({ ...formData, tipoNovedad: value, subtipo: '', valor: '' })}
                disabled={isLoading}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar tipo de devengado" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {tiposDevengado.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTipo?.subtipos && selectedTipo.subtipos.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="subtipo">Subtipo *</Label>
                <Select
                  value={formData.subtipo}
                  onValueChange={(value) => setFormData({ ...formData, subtipo: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar subtipo" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {selectedTipo.subtipos.map((subtipo) => (
                      <SelectItem key={subtipo} value={subtipo}>
                        {formatSubtipoLabel(subtipo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Sección Parámetros: Días y Horas */}
          {(selectedTipo?.requiere_dias || selectedTipo?.requiere_horas) && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Parámetros de Cálculo</h4>
              <div className="grid grid-cols-2 gap-4">
                {selectedTipo.requiere_dias && (
                  <div className="space-y-2">
                    <Label htmlFor="dias">Días *</Label>
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
                )}

                {selectedTipo.requiere_horas && (
                  <div className="space-y-2">
                    <Label htmlFor="horas">Horas *</Label>
                    <Input
                      id="horas"
                      type="number"
                      placeholder="0"
                      value={formData.horas}
                      onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                      min="0"
                      max="24"
                      step="0.1"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500">
                      Máximo 2 horas diarias, 12 semanales según ley
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sección Fechas - Solo para tipos que las requieran */}
          {(formData.tipoNovedad === 'incapacidad' || formData.tipoNovedad === 'vacaciones' || formData.tipoNovedad === 'licencia_remunerada') && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Período de Aplicación</h4>
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
            </div>
          )}

          {/* Sección Valor */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Valor del Devengado</h4>
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
                disabled={isLoading || isValueAutoCalculated}
                className={isValueAutoCalculated ? 'bg-gray-100 cursor-not-allowed' : ''}
              />
              {isValueAutoCalculated && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">
                    💡 Valor calculado automáticamente: {formatCurrency(calculatedValue)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">{calculationDetail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sección Observación */}
          <div className="space-y-2">
            <Label htmlFor="observacion">Observación</Label>
            <Textarea
              id="observacion"
              placeholder="Descripción adicional del devengado..."
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
              {isLoading ? 'Agregando...' : 'Agregar Devengado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
