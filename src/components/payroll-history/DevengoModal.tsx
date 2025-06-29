
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNovedades } from '@/hooks/useNovedades';
import { CreateNovedadData, NovedadType, NOVEDAD_CATEGORIES, calcularValorNovedad } from '@/types/novedades';
import { formatCurrency } from '@/lib/utils';
import { X, Plus, Calendar, Calculator, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface DevengoModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeSalary: number;
  payrollId: string;
  periodId: string;
  modalType?: 'devengado' | 'deduccion';
  onNovedadCreated?: (employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => void;
}

const tiposNovedadDevengados = [
  { value: 'horas_extra', label: 'Horas Extra' },
  { value: 'recargo_nocturno', label: 'Recargo Nocturno' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'licencia_remunerada', label: 'Licencia Remunerada' },
  { value: 'incapacidad', label: 'Incapacidad' },
  { value: 'bonificacion', label: 'Bonificación' },
  { value: 'comision', label: 'Comisión' },
  { value: 'prima', label: 'Prima Extralegal' },
  { value: 'otros_ingresos', label: 'Otros Ingresos' }
];

const tiposNovedadDeducciones = [
  { value: 'libranza', label: 'Libranza' },
  { value: 'multa', label: 'Multa' },
  { value: 'ausencia', label: 'Ausencia' },
  { value: 'descuento_voluntario', label: 'Descuento Voluntario' },
  { value: 'retencion_fuente', label: 'Retención en la Fuente' },
  { value: 'fondo_solidaridad', label: 'Fondo de Solidaridad' }
];

const subtiposMap: Record<string, string[]> = {
  horas_extra: ['diurnas', 'nocturnas', 'dominicales_diurnas', 'dominicales_nocturnas', 'festivas_diurnas', 'festivas_nocturnas'],
  incapacidad: ['general', 'laboral', 'maternidad'],
  bonificacion: ['productividad', 'ventas', 'puntualidad', 'permanencia'],
  comision: ['ventas', 'cobranza', 'meta'],
  prima: ['servicios', 'navidad', 'vacaciones'],
  licencia_remunerada: ['paternidad', 'matrimonio', 'luto'],
  otros_ingresos: ['subsidios', 'reintegros', 'compensaciones'],
  libranza: ['banco', 'cooperativa', 'empresa'],
  multa: ['disciplinaria', 'reglamentaria', 'contractual'],
  ausencia: ['injustificada', 'permiso_no_remunerado', 'suspension'],
  descuento_voluntario: ['ahorro', 'prestamo', 'seguro', 'otros']
};

export const DevengoModal: React.FC<DevengoModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeSalary,
  payrollId,
  periodId,
  modalType = 'devengado',
  onNovedadCreated
}) => {
  const { toast } = useToast();
  const { 
    createNovedad, 
    getEmployeeNovedades, 
    loadNovedadesForEmployee,
    deleteNovedad,
    isLoading 
  } = useNovedades(periodId, async () => {
    console.log('🔄 Novedad changed, triggering parent refresh');
    if (onNovedadCreated) {
      const novedades = getEmployeeNovedades(employeeId);
      const totalDevengados = novedades
        .filter(n => tiposNovedadDevengados.some(t => t.value === n.tipo_novedad))
        .reduce((sum, n) => sum + n.valor, 0);
      
      onNovedadCreated(employeeId, totalDevengados, 'devengado');
    }
  });

  const [formData, setFormData] = useState({
    tipo_novedad: '',
    subtipo: '',
    valor: '',
    horas: '',
    dias: '',
    observacion: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [calculationDetails, setCalculationDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load novedades when modal opens
  useEffect(() => {
    if (isOpen && employeeId && periodId) {
      console.log('🔍 Loading novedades for employee in modal:', employeeId, 'period:', periodId);
      loadNovedadesForEmployee(employeeId);
    }
  }, [isOpen, employeeId, periodId, loadNovedadesForEmployee]);

  // Auto-calculate value when relevant fields change
  useEffect(() => {
    if (formData.tipo_novedad && employeeSalary > 0) {
      const horas = formData.horas ? parseFloat(formData.horas) : undefined;
      const dias = formData.dias ? parseInt(formData.dias) : undefined;
      
      try {
        const result = calcularValorNovedad(
          formData.tipo_novedad as NovedadType,
          formData.subtipo || undefined,
          employeeSalary,
          dias,
          horas
        );
        
        if (result.valor > 0) {
          setCalculatedValue(result.valor);
          setCalculationDetails(result.baseCalculo.detalle_calculo);
        } else {
          setCalculatedValue(null);
          setCalculationDetails('');
        }
      } catch (error) {
        console.error('Error calculating value:', error);
        setCalculatedValue(null);
        setCalculationDetails('');
      }
    } else {
      setCalculatedValue(null);
      setCalculationDetails('');
    }
  }, [formData.tipo_novedad, formData.subtipo, formData.horas, formData.dias, employeeSalary]);

  const resetForm = () => {
    setFormData({
      tipo_novedad: '',
      subtipo: '',
      valor: '',
      horas: '',
      dias: '',
      observacion: '',
      fecha_inicio: '',
      fecha_fin: ''
    });
    setCalculatedValue(null);
    setCalculationDetails('');
  };

  const handleUseCalculatedValue = () => {
    if (calculatedValue !== null) {
      setFormData(prev => ({ ...prev, valor: calculatedValue.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submission started with data:', formData);
    
    // Basic validation
    if (!formData.tipo_novedad) {
      toast({
        title: "Error de validación",
        description: "Debes seleccionar un tipo de novedad",
        variant: "destructive"
      });
      return;
    }

    const valorFinal = formData.valor ? parseFloat(formData.valor) : calculatedValue || 0;
    
    if (valorFinal <= 0) {
      toast({
        title: "Error de validación",
        description: "El valor debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const novedadData: CreateNovedadData = {
        empleado_id: employeeId,
        periodo_id: periodId,
        tipo_novedad: formData.tipo_novedad as NovedadType,
        subtipo: formData.subtipo || undefined,
        valor: valorFinal,
        horas: formData.horas ? parseFloat(formData.horas) : undefined,
        dias: formData.dias ? parseInt(formData.dias) : undefined,
        observacion: formData.observacion || undefined,
        fecha_inicio: formData.fecha_inicio || undefined,
        fecha_fin: formData.fecha_fin || undefined
      };

      console.log('📤 Creating novedad with processed data:', novedadData);
      
      await createNovedad(novedadData);
      
      // Reset form on success
      resetForm();

      toast({
        title: "¡Éxito!",
        description: `${modalType === 'devengado' ? 'Devengado' : 'Deducción'} creado correctamente`,
        duration: 3000
      });

    } catch (error) {
      console.error('❌ Error in form submission:', error);
      toast({
        title: "Error al crear novedad",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    try {
      await deleteNovedad(novedadId, employeeId);
      toast({
        title: "Novedad eliminada",
        description: "La novedad se ha eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la novedad",
        variant: "destructive"
      });
    }
  };

  const novedades = getEmployeeNovedades(employeeId);
  const tiposDisponibles = modalType === 'devengado' ? tiposNovedadDevengados : tiposNovedadDeducciones;
  const novedadesFiltradas = novedades.filter(n => 
    modalType === 'devengado' 
      ? tiposNovedadDevengados.some(t => t.value === n.tipo_novedad)
      : tiposNovedadDeducciones.some(t => t.value === n.tipo_novedad)
  );

  const getTipoNovedadLabel = (tipo: string) => {
    const allTypes = [...tiposNovedadDevengados, ...tiposNovedadDeducciones];
    return allTypes.find(t => t.value === tipo)?.label || tipo;
  };

  const getSubtipoLabel = (subtipo: string) => {
    const subtipoLabels: Record<string, string> = {
      // Horas extra
      diurnas: 'Diurnas (25%)',
      nocturnas: 'Nocturnas (75%)',
      dominicales_diurnas: 'Dominicales Diurnas (100%)',
      dominicales_nocturnas: 'Dominicales Nocturnas (150%)',
      festivas_diurnas: 'Festivas Diurnas (100%)',
      festivas_nocturnas: 'Festivas Nocturnas (150%)',
      // Incapacidad
      general: 'General (EPS 66.7%)',
      laboral: 'Laboral (ARL 100%)',
      maternidad: 'Maternidad (100%)',
      // Otros
      productividad: 'Por Productividad',
      ventas: 'Por Ventas',
      puntualidad: 'Por Puntualidad',
      permanencia: 'Por Permanencia'
    };
    return subtipoLabels[subtipo] || subtipo;
  };

  const requiereHoras = () => {
    return ['horas_extra', 'recargo_nocturno'].includes(formData.tipo_novedad);
  };

  const requiereDias = () => {
    return ['vacaciones', 'licencia_remunerada', 'incapacidad', 'ausencia'].includes(formData.tipo_novedad);
  };

  const requiereSubtipo = () => {
    return subtiposMap[formData.tipo_novedad]?.length > 0;
  };

  const isFormValid = () => {
    if (!formData.tipo_novedad) return false;
    if (requiereHoras() && !formData.horas) return false;
    if (requiereDias() && !formData.dias) return false;
    if (requiereSubtipo() && !formData.subtipo) return false;
    
    const valorFinal = formData.valor ? parseFloat(formData.valor) : calculatedValue || 0;
    return valorFinal > 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>
                {modalType === 'devengado' ? 'Gestionar Devengados' : 'Gestionar Deducciones'} - {employeeName}
              </span>
              <div className="text-sm text-gray-500 font-normal mt-1">
                Salario Base: {formatCurrency(employeeSalary)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario para nueva novedad */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Nuevo {modalType === 'devengado' ? 'Devengado' : 'Deducción'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo_novedad">
                  Tipo de {modalType === 'devengado' ? 'Devengado' : 'Deducción'} *
                </Label>
                <Select 
                  value={formData.tipo_novedad} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_novedad: value, subtipo: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDisponibles.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {requiereSubtipo() && (
                <div>
                  <Label htmlFor="subtipo">Subtipo *</Label>
                  <Select 
                    value={formData.subtipo} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subtipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el subtipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {subtiposMap[formData.tipo_novedad]?.map(subtipo => (
                        <SelectItem key={subtipo} value={subtipo}>
                          {getSubtipoLabel(subtipo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {requiereHoras() && (
                  <div>
                    <Label htmlFor="horas">Horas *</Label>
                    <Input
                      id="horas"
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      value={formData.horas}
                      onChange={(e) => setFormData(prev => ({ ...prev, horas: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                )}
                
                {requiereDias() && (
                  <div>
                    <Label htmlFor="dias">Días *</Label>
                    <Input
                      id="dias"
                      type="number"
                      min="0"
                      max="31"
                      value={formData.dias}
                      onChange={(e) => setFormData(prev => ({ ...prev, dias: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_fin">Fecha Fin</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_fin: e.target.value }))}
                  />
                </div>
              </div>

              {/* Valor con cálculo automático */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="valor">Valor *</Label>
                  {calculatedValue !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseCalculatedValue}
                      className="text-xs"
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Usar calculado: {formatCurrency(calculatedValue)}
                    </Button>
                  )}
                </div>
                
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                  placeholder={calculatedValue ? `Calculado: ${formatCurrency(calculatedValue)}` : "Ingresa el valor"}
                />
                
                {calculationDetails && (
                  <Card className="mt-2 bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium mb-1">Cálculo automático:</p>
                          <p>{calculationDetails}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div>
                <Label htmlFor="observacion">Observaciones</Label>
                <Textarea
                  id="observacion"
                  value={formData.observacion}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!isFormValid() || isSubmitting || isLoading}
              >
                {isSubmitting ? 'Guardando...' : `Guardar ${modalType === 'devengado' ? 'Devengado' : 'Deducción'}`}
              </Button>
            </form>
          </div>

          {/* Lista de novedades existentes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              {modalType === 'devengado' ? 'Devengados' : 'Deducciones'} Registrados ({novedadesFiltradas.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {novedadesFiltradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No hay {modalType === 'devengado' ? 'devengados' : 'deducciones'} registrados</p>
                  <p className="text-sm">Crea el primer registro usando el formulario</p>
                </div>
              ) : (
                novedadesFiltradas.map((novedad) => (
                  <div key={novedad.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={modalType === 'devengado' ? "default" : "destructive"}
                          className={modalType === 'devengado' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {getTipoNovedadLabel(novedad.tipo_novedad)}
                        </Badge>
                        <span className="font-semibold">
                          {formatCurrency(novedad.valor)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNovedad(novedad.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {novedad.subtipo && (
                      <div className="text-sm text-gray-600">
                        Subtipo: {getSubtipoLabel(novedad.subtipo)}
                      </div>
                    )}
                    
                    {(novedad.horas || novedad.dias) && (
                      <div className="text-sm text-gray-600">
                        {novedad.horas && <span>Horas: {novedad.horas} </span>}
                        {novedad.dias && <span>Días: {novedad.dias}</span>}
                      </div>
                    )}
                    
                    {novedad.observacion && (
                      <p className="text-sm text-gray-600">{novedad.observacion}</p>
                    )}
                    
                    <div className="text-xs text-gray-400">
                      {new Date(novedad.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {novedadesFiltradas.length > 0 && (
              <div className="border-t pt-4">
                <div className="text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>Total {modalType === 'devengado' ? 'Devengados' : 'Deducciones'}:</span>
                    <span className={modalType === 'devengado' ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(
                        novedadesFiltradas.reduce((sum, n) => sum + n.valor, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
