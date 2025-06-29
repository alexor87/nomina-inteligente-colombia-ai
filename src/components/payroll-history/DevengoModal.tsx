import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Trash2, 
  Calculator,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { NovedadForm } from '@/components/payroll/novedades/NovedadForm';
import { formatCurrency } from '@/lib/utils';
import { JornadaLegalTooltip } from '@/components/ui/JornadaLegalTooltip';
import { supabase } from '@/integrations/supabase/client';

interface DevengoModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeSalary: number;
  payrollId: string;
  periodId: string;
  modalType: 'devengado' | 'deduccion';
  onNovedadCreated?: (employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => void;
}

interface NovedadDisplay {
  id: string;
  tipo_novedad: NovedadType;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  base_calculo?: any;
}

export const DevengoModal = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeSalary,
  payrollId,
  periodId,
  modalType,
  onNovedadCreated
}: DevengoModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novedades, setNovedades] = useState<NovedadDisplay[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<NovedadDisplay | null>(null);
  const [currentPeriodDate, setCurrentPeriodDate] = useState<Date>(new Date());

  // Form state con valores por defecto mejorados
  const [formData, setFormData] = useState<CreateNovedadData>({
    empleado_id: employeeId,
    periodo_id: periodId,
    tipo_novedad: modalType === 'devengado' ? 'horas_extra' as NovedadType : 'ausencia' as NovedadType,
    subtipo: modalType === 'devengado' ? 'diurnas' : undefined,
    fecha_inicio: '',
    fecha_fin: '',
    dias: null,
    horas: null,
    valor: 0,
    observacion: ''
  });

  // Actualizar formData cuando cambien las props
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Modal opened, updating form data with:', {
        employeeId,
        periodId,
        modalType
      });
      
      setFormData({
        empleado_id: employeeId,
        periodo_id: periodId,
        tipo_novedad: modalType === 'devengado' ? 'horas_extra' as NovedadType : 'ausencia' as NovedadType,
        subtipo: modalType === 'devengado' ? 'diurnas' : undefined,
        fecha_inicio: '',
        fecha_fin: '',
        dias: null,
        horas: null,
        valor: 0,
        observacion: ''
      });
    }
  }, [isOpen, employeeId, periodId, modalType]);

  // Cargar fecha del período desde la base de datos para cálculos precisos
  useEffect(() => {
    const loadPeriodDate = async () => {
      try {
        console.log('🔍 Loading period date for accurate calculations, periodId:', periodId);
        
        const { data: periodData, error } = await supabase
          .from('payroll_periods_real')
          .select('fecha_inicio, fecha_fin')
          .eq('id', periodId)
          .single();

        if (error) {
          console.error('Error loading period date:', error);
          setCurrentPeriodDate(new Date());
          return;
        }

        if (periodData?.fecha_inicio) {
          const fechaPeriodo = new Date(periodData.fecha_inicio);
          setCurrentPeriodDate(fechaPeriodo);
          console.log('📅 Period date loaded successfully:', fechaPeriodo.toISOString().split('T')[0]);
        } else {
          console.warn('No period date found, using current date');
          setCurrentPeriodDate(new Date());
        }
      } catch (error) {
        console.error('Error loading period date:', error);
        setCurrentPeriodDate(new Date());
      }
    };

    if (isOpen && periodId) {
      loadPeriodDate();
    }
  }, [isOpen, periodId]);

  const loadNovedades = useCallback(async () => {
    if (!isOpen || !employeeId || !periodId) return;
    
    try {
      setIsLoading(true);
      console.log('🔍 Loading novedades for employee in modal:', employeeId, 'period:', periodId);
      
      const data = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);
      
      // Filtrar por tipo de modal
      const filteredNovedades = data.filter(novedad => {
        const isDevengado = ['horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 
                            'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(novedad.tipo_novedad);
        
        return modalType === 'devengado' ? isDevengado : !isDevengado;
      });
      
      setNovedades(filteredNovedades);
      console.log('✅ Loaded novedades:', filteredNovedades);
    } catch (error) {
      console.error('Error loading novedades:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las novedades",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, employeeId, periodId, modalType, toast]);

  useEffect(() => {
    loadNovedades();
  }, [loadNovedades]);

  // Función de cálculo mejorada con jornada legal dinámica y fecha correcta del período
  const calculateSuggestedValue = useCallback((
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    try {
      if (!employeeSalary || employeeSalary <= 0) return null;
      
      console.log('🧮 Calculating with period-specific legal workday');
      console.log('📅 Using period date:', currentPeriodDate.toISOString().split('T')[0]);
      console.log('💰 Employee salary:', employeeSalary);
      console.log('⏰ Hours:', horas, 'Days:', dias);
      
      // Usar el sistema de cálculo mejorado con fecha exacta del período
      const resultado = calcularValorNovedadEnhanced(
        tipoNovedad,
        subtipo,
        employeeSalary,
        dias,
        horas,
        currentPeriodDate // Usar fecha exacta del período para cálculos históricos precisos
      );
      
      console.log(`💰 Calculated value with period-specific legal workday for ${tipoNovedad}:`, resultado.valor);
      console.log(`📊 Calculation details:`, resultado.baseCalculo.detalle_calculo);
      
      return resultado.valor > 0 ? resultado.valor : null;
    } catch (error) {
      console.error('Error calculating suggested value:', error);
      return null;
    }
  }, [employeeSalary, currentPeriodDate]);

  const recalculateEmployeeTotals = async () => {
    try {
      console.log('🔄 Triggering employee totals recalculation with correct deductions...');
      await PayrollHistoryService.recalculateEmployeeTotalsWithNovedades(employeeId, periodId);
      console.log('✅ Employee totals recalculated successfully with correct deductions');
    } catch (error) {
      console.error('❌ Error recalculating employee totals:', error);
    }
  };

  const handleCreateNovedad = async () => {
    if (formData.valor <= 0) {
      toast({
        title: "Error",
        description: "El valor debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    if (!formData.empleado_id || !formData.periodo_id) {
      toast({
        title: "Error",
        description: "Faltan datos requeridos (empleado o período)",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      console.log('📝 Creating novedad with data:', {
        ...formData,
        employeeId: formData.empleado_id,
        periodId: formData.periodo_id
      });
      
      // Usar el servicio mejorado
      const newNovedad = await NovedadesEnhancedService.createNovedad(formData);

      if (newNovedad) {
        console.log('✅ Novedad created, now recalculating totals with correct deductions...');
        
        // CRITICAL: Recalcular totales del empleado después de crear la novedad
        // Ahora incluye el cálculo correcto de deducciones
        await recalculateEmployeeTotals();
        
        await loadNovedades();
        setShowForm(false);
        setEditingNovedad(null);
        
        // Reset form
        setFormData({
          empleado_id: employeeId,
          periodo_id: periodId,
          tipo_novedad: modalType === 'devengado' ? 'horas_extra' as NovedadType : 'ausencia' as NovedadType,
          subtipo: modalType === 'devengado' ? 'diurnas' : undefined,
          fecha_inicio: '',
          fecha_fin: '',
          dias: null,
          horas: null,
          valor: 0,
          observacion: ''
        });
        
        // Notificar al componente padre para que refresque la vista
        if (onNovedadCreated) {
          onNovedadCreated(employeeId, newNovedad.valor, modalType);
        }

        toast({
          title: "Novedad creada",
          description: `Se ha creado la novedad de tipo ${formData.tipo_novedad} por ${formatCurrency(newNovedad.valor)}${modalType === 'deduccion' ? ' y se han recalculado las deducciones correctamente' : ''}`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error creating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la novedad. Verifique los datos ingresados.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNovedad = async () => {
    if (!editingNovedad || formData.valor <= 0) return;

    try {
      setIsSubmitting(true);
      
      const updatedNovedad = await NovedadesEnhancedService.updateNovedad(
        editingNovedad.id,
        formData
      );

      if (updatedNovedad) {
        console.log('✅ Novedad updated, now recalculating totals with correct deductions...');
        
        // CRITICAL: Recalcular totales del empleado después de actualizar la novedad
        // Ahora incluye el cálculo correcto de deducciones
        await recalculateEmployeeTotals();
        
        await loadNovedades();
        setEditingNovedad(null);
        setShowForm(false);

        if (onNovedadCreated) {
          onNovedadCreated(employeeId, updatedNovedad.valor, modalType);
        }

        toast({
          title: "Novedad actualizada",
          description: `La novedad se ha actualizado correctamente${modalType === 'deduccion' ? ' y se han recalculado las deducciones' : ''}`,
        });
      }
    } catch (error) {
      console.error('Error updating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la novedad",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    try {
      setIsLoading(true);
      await NovedadesEnhancedService.deleteNovedad(novedadId);
      
      console.log('✅ Novedad deleted, now recalculating totals with correct deductions...');
      
      // CRITICAL: Recalcular totales del empleado después de eliminar la novedad
      // Ahora incluye el cálculo correcto de deducciones
      await recalculateEmployeeTotals();
      
      await loadNovedades();

      if (onNovedadCreated) {
        onNovedadCreated(employeeId, 0, modalType);
      }

      toast({
        title: "Novedad eliminada",
        description: `La novedad se ha eliminado correctamente${modalType === 'deduccion' ? ' y se han recalculado las deducciones' : ''}`,
      });
    } catch (error) {
      console.error('Error deleting novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la novedad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditNovedad = (novedad: NovedadDisplay) => {
    setEditingNovedad(novedad);
    setFormData({
      empleado_id: employeeId,
      periodo_id: periodId,
      tipo_novedad: novedad.tipo_novedad,
      valor: novedad.valor,
      horas: novedad.horas || null,
      dias: novedad.dias || null,
      observacion: novedad.observacion || '',
      fecha_inicio: novedad.fecha_inicio || '',
      fecha_fin: novedad.fecha_fin || '',
      subtipo: (novedad as any).subtipo || ''
    });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingNovedad(null);
    setFormData({
      empleado_id: employeeId,
      periodo_id: periodId,
      tipo_novedad: modalType === 'devengado' ? 'horas_extra' as NovedadType : 'ausencia' as NovedadType,
      subtipo: modalType === 'devengado' ? 'diurnas' : undefined,
      fecha_inicio: '',
      fecha_fin: '',
      dias: null,
      horas: null,
      valor: 0,
      observacion: ''
    });
  };

  const totalValue = novedades.reduce((sum, novedad) => sum + novedad.valor, 0);

  const getNovedadLabel = (tipo: NovedadType): string => {
    const labels: Record<NovedadType, string> = {
      horas_extra: 'Horas Extra',
      recargo_nocturno: 'Recargo Nocturno',
      vacaciones: 'Vacaciones',
      licencia_remunerada: 'Licencia Remunerada',
      incapacidad: 'Incapacidad',
      bonificacion: 'Bonificación',
      comision: 'Comisión',
      prima: 'Prima',
      otros_ingresos: 'Otros Ingresos',
      libranza: 'Libranza',
      multa: 'Multa',
      ausencia: 'Ausencia',
      descuento_voluntario: 'Descuento Voluntario',
      retencion_fuente: 'Retención en la Fuente',
      fondo_solidaridad: 'Fondo de Solidaridad',
      salud: 'Salud',
      pension: 'Pensión',
      arl: 'ARL',
      caja_compensacion: 'Caja de Compensación',
      icbf: 'ICBF',
      sena: 'SENA'
    };
    return labels[tipo] || tipo;
  };

  const isFormValid = formData.valor > 0 && formData.empleado_id && formData.periodo_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <span className="text-lg font-semibold">
                  {modalType === 'devengado' ? 'Devengados' : 'Deducciones'} - {employeeName}
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Salario: {formatCurrency(employeeSalary)}
                  </Badge>
                  <JornadaLegalTooltip fecha={currentPeriodDate} />
                  {modalType === 'deduccion' && (
                    <Badge variant="secondary" className="text-xs">
                      Con cálculo correcto de IBC y retención
                    </Badge>
                  )}
                </div>
              </div>
              <Badge 
                variant={modalType === 'devengado' ? 'default' : 'destructive'}
                className="text-sm px-3 py-1"
              >
                Total: {formatCurrency(totalValue)}
              </Badge>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {!showForm ? (
            <>
              {/* List header */}
              <div className="flex justify-between items-center px-6 pb-4">
                <div className="text-sm text-gray-600">
                  {novedades.length} {modalType === 'devengado' ? 'devengados' : 'deducciones'} registradas
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar {modalType}</span>
                </Button>
              </div>

              {/* Scrollable list */}
              <ScrollArea className="flex-1 px-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : novedades.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay {modalType === 'devengado' ? 'devengados' : 'deducciones'}
                    </h3>
                    <p className="text-gray-600">
                      Haz clic en "Agregar {modalType}" para comenzar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-6">
                    {novedades.map((novedad) => (
                      <div key={novedad.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{getNovedadLabel(novedad.tipo_novedad)}</h4>
                              {(novedad.horas || novedad.dias) && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {novedad.horas && `${novedad.horas}h`}
                                    {novedad.horas && novedad.dias && ' - '}
                                    {novedad.dias && `${novedad.dias}d`}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              {novedad.observacion && (
                                <div>
                                  <strong>Observación:</strong> {novedad.observacion}
                                </div>
                              )}
                              {novedad.fecha_inicio && novedad.fecha_fin && (
                                <div>
                                  <strong>Período:</strong> {novedad.fecha_inicio} a {novedad.fecha_fin}
                                </div>
                              )}
                              {novedad.base_calculo?.detalle_calculo && (
                                <div className="text-xs bg-gray-100 p-2 rounded">
                                  <strong>Cálculo:</strong> {novedad.base_calculo.detalle_calculo}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 ml-4">
                            <div className="text-right">
                              <div className={`font-semibold ${
                                modalType === 'devengado' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {modalType === 'devengado' ? '+' : '-'}{formatCurrency(novedad.valor)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditNovedad(novedad)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNovedad(novedad.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Form header */}
              <div className="flex items-center justify-between px-6 pb-4">
                <h3 className="text-lg font-medium">
                  {editingNovedad ? 'Editar' : 'Agregar'} {modalType}
                </h3>
              </div>

              {/* Scrollable form */}
              <ScrollArea className="flex-1 px-6">
                <div className="pb-6">
                  <NovedadForm
                    formData={formData}
                    onFormDataChange={setFormData}
                    initialData={editingNovedad ? {
                      tipo_novedad: editingNovedad.tipo_novedad,
                      valor: editingNovedad.valor,
                      horas: editingNovedad.horas || null,
                      dias: editingNovedad.dias || null,
                      observacion: editingNovedad.observacion || '',
                      fecha_inicio: editingNovedad.fecha_inicio || '',
                      fecha_fin: editingNovedad.fecha_fin || ''
                    } : undefined}
                    employeeSalary={employeeSalary}
                    calculateSuggestedValue={calculateSuggestedValue}
                    modalType={modalType}
                  />
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="border-t bg-white p-6">
          {showForm ? (
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelForm}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={editingNovedad ? handleUpdateNovedad : handleCreateNovedad}
                disabled={!isFormValid || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calculator className="h-4 w-4" />
                <span>
                  {modalType === 'devengado' 
                    ? 'Cálculos actualizados con jornada legal dinámica'
                    : 'Deducciones calculadas con IBC correcto, tope 25 SMMLV y retención en la fuente'
                  }
                </span>
              </div>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
