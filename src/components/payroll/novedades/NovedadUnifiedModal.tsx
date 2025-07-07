
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
  Loader2,
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced, PayrollNovedad } from '@/types/novedades-enhanced';
import { NovedadForm } from '@/components/payroll/novedades/NovedadForm';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface NovedadUnifiedModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  employeeId: string;
  employeeSalary: number;
  periodId: string;
  onSubmit?: (data: CreateNovedadData) => Promise<void>;
  selectedNovedadType?: NovedadType | null;
  onClose?: () => void;
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
  subtipo?: string;
}

export const NovedadUnifiedModal = ({
  open,
  setOpen,
  employeeId,
  employeeSalary,
  periodId,
  onSubmit,
  selectedNovedadType,
  onClose
}: NovedadUnifiedModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novedades, setNovedades] = useState<NovedadDisplay[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<NovedadDisplay | null>(null);
  const [currentPeriodDate, setCurrentPeriodDate] = useState<Date>(new Date());

  // Form state
  const [formData, setFormData] = useState<CreateNovedadData>({
    empleado_id: employeeId,
    periodo_id: periodId,
    tipo_novedad: 'horas_extra' as NovedadType,
    subtipo: 'diurnas',
    fecha_inicio: '',
    fecha_fin: '',
    dias: undefined,
    horas: undefined,
    valor: 0,
    observacion: '',
    company_id: ''
  });

  // Get company_id on modal open
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

    if (open) {
      getCompanyId();
    }
  }, [open]);

  // Update formData when props change
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        empleado_id: employeeId,
        periodo_id: periodId,
        tipo_novedad: 'horas_extra' as NovedadType,
        subtipo: 'diurnas',
        fecha_inicio: '',
        fecha_fin: '',
        dias: undefined,
        horas: undefined,
        valor: 0,
        observacion: ''
      }));
    }
  }, [open, employeeId, periodId]);

  // Load period date
  useEffect(() => {
    const loadPeriodDate = async () => {
      try {
        const { data: periodDataReal } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('id', periodId);

        const { data: periodDataRegular } = await supabase
          .from('payroll_periods')
          .select('*')
          .eq('id', periodId);

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

    if (open && periodId) {
      loadPeriodDate();
    }
  }, [open, periodId]);

  const loadNovedades = useCallback(async () => {
    if (!open || !employeeId || !periodId) return;
    
    console.log('🔄 Cargando novedades para empleado:', employeeId, 'período:', periodId);
    
    try {
      setIsLoading(true);
      
      const data = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);
      
      setNovedades(data || []);
      console.log('✅ Novedades cargadas:', data?.length || 0);
      
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
  }, [open, employeeId, periodId, toast]);

  useEffect(() => {
    if (open) {
      loadNovedades();
    }
  }, [loadNovedades, open]);

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
      
      console.log('🔄 Creando novedad y ejecutando callback de sincronización');
      
      // Execute parent callback if provided
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Fallback to direct creation
        await NovedadesEnhancedService.createNovedad(formData);
      }
      
      // Reload local novedades
      await loadNovedades();
      
      setShowForm(false);
      setEditingNovedad(null);
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        tipo_novedad: 'horas_extra' as NovedadType,
        subtipo: 'diurnas',
        fecha_inicio: '',
        fecha_fin: '',
        dias: undefined,
        horas: undefined,
        valor: 0,
        observacion: ''
      }));

      toast({
        title: "Novedad creada",
        description: `Se ha creado la novedad de tipo ${formData.tipo_novedad} por ${formatCurrency(formData.valor)}`,
        duration: 3000
      });
      
      console.log('✅ Novedad creada y callback ejecutado exitosamente');
      
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
      
      console.log('🔄 Actualizando novedad con callback de sincronización');
      
      const updatedNovedad = await NovedadesEnhancedService.updateNovedad(
        editingNovedad.id,
        formData
      );

      if (updatedNovedad) {
        await loadNovedades();
        setEditingNovedad(null);
        setShowForm(false);

        toast({
          title: "Novedad actualizada",
          description: `La novedad se ha actualizado correctamente`,
        });
        
        console.log('✅ Novedad actualizada exitosamente');
      }
    } catch (error) {
      console.error('❌ Error updating novedad:', error);
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
    console.log('🗑️ Eliminando novedad con callback de sincronización:', novedadId);
    
    try {
      setIsLoading(true);
      
      await NovedadesEnhancedService.deleteNovedad(novedadId);
      
      // Reload local novedades
      await loadNovedades();

      toast({
        title: "Novedad eliminada",
        description: `La novedad se ha eliminado correctamente`,
      });
      
      console.log('✅ Novedad eliminada exitosamente');
      
    } catch (error) {
      console.error('❌ Error deleting novedad:', error);
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
      subtipo: novedad.subtipo || ''
    }));
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingNovedad(null);
    setFormData(prev => ({
      ...prev,
      tipo_novedad: 'horas_extra' as NovedadType,
      subtipo: 'diurnas',
      fecha_inicio: '',
      fecha_fin: '',
      dias: undefined,
      horas: undefined,
      valor: 0,
      observacion: ''
    }));
  };

  const handleClose = () => {
    console.log('🔄 Cerrando modal y ejecutando callback de cierre');
    setOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const totalNovedades = novedades.reduce((sum, novedad) => sum + novedad.valor, 0);

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

  const isFormValid = formData.valor > 0 && formData.empleado_id && formData.periodo_id && formData.company_id;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        {/* Header */}
        <div className="p-4 pb-3 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Gestionar Novedades
              </div>
              {totalNovedades > 0 && (
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Total: {formatCurrency(totalNovedades)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {!showForm ? (
            <>
              {/* Add button header */}
              <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {novedades.length} novedad{novedades.length !== 1 ? 'es' : ''}
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar Novedad</span>
                </Button>
              </div>

              {/* Scrollable list */}
              <ScrollArea className="flex-1 px-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="py-4">
                    {novedades.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          No hay novedades registradas
                        </h3>
                        <p className="text-xs text-gray-600">
                          Haz clic en "Agregar Novedad" para comenzar
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {novedades.map((novedad) => (
                          <div key={novedad.id} className="flex items-center justify-between py-3 px-3 rounded-lg border hover:bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{getNovedadLabel(novedad.tipo_novedad)}</span>
                                {novedad.subtipo && (
                                  <Badge variant="outline" className="text-xs">{novedad.subtipo}</Badge>
                                )}
                              </div>
                              {novedad.observacion && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {novedad.observacion}
                                </div>
                              )}
                              {(novedad.horas || novedad.dias) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {novedad.horas && `${novedad.horas} horas`}
                                  {novedad.dias && `${novedad.dias} días`}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="font-semibold text-sm text-green-700">
                                +{formatCurrency(novedad.valor)}
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditNovedad(novedad)}
                                  className="h-8 px-2 text-xs"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
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
                  {editingNovedad ? 'Editar' : 'Agregar'} Novedad
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
                    modalType="devengado"
                  />
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Footer */}
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
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
