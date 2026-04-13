import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { DisplayNovedad } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';
import { NovedadRecargoConsolidatedForm } from './forms/NovedadRecargoConsolidatedForm';
import { NovedadVacacionesConsolidatedForm } from './forms/NovedadVacacionesConsolidatedForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';
import { VacationAbsenceForm } from '@/components/vacations/VacationAbsenceForm';
import { VacationAbsenceFormData, VacationAbsenceType } from '@/types/vacations';
import { useVacationEmployees } from '@/hooks/useVacationEmployees';
import { LoadingState } from '@/components/ui/LoadingState';
import { NovedadExistingList } from './NovedadExistingList';
import { formatCurrency } from '@/lib/utils';
import { calculateBusinessDays } from '@/utils/businessDayCalculator';

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
  editingNovedad?: DisplayNovedad | null;
  onUpdate?: (id: string, data: Partial<CreateNovedadData>) => Promise<any>;
  onClearEditing?: () => void;
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
  canEdit = true,
  editingNovedad,
  onUpdate,
  onClearEditing
}) => {
  const [currentStep, setCurrentStep] = useState<'list' | 'selector' | 'form' | 'absence' | 'edit'>('list');
  const [selectedType, setSelectedType] = useState<NovedadType | null>(selectedNovedadType);
  const [selectedAbsenceType, setSelectedAbsenceType] = useState<VacationAbsenceType | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeFullName, setEmployeeFullName] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState<string>('');
  const [periodEndDate, setPeriodEndDate] = useState<string>('');
  const [employeeRestDays, setEmployeeRestDays] = useState<string[]>(['sabado', 'domingo']);
  const [internalEditingNovedad, setInternalEditingNovedad] = useState<DisplayNovedad | null>(null);
  const [editFormData, setEditFormData] = useState<{
    valor: number;
    dias: number;
    fecha_inicio: string;
    fecha_fin: string;
    observacion: string;
  }>({ valor: 0, dias: 0, fecha_inicio: '', fecha_fin: '', observacion: '' });
  const { toast } = useToast();

  // The active editing novedad (from prop or internal state)
  const activeEditingNovedad = editingNovedad || internalEditingNovedad;
  
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

  // Fetch días de descanso del empleado para cálculo correcto de vacaciones
  useEffect(() => {
    const fetchRestDays = async () => {
      if (!employeeId) {
        setEmployeeRestDays(['sabado', 'domingo']);
        return;
      }
      try {
        const { data } = await supabase
          .from('employees')
          .select('dias_descanso')
          .eq('id', employeeId)
          .single();
        setEmployeeRestDays(data?.dias_descanso || ['sabado', 'domingo']);
      } catch {
        setEmployeeRestDays(['sabado', 'domingo']);
      }
    };
    fetchRestDays();
  }, [employeeId]);

  // Enter edit mode when editingNovedad prop is set from parent
  useEffect(() => {
    if (editingNovedad) {
      setInternalEditingNovedad(editingNovedad);
      setEditFormData({
        valor: editingNovedad.valor || 0,
        dias: editingNovedad.dias || 0,
        fecha_inicio: editingNovedad.fecha_inicio || '',
        fecha_fin: editingNovedad.fecha_fin || '',
        observacion: editingNovedad.observacion || ''
      });
      setCurrentStep('edit');
    }
  }, [editingNovedad]);

  useEffect(() => {
    if (selectedNovedadType) {
      setSelectedType(selectedNovedadType);
      setCurrentStep('form');
    } else if (!editingNovedad) {
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
    setInternalEditingNovedad(null);
    setRefreshTrigger(0);
    onClearEditing?.();
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
    setInternalEditingNovedad(null);
    onClearEditing?.();
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
      // Vacaciones: contar días HÁBILES (excluye días de descanso del empleado y festivos colombianos)
      // Otros tipos (incapacidad, etc.): contar días calendario
      const dias = formData.start_date && formData.end_date
        ? formData.type === 'vacaciones'
          ? calculateBusinessDays(formData.start_date, formData.end_date, employeeRestDays)
          : Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0;

      let valorCalculado = 0;

      // Calcular valor para TODOS los tipos de ausencia que requieren cálculo
      const ABSENCE_TYPES_WITH_CALC = ['incapacidad', 'licencia_remunerada', 'vacaciones', 'ausencia', 'licencia_no_remunerada'];
      if (ABSENCE_TYPES_WITH_CALC.includes(formData.type) && dias > 0) {
        try {
          const calculationResult = await calculateNovedad({
            tipoNovedad: formData.type as NovedadType,
            subtipo: formData.subtipo,
            salarioBase: employeeSalary,
            dias: dias,
            fechaPeriodo: startDate,
            companyId: companyId
          });

          if (calculationResult) {
            valorCalculado = calculationResult.valor;
            console.log(`✅ Valor calculado para ${formData.type}: $${valorCalculado}`);
          }
        } catch (error) {
          console.error(`❌ Error calculando ${formData.type} en backend:`, error);
          // Fallback: calcular valor básico para licencia_remunerada y vacaciones (100% salario diario)
          if (['licencia_remunerada', 'vacaciones'].includes(formData.type)) {
            valorCalculado = Math.round((employeeSalary / 30) * dias);
            console.log(`⚠️ Fallback: valor calculado localmente para ${formData.type}: $${valorCalculado}`);
          }
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

      // ✅ Si la creación falló (hook retorna null), no mostrar toast de éxito
      if (!result) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      if (mode === 'ajustes') {
        handleClose();
      } else {
        setCurrentStep('list');
        setSelectedAbsenceType(null);
        setRefreshTrigger(Date.now());
      }

      // Show different messages based on submission result
      const valorMsg = valorCalculado > 0 ? ` por $${valorCalculado.toLocaleString()}` : '';
      const tipoMsg = formData.type.replace(/_/g, ' ');

      if (result && 'isPending' in result && result.isPending) {
        toast({
          title: "Novedad guardada como ajuste pendiente",
          description: `${tipoMsg}${valorMsg} agregada (${dias} días). Usa "Aplicar Ajustes" para confirmar y reliquidar el período.`,
          variant: "warning"
        });
      } else {
        toast({
          title: "Novedad aplicada inmediatamente",
          description: `${tipoMsg}${valorMsg} registrada correctamente (${dias} días) y aplicada al período`,
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
            subtipoToSave = 'nocturno_dominical';
          }
        }

        // Si es bonificación, derivar subtipo desde tipo_novedad del form
        if (selectedType === 'bonificacion') {
          const entryType = entry.subtipo || entry.tipo_novedad || entry.tipo;
          if (entryType === 'bonificacion_salarial') {
            subtipoToSave = 'salarial';
          } else if (entryType === 'bonificacion_no_salarial') {
            subtipoToSave = 'no_salarial';
          }
        }

        // Si es otros_ingresos, mapear al tipo_novedad correcto del enum DB
        if (selectedType === 'otros_ingresos') {
          const entrySubtipo = entry.subtipo || entry.tipo_novedad || entry.tipo;
          if (entrySubtipo === 'comision') {
            tipoNovedadToSave = 'comision';
            subtipoToSave = undefined;
          } else if (entrySubtipo === 'prima_extralegal') {
            tipoNovedadToSave = 'prima';
            subtipoToSave = 'extralegal';
          } else if (entrySubtipo === 'auxilio_alimentacion') {
            tipoNovedadToSave = 'otros_ingresos';
            subtipoToSave = 'auxilio_alimentacion';
          } else if (entrySubtipo === 'otros_ingresos') {
            tipoNovedadToSave = 'otros_ingresos';
            subtipoToSave = undefined;
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
      
      // Invalidar caché de cálculos para forzar recálculo fresco
      if (employeeId) {
        NovedadesCalculationService.invalidateCache(employeeId, periodId);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

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

  const handleEditSubmit = async () => {
    if (!internalEditingNovedad || !onUpdate) return;

    setIsSubmitting(true);
    try {
      // Recalculate value if days changed and it's a type that needs recalculation
      let finalValue = editFormData.valor;
      const RECALCULABLE_TYPES = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'ausencia', 'licencia_no_remunerada'];

      if (RECALCULABLE_TYPES.includes(internalEditingNovedad.tipo_novedad) &&
          editFormData.dias !== internalEditingNovedad.dias &&
          editFormData.fecha_inicio && editFormData.fecha_fin && employeeSalary) {
        try {
          const result = await calculateNovedad({
            tipoNovedad: internalEditingNovedad.tipo_novedad as NovedadType,
            subtipo: internalEditingNovedad.subtipo,
            salarioBase: employeeSalary,
            dias: editFormData.dias,
            fechaPeriodo: startDate,
            companyId: companyId || undefined
          });
          if (result) {
            finalValue = result.valor;
          }
        } catch {
          console.warn('Could not recalculate, using manual value');
        }
      }

      await onUpdate(internalEditingNovedad.id, {
        valor: finalValue,
        dias: editFormData.dias || undefined,
        fecha_inicio: editFormData.fecha_inicio || undefined,
        fecha_fin: editFormData.fecha_fin || undefined,
        observacion: editFormData.observacion || undefined
      });

      if (employeeId) {
        NovedadesCalculationService.invalidateCache(employeeId, periodId);
      }

      toast({
        title: "Novedad actualizada",
        description: `Novedad actualizada correctamente`,
        className: "border-green-200 bg-green-50"
      });

      setInternalEditingNovedad(null);
      onClearEditing?.();
      setCurrentStep('list');
      setRefreshTrigger(Date.now());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la novedad",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setInternalEditingNovedad(null);
    onClearEditing?.();
    setCurrentStep('list');
    setRefreshTrigger(Date.now());
  };

  const renderEditForm = () => {
    if (!internalEditingNovedad) return null;

    const tipoLabel = internalEditingNovedad.tipo_novedad.replace(/_/g, ' ');
    const hasDateFields = !!internalEditingNovedad.fecha_inicio;

    // Recalculate days when dates change for vacation types
    const handleDateChange = (field: 'fecha_inicio' | 'fecha_fin', value: string) => {
      const newData = { ...editFormData, [field]: value };
      setEditFormData(newData);

      if (newData.fecha_inicio && newData.fecha_fin) {
        if (internalEditingNovedad.tipo_novedad === 'vacaciones') {
          const days = calculateBusinessDays(newData.fecha_inicio, newData.fecha_fin, employeeRestDays);
          setEditFormData(prev => ({ ...prev, [field]: value, dias: days }));
        } else if (['incapacidad', 'licencia_remunerada', 'ausencia', 'licencia_no_remunerada'].includes(internalEditingNovedad.tipo_novedad)) {
          const diffTime = new Date(newData.fecha_fin).getTime() - new Date(newData.fecha_inicio).getTime();
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          setEditFormData(prev => ({ ...prev, [field]: value, dias: Math.max(0, days) }));
        }
      }
    };

    return (
      <div className="p-4 space-y-4">
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium capitalize">{tipoLabel}</p>
          {internalEditingNovedad.subtipo && (
            <p className="text-xs text-muted-foreground capitalize">{internalEditingNovedad.subtipo.replace(/_/g, ' ')}</p>
          )}
        </div>

        {hasDateFields && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fecha-inicio">Fecha Inicio</Label>
              <Input
                id="edit-fecha-inicio"
                type="date"
                value={editFormData.fecha_inicio}
                onChange={(e) => handleDateChange('fecha_inicio', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fecha-fin">Fecha Fin</Label>
              <Input
                id="edit-fecha-fin"
                type="date"
                value={editFormData.fecha_fin}
                onChange={(e) => handleDateChange('fecha_fin', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-dias">Días</Label>
            <Input
              id="edit-dias"
              type="number"
              min="0"
              value={editFormData.dias}
              onChange={(e) => setEditFormData(prev => ({ ...prev, dias: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-valor">Valor ($)</Label>
            <Input
              id="edit-valor"
              type="number"
              min="0"
              value={editFormData.valor}
              onChange={(e) => setEditFormData(prev => ({ ...prev, valor: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-observacion">Observación</Label>
          <Input
            id="edit-observacion"
            type="text"
            value={editFormData.observacion}
            onChange={(e) => setEditFormData(prev => ({ ...prev, observacion: e.target.value }))}
            placeholder="Observaciones..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={handleCancelEdit}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEditSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    );
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
            companyId={companyId || undefined}
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
            onEdit={onUpdate ? (novedad) => {
              setInternalEditingNovedad(novedad);
              setEditFormData({
                valor: novedad.valor || 0,
                dias: novedad.dias || 0,
                fecha_inicio: novedad.fecha_inicio || '',
                fecha_fin: novedad.fecha_fin || '',
                observacion: novedad.observacion || ''
              });
              setCurrentStep('edit');
            } : undefined}
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

    if (currentStep === 'edit') {
      return (
        <div>
          {renderCurrentValues()}
          {renderEditForm()}
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
            {currentStep === 'edit' ? '✏️ Editar Novedad' : mode === 'ajustes' ? '📝 Agregar Ajuste' : '📋 Gestionar Novedades'}
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
