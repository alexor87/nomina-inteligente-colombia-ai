

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Trash2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced, PayrollNovedad } from '@/types/novedades-enhanced';
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
    dias: undefined,
    horas: undefined,
    valor: 0,
    observacion: '',
    company_id: '' // ✅ AGREGADO - Será llenado automáticamente
  });

  // ✅ CORRECCIÓN: Obtener company_id al cargar el modal
  useEffect(() => {
    const getCompanyId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.company_id) {
            setFormData(prev => ({
              ...prev,
              company_id: profile.company_id
            }));
          }
        }
      } catch (error) {
        console.error('Error getting company ID:', error);
      }
    };

    if (isOpen) {
      getCompanyId();
    }
  }, [isOpen]);

  // Actualizar formData cuando cambien las props
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        empleado_id: employeeId,
        periodo_id: periodId,
        tipo_novedad: modalType === 'devengado' ? 'horas_extra' as NovedadType : 'ausencia' as NovedadType,
        subtipo: modalType === 'devengado' ? 'diurnas' : undefined,
        fecha_inicio: '',
        fecha_fin: '',
        dias: undefined,
        horas: undefined,
        valor: 0,
        observacion: ''
      }));
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

    if (!formData.empleado_id || !formData.periodo_id || !formData.company_id) {
      toast({
        title: "Error",
        description: "Faltan datos requeridos (empleado, período o empresa)",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // ✅ CORRECCIÓN: El servicio ahora devuelve PayrollNovedad directamente
      const newNovedad = await NovedadesEnhancedService.createNovedad(formData);

      if (newNovedad) {
        await recalculateEmployeeTotals();
        await loadNovedades();
        setShowForm(false);
        setEditingNovedad(null);
        
        // Reset form
        setFormData(prev => ({
          ...prev,
          tipo_novedad: modalType === 'devengado' ? 'horas_extra' as NovedadType : 'ausencia' as NovedadType,
          subtipo: modalType === 'devengado' ? 'diurnas' : undefined,
          fecha_inicio: '',
          fecha_fin: '',
          dias: undefined,
          horas: undefined,
          valor: 0,
          observacion: ''
        }));
        
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
      
      // ✅ CORRECCIÓN: El servicio ahora devuelve PayrollNovedad directamente
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
    setFormData(prev => ({
      ...prev,
      tipo_novedad: novedad.tipo_novedad,
      valor: novedad.valor,
      horas: novedad.horas || undefined,
      dias: novedad.dias || undefined,
      observacion: novedad.observacion || '',
      fecha_inicio: novedad.fecha_inicio || '',
      fecha_fin: novedad.fecha_fin || '',
      subtipo: (novedad as any).subtipo || ''
    }));
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingNovedad(null);
    setFormData(prev => ({
      ...prev,
      tipo_novedad: modalType === 'devengado' ? 'horas_extra' as NovedadType : 'ausencia' as NovedadType,
      subtipo: modalType === 'devengado' ? 'diurnas' : undefined,
      fecha_inicio: '',
      fecha_fin: '',
      dias: undefined,
      horas: undefined,
      valor: 0,
      observacion: ''
    }));
  };

  const totalNovedades = novedades.reduce((sum, novedad) => sum + novedad.valor, 0);
  const totalBasicConcepts = modalType === 'devengado' 
    ? basicConcepts.salarioBase + basicConcepts.auxilioTransporte 
    : 0;
  const totalValue = totalBasicConcepts + totalNovedades;

  // ✅ CORRECCIÓN: Complete all NovedadType labels to fix TS2740
  const getNovedadLabel = (tipo: NovedadType): string => {
    const labels: Record<NovedadType, string> = {
      horas_extra: 'Horas Extra',
      recargo_nocturno: 'Recargo Nocturno',
      vacaciones: 'Vacaciones',
      licencia_remunerada: 'Licencia Remunerada',
      incapacidad: 'Incapacidad',
      bonificacion: 'Bonificación',
      bonificacion_salarial: 'Bonificación Salarial',
      bonificacion_no_salarial: 'Bonificación No Salarial',
      comision: 'Comisión',
      prima: 'Prima',
      otros_ingresos: 'Otros Ingresos',
      auxilio_conectividad: 'Auxilio de Conectividad',
      viaticos: 'Viáticos',
      retroactivos: 'Retroactivos',
      compensacion_ordinaria: 'Compensación Ordinaria',
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
      sena: 'SENA',
      embargo: 'Embargo',
      anticipo: 'Anticipo',
      aporte_voluntario: 'Aporte Voluntario'
    };
    return labels[tipo] || tipo;
  };

  // ✅ CORRECCIÓN: Definir conceptsList correctamente
  const conceptsList = React.useMemo(() => {
    const concepts = [];
    
    // Add basic concepts for devengado
    if (modalType === 'devengado') {
      if (basicConcepts.salarioBase > 0) {
        concepts.push({
          id: 'salario-base',
          label: 'Salario Base',
          value: basicConcepts.salarioBase,
          isBasic: true
        });
      }
      
      if (basicConcepts.auxilioTransporte > 0) {
        concepts.push({
          id: 'auxilio-transporte', 
          label: 'Auxilio Transporte',
          value: basicConcepts.auxilioTransporte,
          isBasic: true
        });
      }
    }
    
    // Add novedades
    novedades.forEach(novedad => {
      concepts.push({
        id: novedad.id,
        label: getNovedadLabel(novedad.tipo_novedad),
        value: novedad.valor,
        isBasic: false,
        novedad: novedad
      });
    });
    
    return concepts;
  }, [modalType, basicConcepts, novedades]);

  const isFormValid = formData.valor > 0 && formData.empleado_id && formData.periodo_id && formData.company_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        {/* Simplified Header */}
        <div className="p-4 pb-3 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                {modalType === 'devengado' ? 'Devengados' : 'Deducciones'} - {employeeName}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {!showForm ? (
            <>
              {/* Simplified summary header */}
              <div className="px-4 py-3 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">
                    Total: {formatCurrency(totalValue)}
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
              </div>

              {/* Scrollable list */}
              <ScrollArea className="flex-1 px-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="py-4">
                    {conceptsList.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {modalType === 'devengado' ? 'No hay conceptos de devengo' : 'No hay deducciones'}
                        </h3>
                        <p className="text-xs text-gray-600">
                          Haz clic en "Agregar" para comenzar
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {conceptsList.map((concept) => (
                          <div key={concept.id} className="flex items-center justify-between py-3 px-3 rounded-lg border hover:bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{concept.label}</span>
                                {concept.isBasic && (
                                  <Badge variant="outline" className="text-xs">Básico</Badge>
                                )}
                              </div>
                              {concept.novedad?.observacion && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {concept.novedad.observacion}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className={`font-semibold text-sm ${
                                modalType === 'devengado' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {modalType === 'devengado' ? '+' : '-'}{formatCurrency(concept.value)}
                              </div>
                              
                              {!concept.isBasic && concept.novedad && (
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditNovedad(concept.novedad!)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteNovedad(concept.novedad!.id)}
                                    className="h-8 px-2 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Form header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-lg font-medium">
                  {editingNovedad ? 'Editar' : 'Agregar'} {modalType}
                </h3>
              </div>

              {/* Scrollable form */}
              <ScrollArea className="flex-1 px-4">
                <div className="py-4">
                  <NovedadForm
                    formData={formData}
                    onFormDataChange={setFormData}
                    initialData={editingNovedad ? {
                      tipo_novedad: editingNovedad.tipo_novedad,
                      valor: editingNovedad.valor,
                      horas: editingNovedad.horas || undefined,
                      dias: editingNovedad.dias || undefined,
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
        <div className="p-4 border-t bg-gray-50">
          {showForm ? (
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelForm}>
                Cancelar
              </Button>
              <Button 
                onClick={editingNovedad ? handleUpdateNovedad : handleCreateNovedad}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingNovedad ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  editingNovedad ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {conceptsList.length} concepto{conceptsList.length !== 1 ? 's' : ''}
              </p>
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

export default DevengoModal;

