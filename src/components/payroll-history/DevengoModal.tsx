
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
  Clock,
  AlertCircle,
  Loader2,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { NovedadForm } from '@/components/payroll/novedades/NovedadForm';
import { formatCurrency } from '@/lib/utils';
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

interface BasicConcepts {
  salarioBase: number;
  auxilioTransporte: number;
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
  const [basicConcepts, setBasicConcepts] = useState<BasicConcepts>({
    salarioBase: 0,
    auxilioTransporte: 0
  });
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

  // Enhanced period date loading
  useEffect(() => {
    const loadPeriodDate = async () => {
      try {
        // First check payroll_periods_real table
        const { data: periodDataReal } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('id', periodId);

        // Then check payroll_periods table as fallback
        const { data: periodDataRegular } = await supabase
          .from('payroll_periods')
          .select('*')
          .eq('id', periodId);

        // Use the first period found
        const periodData = periodDataReal?.[0] || periodDataRegular?.[0];

        if (periodData?.fecha_inicio) {
          const fechaPeriodo = new Date(periodData.fecha_inicio);
          setCurrentPeriodDate(fechaPeriodo);
        } else {
          setCurrentPeriodDate(new Date());
        }
      } catch (error) {
        console.error('❌ Error loading period date:', error);
        setCurrentPeriodDate(new Date());
      }
    };

    if (isOpen && periodId) {
      loadPeriodDate();
    }
  }, [isOpen, periodId]);

  // Load basic payroll concepts (salary + transport aid)
  const loadBasicConcepts = useCallback(async () => {
    if (!isOpen || !payrollId) return;
    
    try {
      const { data: payrollData, error } = await supabase
        .from('payrolls')
        .select('salario_base, auxilio_transporte')
        .eq('id', payrollId)
        .single();

      if (error) {
        console.error('❌ Error loading payroll data:', error);
        return;
      }
      
      setBasicConcepts({
        salarioBase: Number(payrollData?.salario_base || 0),
        auxilioTransporte: Number(payrollData?.auxilio_transporte || 0)
      });
      
    } catch (error) {
      console.error('❌ Error loading basic concepts:', error);
    }
  }, [isOpen, payrollId]);

