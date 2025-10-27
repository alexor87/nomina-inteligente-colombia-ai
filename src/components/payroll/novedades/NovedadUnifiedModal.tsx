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
import { NovedadType, CreateNovedadData } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';
import { NovedadRecargoConsolidatedForm } from './forms/NovedadRecargoConsolidatedForm';
import { NovedadVacacionesConsolidatedForm } from './forms/NovedadVacacionesConsolidatedForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { VacationAbsenceForm } from '@/components/vacations/VacationAbsenceForm';
import { VacationAbsenceFormData, VacationAbsenceType } from '@/types/vacations';
import { useVacationEmployees } from '@/hooks/useVacationEmployees';
import { LoadingState } from '@/components/ui/LoadingState';
import { NovedadExistingList } from './NovedadExistingList';
import { formatCurrency } from '@/lib/utils';

interface EmployeeLiquidatedValues {
  salario_base: number;
  ibc: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
}

interface NovedadUnifiedModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  employeeId: string | undefined;
  employeeSalary: number | undefined;
  periodId: string | undefined;
  onSubmit: (data: CreateNovedadData) => Promise<{ isPending?: boolean } | void>;
  onClose?: () => void;
  selectedNovedadType: NovedadType | null;
  onEmployeeNovedadesChange?: (employeeId: string) => Promise<void>;
  startDate?: string;
  endDate?: string;
  mode?: 'liquidacion' | 'ajustes';
  companyId?: string | null;
  currentLiquidatedValues?: EmployeeLiquidatedValues;
  canEdit?: boolean;
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
  companyId,
  currentLiquidatedValues,
  canEdit = true
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

  const getPeriodDate = useCallback(() => {
    if (startDate) {
      const date = new Date(startDate + 'T00:00:00');
      return date;
    }
    return new Date();
  }, [startDate]);

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
      // Always start in 'list' step to show existing novedades first
      setCurrentStep('list');
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
    setIsSubmitting(false);
    setCurrentStep('list');
    setSelectedType(null);
    setSelectedAbsenceType(null);
    setRefreshTrigger(0);
    setOpen(false);
    onClose?.();
  };

  const handleCategorySelect = (category: NovedadCategory) => {
    if (ABSENCE_CATEGORIES.includes(category)) {
      const absenceType = categoryToAbsenceType[category];
      setSelectedAbsenceType(absenceType);
      setCurrentStep('absence');
      return;
    }

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
    // Always go back to list step, regardless of mode
    setCurrentStep('list');
    setSelectedType(null);
    setSelectedAbsenceType(null);
    setRefreshTrigger(Date.now());
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
      return null;
    }

    try {
      const fechaPeriodo = getPeriodDate().toISOString().split('T')[0];
      
      const result = await calculateNovedad({
        tipoNovedad,
        subtipo,
        salarioBase: employeeSalary,
        horas,
        dias,
        fechaPeriodo
      });

      if (result) {
        return result.valor;
      }

      return null;
    } catch (error) {
      return null;
    }
  }, [employeeSalary, getPeriodDate, calculateNovedad]);

  const handleAbsenceSubmit = async (formData: VacationAbsenceFormData, periodInfo?: any) => {
    if (!employeeId || !periodId || !companyId || !employeeSalary) {
      toast({
        title: "Error",
        description: "Faltan datos del empleado, período, empresa o salario",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const dias = formData.start_date && formData.end_date 
        ? Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0;

      let valorCalculado = 0;

      if (formData.type === 'incapacidad' && dias > 0) {
        try {
          const calculationResult = await calculateNovedad({
            tipoNovedad: formData.type as NovedadType,
            subtipo: formData.subtipo,
            salarioBase: employeeSalary,
            dias: dias,
            fechaPeriodo: startDate
          });

          if (calculationResult) {
            valorCalculado = calculationResult.valor;
          }
        } catch (error) {
          console.error('❌ Error calculando incapacidad en backend:', error);
        }
      }

      const novedadData: CreateNovedadData = {
        empleado_id: employeeId,
        periodo_id: periodId,
        company_id: companyId,
        tipo_novedad: formData.type as NovedadType,
        subtipo: formData.subtipo,
        valor: valorCalculado,
        dias: dias,
        fecha_inicio: formData.start_date,
        fecha_fin: formData.end_date,
        observacion: formData.observations
      };
      
      const result = await onSubmit(novedadData);

      await new Promise(resolve => setTimeout(resolve, 300));

      if (mode === 'ajustes') {
        handleClose();
      } else {
        setCurrentStep('list');
        setSelectedAbsenceType(null);
        setRefreshTrigger(Date.now());
      }

      // Show different messages based on submission result
      if (result && 'isPending' in result && result.isPending) {
        toast({
          title: "Novedad guardada como ajuste pendiente",
          description: `${formData.type === 'incapacidad' && valorCalculado > 0 
            ? `Incapacidad por $${valorCalculado.toLocaleString()} agregada` 
            : 'Ausencia agregada'}. Usa "Aplicar Ajustes" para confirmar y reliquidar el período.`,
          variant: "warning"
        });
      } else {
        toast({
          title: "Novedad aplicada inmediatamente",
          description: `${formData.type === 'incapacidad' && valorCalculado > 0 
            ? `Incapacidad calculada correctamente ($${valorCalculado.toLocaleString()})` 
            : 'Ausencia registrada correctamente'} y aplicada al período`,
          className: "border-green-200 bg-green-50"
        });
      }

    } catch (error: any) {
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
      const isArrayData = Array.isArray(formData);
      const dataArray = isArrayData ? formData : [formData];
      let hasPendingSubmissions = false;
      
      for (const entry of dataArray) {
        // ✅ CORRECCIÓN: Mapear tipo y subtipo correctamente para recargos
        let tipoNovedadToSave = selectedType!;
        let subtipoToSave = entry.subtipo || entry.tipo || undefined;
        
        // Si es recargo, derivar el tipo correcto según el subtipo seleccionado
        if (selectedType === 'recargo_nocturno') {
          const entryType = entry.subtipo || entry.tipo;
          if (entryType === 'dominical') {
            tipoNovedadToSave = 'recargo_dominical';
            subtipoToSave = 'dominical';
          } else if (entryType === 'nocturno') {
            tipoNovedadToSave = 'recargo_nocturno';
            subtipoToSave = 'nocturno';
          } else if (entryType === 'nocturno_dominical') {
            tipoNovedadToSave = 'recargo_nocturno';
            subtipoToSave = 'dominical';
          }
        }
        
        const submitData: CreateNovedadData = {
          empleado_id: employeeId,
          periodo_id: periodId,
          company_id: companyId || '',
          tipo_novedad: tipoNovedadToSave,
          valor: entry.valor || 0,
          horas: entry.horas || undefined,
          dias: entry.dias || undefined,
          observacion: entry.observacion || undefined,
          fecha_inicio: entry.fecha_inicio || undefined,
          fecha_fin: entry.fecha_fin || undefined,
          subtipo: subtipoToSave,
          base_calculo: entry.base_calculo || undefined,
          constitutivo_salario: entry.constitutivo_salario
        };

        const result = await onSubmit(submitData);
        
        // Track if any submission was pending
        if (result && 'isPending' in result && result.isPending) {
          hasPendingSubmissions = true;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (mode === 'ajustes') {
        handleClose();
      } else {
        setCurrentStep('list');
        setSelectedType(null);
        setRefreshTrigger(Date.now());
      }
      const totalValue = isArrayData 
        ? dataArray.reduce((sum, entry) => sum + (entry.valor || 0), 0)
        : (formData.valor || 0);

      // Show different messages based on submission results
      if (hasPendingSubmissions) {
        toast({
          title: "Novedad guardada como ajuste pendiente",
          description: isArrayData 
            ? `${dataArray.length} novedades por $${totalValue.toLocaleString()} agregadas. Usa "Aplicar Ajustes" para confirmar y reliquidar el período.`
            : `Novedad por $${totalValue.toLocaleString()} agregada. Usa "Aplicar Ajustes" para confirmar y reliquidar el período.`,
          variant: "warning"
        });
      } else {
        toast({
          title: "Novedad aplicada inmediatamente",
          description: isArrayData 
            ? `${dataArray.length} novedades por $${totalValue.toLocaleString()} aplicadas al período`
            : `Novedad por $${totalValue.toLocaleString()} aplicada al período`,
          className: "border-green-200 bg-green-50"
        });
      }

    } catch (error: any) {
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
      case 'incapacidad':
        return (
          <NovedadIncapacidadForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            isSubmitting={isSubmitting}
            periodoFecha={getPeriodDate()}
            periodStartDate={periodStartDate}
            periodEndDate={periodEndDate}
          />
        );
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

  const renderCurrentValues = () => {
    if (!currentLiquidatedValues || mode !== 'ajustes') return null;

    return (
      <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">📊 Valores Actuales Liquidados</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Salario Base:</span>
              <span className="font-medium">{formatCurrency(currentLiquidatedValues.salario_base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IBC:</span>
              <span className="font-medium">{formatCurrency(currentLiquidatedValues.ibc)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Días Trabajados:</span>
              <span className="font-medium">{currentLiquidatedValues.dias_trabajados}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-green-600">Total Devengado:</span>
              <span className="font-semibold text-green-600">{formatCurrency(currentLiquidatedValues.total_devengado)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Total Deducciones:</span>
              <span className="font-semibold text-red-600">{formatCurrency(currentLiquidatedValues.total_deducciones)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-blue-600 font-medium">Neto Pagado:</span>
              <span className="font-bold text-blue-600">{formatCurrency(currentLiquidatedValues.neto_pagado)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (currentStep === 'list' && employeeId && periodId) {
      return (
        <div>
          {renderCurrentValues()}
          <NovedadExistingList
            employeeId={employeeId}
            periodId={periodId}
            employeeName={employeeName}
            onAddNew={handleAddNew}
            onClose={handleClose}
            refreshTrigger={refreshTrigger}
            onEmployeeNovedadesChange={onEmployeeNovedadesChange}
            mode={mode}
            companyId={companyId}
            canEdit={canEdit}
          />
        </div>
      );
    }

    if (currentStep === 'selector') {
      return (
        <div>
          {renderCurrentValues()}
          <NovedadTypeSelector
            onClose={handleBackToList}
            onSelectCategory={handleCategorySelect}
            employeeName={employeeName}
            mode={mode}
          />
        </div>
      );
    }

    if (currentStep === 'form') {
      return (
        <div>
          {renderCurrentValues()}
          {renderNovedadForm()}
        </div>
      );
    }

    if (currentStep === 'absence' && selectedAbsenceType && employeeId) {
      return (
        <div>
          {renderCurrentValues()}
          <VacationAbsenceForm
            isOpen={true}
            onClose={handleBackToSelector}
            onSubmit={handleAbsenceSubmit}
            isSubmitting={isSubmitting}
            preselectedEmployeeId={employeeId}
            editingVacation={null}
            useCustomModal={false}
            hideEmployeeSelection={true}
          />
        </div>
      );
    }

    return (
      <div className="p-6 text-center">
        <LoadingState message="Cargando..." />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'ajustes' ? '📝 Agregar Ajuste' : '📋 Gestionar Novedades'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'ajustes' 
              ? 'Este ajuste será aplicado tras confirmación con justificación.'
              : 'Gestione las novedades de nómina para este empleado.'
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
