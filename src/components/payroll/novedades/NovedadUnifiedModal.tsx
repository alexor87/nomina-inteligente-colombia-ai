
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { NovedadIncapacidadForm } from './forms/NovedadIncapacidadForm';
import { NovedadLicenciasForm } from './forms/NovedadLicenciasForm';
import { NovedadHorasExtraConsolidatedForm } from './forms/NovedadHorasExtraConsolidatedForm';
import { NovedadBonificacionesConsolidatedForm } from './forms/NovedadBonificacionesConsolidatedForm';
import { NovedadIngresosAdicionalesConsolidatedForm } from './forms/NovedadIngresosAdicionalesConsolidatedForm';
import { NovedadPrestamosConsolidatedForm } from './forms/NovedadPrestamosConsolidatedForm';
import { NovedadDeduccionesConsolidatedForm } from './forms/NovedadDeduccionesConsolidatedForm';
import { NovedadRetefuenteForm } from './forms/NovedadRetefuenteForm';
import { NovedadTypeSelector, NovedadCategory } from './NovedadTypeSelector';
import { NovedadExistingList } from './NovedadExistingList';
import { NovedadType, CreateNovedadData } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';
import { NovedadRecargoConsolidatedForm } from './forms/NovedadRecargoConsolidatedForm';
import { NovedadVacacionesConsolidatedForm } from './forms/NovedadVacacionesConsolidatedForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { VacationAbsenceForm } from '@/components/vacations/VacationAbsenceForm';
import { VacationAbsenceFormData, VacationAbsenceType } from '@/types/vacations';
import { useVacationEmployees } from '@/hooks/useVacationEmployees';

interface NovedadUnifiedModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  employeeId: string | undefined;
  employeeSalary: number | undefined;
  periodId: string | undefined;
  onSubmit: (data: CreateNovedadData) => Promise<void>;
  onClose?: () => void;
  selectedNovedadType: NovedadType | null;
  onEmployeeNovedadesChange?: (employeeId: string) => Promise<void>;
  startDate?: string;
  endDate?: string;
  mode?: 'liquidacion' | 'ajustes';
  companyId?: string | null;
}

const categoryToNovedadType: Record<NovedadCategory, NovedadType> = {
  'horas_extra': 'horas_extra',
  'recargo_nocturno': 'recargo_nocturno',
  'vacaciones': 'vacaciones',
  'incapacidades': 'incapacidad',
  'licencias': 'licencia_remunerada',
  'bonificaciones': 'bonificacion',
  'ingresos_adicionales': 'otros_ingresos',
  'deducciones_especiales': 'descuento_voluntario',
  'deducciones': 'descuento_voluntario',
  'prestamos': 'libranza',
  'retefuente': 'retencion_fuente'
};

// ✅ NUEVO: Mapeo de categorías que abren el modal de ausencias
const categoryToAbsenceType: Record<string, VacationAbsenceType> = {
  'vacaciones': 'vacaciones',
  'incapacidades': 'incapacidad',
  'licencias': 'licencia_remunerada'
};

const ABSENCE_CATEGORIES = ['vacaciones', 'incapacidades', 'licencias'];