  const loadNovedades = useCallback(async () => {
    if (!isOpen || !employeeId || !periodId) return;
    
    try {
      setIsLoading(true);
      
      // Try direct service call first
      const data = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);
      
      // Filtrar por tipo de modal
      const filteredNovedades = (data || []).filter(novedad => {
        const isDevengado = ['horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 
                            'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(novedad.tipo_novedad);
        
        return modalType === 'devengado' ? isDevengado : !isDevengado;
      });
      
      setNovedades(filteredNovedades);
      
    } catch (error) {
      console.error('❌ Error loading novedades:', error);
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
    if (isOpen) {
      loadBasicConcepts();
      loadNovedades();
    }
  }, [loadBasicConcepts, loadNovedades, isOpen]);

  const calculateSuggestedValue = useCallback((
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    try {
      if (!employeeSalary || employeeSalary <= 0) return null;
      
      const resultado = calcularValorNovedadEnhanced(
        tipoNovedad,
        subtipo,
        employeeSalary,
        dias,
        horas,
        currentPeriodDate
      );
      
      return resultado.valor > 0 ? resultado.valor : null;
    } catch (error) {
      console.error('Error calculating suggested value:', error);
      return null;
    }
  }, [employeeSalary, currentPeriodDate]);

  const recalculateEmployeeTotals = async () => {
    try {
      await PayrollHistoryService.recalculateEmployeeTotalsWithNovedades(employeeId, periodId);
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
      
      const newNovedad = await NovedadesEnhancedService.createNovedad(formData);

      if (newNovedad) {
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
        
        if (onNovedadCreated) {
          onNovedadCreated(employeeId, newNovedad.valor, modalType);
        }

        toast({
          title: "Novedad creada",
          description: `Se ha creado la novedad de tipo ${formData.tipo_novedad} por ${formatCurrency(newNovedad.valor)}`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
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
        await recalculateEmployeeTotals();
        await loadNovedades();
        setEditingNovedad(null);
        setShowForm(false);

        if (onNovedadCreated) {
          onNovedadCreated(employeeId, updatedNovedad.valor, modalType);
        }

        toast({
          title: "Novedad actualizada",
          description: `La novedad se ha actualizado correctamente`,
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
      
      await recalculateEmployeeTotals();
      await loadNovedades();

      if (onNovedadCreated) {
        onNovedadCreated(employeeId, 0, modalType);
      }

      toast({
        title: "Novedad eliminada",
        description: `La novedad se ha eliminado correctamente`,
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

  const totalNovedades = novedades.reduce((sum, novedad) => sum + novedad.valor, 0);
  const totalBasicConcepts = modalType === 'devengado' 
    ? basicConcepts.salarioBase + basicConcepts.auxilioTransporte 
    : 0;
  const totalValue = totalBasicConcepts + totalNovedades;

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

  const renderBasicConcepts = () => {
    // Only show basic concepts for devengado type and when there are values
    if (modalType !== 'devengado' || (basicConcepts.salarioBase === 0 && basicConcepts.auxilioTransporte === 0)) {
      return null;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Conceptos Básicos</span>
          </h4>
          <Badge variant="default" className="text-sm">
            {formatCurrency(totalBasicConcepts)}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {basicConcepts.salarioBase > 0 && (
            <div className="border rounded-lg p-2 bg-blue-50">
              <div className="text-center">
                <span className="font-medium text-xs">Salario Base</span>
                <div className="text-green-700 font-semibold text-sm">
                  +{formatCurrency(basicConcepts.salarioBase)}
                </div>
              </div>
            </div>
          )}
          
          {basicConcepts.auxilioTransporte > 0 && (
            <div className="border rounded-lg p-2 bg-blue-50">
              <div className="text-center">
                <span className="font-medium text-xs">Auxilio Transporte</span>
                <div className="text-green-700 font-semibold text-sm">
                  +{formatCurrency(basicConcepts.auxilioTransporte)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isFormValid = formData.valor > 0 && formData.empleado_id && formData.periodo_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        {/* Simplified Header */}
        <div className="p-4 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <span className="text-lg font-semibold">
                  {modalType === 'devengado' ? 'Devengados' : 'Deducciones'} - {employeeName}
                </span>
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
              <div className="flex justify-between items-center px-4 pb-2">
                <div className="text-sm text-gray-600">
                  {modalType === 'devengado' 
                    ? `${totalBasicConcepts > 0 ? 'Conceptos básicos + ' : ''}${novedades.length} novedades`
                    : `${novedades.length} deducciones`
                  }
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar</span>
                </Button>
              </div>

              {/* Scrollable list */}
              <ScrollArea className="flex-1 px-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {/* Basic Concepts Section */}
                    {renderBasicConcepts()}
                    
                    {/* Separator between basic and additional concepts */}
                    {modalType === 'devengado' && totalBasicConcepts > 0 && novedades.length > 0 && (
                      <Separator />
                    )}
                    
                    {/* Additional Novedades Section */}
                    <div className="space-y-2">
                      {modalType === 'devengado' && totalBasicConcepts > 0 && novedades.length > 0 && (
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">Novedades Adicionales</h4>
                          <Badge variant="outline" className="text-sm">
                            {formatCurrency(totalNovedades)}
                          </Badge>
                        </div>
                      )}
                      
                      {novedades.length === 0 ? (
                        <div className="text-center py-6">
                          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {modalType === 'devengado' ? 'No hay novedades adicionales' : 'No hay deducciones'}
                          </h3>
                          <p className="text-xs text-gray-600">
                            Haz clic en "Agregar" para comenzar
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {novedades.map((novedad) => (
                            <div key={novedad.id} className="border rounded-lg p-3 hover:bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="font-medium text-sm">{getNovedadLabel(novedad.tipo_novedad)}</h4>
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
                                  
                                  {novedad.observacion && (
                                    <div className="text-xs text-gray-600">
                                      {novedad.observacion}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                  <div className="text-right">
                                    <div className={`font-semibold text-sm ${
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
                                      className="h-8 px-2 text-xs"
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteNovedad(novedad.id)}
                                      className="h-8 px-2 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Form header */}
              <div className="flex items-center justify-between px-4 pb-2">
                <h3 className="text-lg font-medium">
                  {editingNovedad ? 'Editar' : 'Agregar'} {modalType}
                </h3>
              </div>

              {/* Scrollable form */}
              <ScrollArea className="flex-1 px-4">
                <div className="pb-4">
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

        {/* Simplified Footer */}
        <div className="border-t bg-white p-4">
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
            <div className="flex justify-end">
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