export const NovedadUnifiedModal: React.FC<NovedadUnifiedModalProps> = ({
  open,
  setOpen,
  employeeId,
  employeeSalary,
  periodId,
  onSubmit,
  selectedNovedadType,
  onClose,
  onEmployeeNovedadesChange,
  startDate,
  endDate,
  mode = 'liquidacion',
  companyId
}) => {
  const [currentStep, setCurrentStep] = useState<'list' | 'selector' | 'form' | 'absence'>('list');
  const [selectedType, setSelectedType] = useState<NovedadType | null>(selectedNovedadType);
  const [selectedAbsenceType, setSelectedAbsenceType] = useState<VacationAbsenceType | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeFullName, setEmployeeFullName] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState<string>('');
  const [periodEndDate, setPeriodEndDate] = useState<string>('');
  const { toast } = useToast();
  
  const { calculateNovedad } = useNovedadBackendCalculation();

  // ✅ KISS: Fecha del período sin complejidad
  const getPeriodDate = useCallback(() => {
    if (startDate) {
      const date = new Date(startDate + 'T00:00:00');
      console.log('📅 Fecha período:', date.toISOString().split('T')[0]);
      return date;
    }
    return new Date();
  }, [startDate]);

  // ✅ Obtener fechas del período para validación
  useEffect(() => {
    const loadPeriodDates = async () => {
      if (!periodId) return;
      
      try {
        const { data: period } = await supabase
          .from('payroll_periods_real')
          .select('fecha_inicio, fecha_fin')
          .eq('id', periodId)
          .single();
        
        if (period) {
          setPeriodStartDate(period.fecha_inicio);
          setPeriodEndDate(period.fecha_fin);
        }
      } catch (error) {
        console.error('Error loading period dates:', error);
      }
    };

    loadPeriodDates();
  }, [periodId]);

  useEffect(() => {
    if (selectedNovedadType) {
      setSelectedType(selectedNovedadType);
      setCurrentStep('form');
    } else {
      // En modo ajustes, ir directamente al selector
      if (mode === 'ajustes') {
        setCurrentStep('selector');
      } else {
        setCurrentStep('list');
      }
      setSelectedType(null);
    }
  }, [selectedNovedadType, open, mode]);

  useEffect(() => {
    if (open) {
      setRefreshTrigger(Date.now());
      setIsSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    const loadEmployeeName = async () => {
      if (!employeeId) return;
      
      try {
        const { data: employee } = await supabase
          .from('employees')
          .select('nombre, apellido')
          .eq('id', employeeId)
          .single();
        
        if (employee) {
          const fullName = `${employee.nombre} ${employee.apellido}`;
          setEmployeeName(fullName);
          setEmployeeFullName(fullName);
        }
      } catch (error) {
        console.error('Error loading employee name:', error);
      }
    };

    loadEmployeeName();
  }, [employeeId]);

  const handleClose = () => {
    // Reset all states before closing
    setIsSubmitting(false);
    setCurrentStep('list');
    setSelectedType(null);
    setSelectedAbsenceType(null);
    setRefreshTrigger(0);
    setOpen(false);
    onClose?.();
  };

  const handleCategorySelect = (category: NovedadCategory) => {
    // ✅ NUEVO: Verificar si es una categoría que abre el modal de ausencias
    if (ABSENCE_CATEGORIES.includes(category)) {
      const absenceType = categoryToAbsenceType[category];
      setSelectedAbsenceType(absenceType);
      setCurrentStep('absence');
      console.log('🎯 Abriendo modal de ausencias para:', { category, absenceType });
      return;
    }

    // ✅ Comportamiento normal para otras categorías
    const novedadType = categoryToNovedadType[category];
    setSelectedType(novedadType);
    setCurrentStep('form');
  };

  const handleBackToSelector = () => {
    setCurrentStep('selector');
    setSelectedType(null);
    setSelectedAbsenceType(null);
  };

  const handleBackToList = () => {
    // En modo ajustes, cerrar el modal en lugar de ir a la lista
    if (mode === 'ajustes') {
      handleClose();
    } else {
      setCurrentStep('list');
      setSelectedType(null);
      setSelectedAbsenceType(null);
      setRefreshTrigger(Date.now());
    }
  };

  const handleAddNew = () => {
    setCurrentStep('selector');
  };

  const calculateSuggestedValue = useCallback(async (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): Promise<number | null> => {
    if (!employeeSalary) {
      console.warn('❌ Salario del empleado no definido');
      return null;
    }

    try {
      const fechaPeriodo = getPeriodDate().toISOString().split('T')[0];
      
      console.log('🎯 MODAL: Calculando novedad:', {
        tipo: tipoNovedad,
        subtipo,
        salario: employeeSalary,
        horas,
        dias,
        fecha: fechaPeriodo
      });

      const result = await calculateNovedad({
        tipoNovedad,
        subtipo,
        salarioBase: employeeSalary,
        horas,
        dias,
        fechaPeriodo
      });

      if (result) {
        console.log('✅ MODAL: Cálculo exitoso:', {
          tipo: subtipo || tipoNovedad,
          valor: result.valor,
          detalle: result.detalleCalculo
        });
        return result.valor;
      }

      return null;
    } catch (error) {
      console.error('❌ Error en cálculo:', error);
      return null;
    }
  }, [employeeSalary, getPeriodDate, calculateNovedad]);

  // ✅ NUEVO: Handler para envío de ausencias
  const handleAbsenceSubmit = async (formData: VacationAbsenceFormData, periodInfo?: any) => {
    if (!employeeId || !periodId || !companyId) {
      toast({
        title: "Error",
        description: "Faltan datos del empleado, período o empresa",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🎯 Procesando ausencia desde módulo de novedades:', {
        formData,
        periodInfo,
        employeeId,
        periodId,
        companyId
      });

      // ✅ Convertir datos de ausencia al formato de novedad
      const novedadData: CreateNovedadData = {
        empleado_id: employeeId,
        periodo_id: periodId,
        company_id: companyId,
        tipo_novedad: formData.type as NovedadType,
        subtipo: formData.subtipo,
        valor: 0, // Se calculará automáticamente en el backend
        dias: formData.start_date && formData.end_date 
          ? Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
          : undefined,
        fecha_inicio: formData.start_date,
        fecha_fin: formData.end_date,
        observacion: formData.observations
      };

      console.log('💾 Creando novedad desde ausencia:', novedadData);
      await onSubmit(novedadData);

      // ✅ Volver al módulo de novedades después de crear
      if (mode === 'ajustes') {
        handleClose();
      } else {
        setCurrentStep('list');
        setSelectedAbsenceType(null);
        setRefreshTrigger(Date.now());
      }

      toast({
        title: "✅ Éxito",
        description: "Ausencia registrada correctamente en el módulo de novedades",
        className: "border-green-200 bg-green-50"
      });

    } catch (error: any) {
      console.error('❌ Error procesando ausencia:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar la ausencia",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!employeeId || !periodId) {
      toast({
        title: "Error",
        description: "Faltan datos del empleado o período",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('📤 Form data received:', formData);
      
      const isArrayData = Array.isArray(formData);
      const dataArray = isArrayData ? formData : [formData];
      
      console.log(`🔄 Processing ${dataArray.length} novelty entries`);
      
      for (const entry of dataArray) {
        const submitData: CreateNovedadData = {
          empleado_id: employeeId,
          periodo_id: periodId,
          company_id: companyId || '',
          tipo_novedad: selectedType!,
          valor: entry.valor || 0,
          horas: entry.horas || undefined,
          dias: entry.dias || undefined,
          observacion: entry.observacion || undefined,
          fecha_inicio: entry.fecha_inicio || undefined,
          fecha_fin: entry.fecha_fin || undefined,
          subtipo: entry.subtipo || entry.tipo || undefined,
          base_calculo: entry.base_calculo || undefined
        };

        console.log('💾 Saving novelty entry:', submitData);
        await onSubmit(submitData);
      }
      
      console.log('✅ All novelty entries processed successfully');
      
      // En modo ajustes, cerrar el modal directamente
      if (mode === 'ajustes') {
        handleClose();
      } else {
        setCurrentStep('list');
        setSelectedType(null);
        setRefreshTrigger(Date.now());
      }
      
    } catch (error: any) {
      console.error('❌ Error processing novelties:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar las novedades",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNovedadForm = () => {
    if (!selectedType || !employeeId) return null;

    const baseProps = {
      onBack: handleBackToSelector,
      onSubmit: handleFormSubmit,
      employeeSalary: employeeSalary || 0,
      calculateSuggestedValue: calculateSuggestedValue,
      isSubmitting
    };

    switch (selectedType) {
      case 'horas_extra':
        return (
          <NovedadHorasExtraConsolidatedForm 
            {...baseProps} 
            periodStartDate={periodStartDate}
            periodEndDate={periodEndDate}
          />
        );
      
      case 'recargo_nocturno':
        return (
          <NovedadRecargoConsolidatedForm 
            {...baseProps} 
            periodoFecha={getPeriodDate()}
            periodStartDate={periodStartDate}
            periodEndDate={periodEndDate}
          />
        );
        
      case 'bonificacion':
        return <NovedadBonificacionesConsolidatedForm {...baseProps} />;
        
      case 'otros_ingresos':
        return <NovedadIngresosAdicionalesConsolidatedForm {...baseProps} />;
        
      case 'libranza':
        return <NovedadPrestamosConsolidatedForm {...baseProps} />;
        
      case 'descuento_voluntario':
      case 'multa':
        return <NovedadDeduccionesConsolidatedForm {...baseProps} />;

      case 'retencion_fuente':
        return (
          <NovedadRetefuenteForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
          />
        );

      default:
        return (
          <div className="p-6 text-center">
            <p className="text-gray-500">Formulario no disponible para este tipo de novedad</p>
            <Button onClick={handleBackToSelector} className="mt-4">
              Volver
            </Button>
          </div>
        );
    }
  };

  const renderContent = () => {
    if (currentStep === 'list' && employeeId && periodId) {
      return (
        <NovedadExistingList
          employeeId={employeeId}
          periodId={periodId}
          employeeName={employeeName}
          onAddNew={handleAddNew}
          onClose={handleClose}
          refreshTrigger={refreshTrigger}
          onEmployeeNovedadesChange={onEmployeeNovedadesChange}
        />
      );
    }

    if (currentStep === 'selector') {
      return (
        <NovedadTypeSelector
          onClose={handleBackToList}
          onSelectCategory={handleCategorySelect}
          employeeName={employeeName}
          mode={mode}
        />
      );
    }

    if (currentStep === 'form') {
      return renderNovedadForm();
    }

    // ✅ NUEVO: Renderizar el modal de ausencias
    if (currentStep === 'absence' && selectedAbsenceType && employeeId) {
      return (
        <VacationAbsenceForm
          isOpen={true}
          onClose={handleBackToSelector}
          onSubmit={handleAbsenceSubmit}
          isSubmitting={isSubmitting}
          editingVacation={{
            id: '',
            employee_id: employeeId,
            company_id: companyId || '',
            type: selectedAbsenceType,
            start_date: '',
            end_date: '',
            days_count: 0,
            status: 'pendiente',
            created_at: '',
            updated_at: ''
          }}
        />
      );
    }

    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        {(currentStep === 'form' || currentStep === 'absence') && (
          <>
            <DialogHeader>
              <DialogTitle>
                {mode === 'ajustes' ? 'Registrar Ajuste de Nómina' : 'Agregar Novedad'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'ajustes' 
                  ? 'Registra un ajuste manual para el empleado en este período.'
                  : 'Completa los campos para agregar una novedad al empleado.'
                }
              </DialogDescription>
              {employeeFullName && (
                <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                  <span className="font-medium">Empleado:</span>
                  <span className="bg-muted px-2 py-1 rounded text-foreground">
                    {employeeFullName}
                  </span>
                </div>
              )}
            </DialogHeader>
          </>
        )}

        {renderContent()}

        {(currentStep === 'form' || currentStep === 'absence') && (
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleBackToSelector}
              disabled={isSubmitting}
            >
              Volver
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
