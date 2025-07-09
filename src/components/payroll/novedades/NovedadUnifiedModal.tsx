import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { NovedadIncapacidadForm } from './forms/NovedadIncapacidadForm';
import { NovedadLicenciasForm } from './forms/NovedadLicenciasForm';
import { NovedadHorasExtraConsolidatedForm } from './forms/NovedadHorasExtraConsolidatedForm';
import { NovedadBonificacionesConsolidatedForm } from './forms/NovedadBonificacionesConsolidatedForm';
import { NovedadIngresosAdicionalesConsolidatedForm } from './forms/NovedadIngresosAdicionalesConsolidatedForm';
import { NovedadPrestamosConsolidatedForm } from './forms/NovedadPrestamosConsolidatedForm';
import { NovedadDeduccionesConsolidatedForm } from './forms/NovedadDeduccionesConsolidatedForm';
import { NovedadTypeSelector, NovedadCategory } from './NovedadTypeSelector';
import { NovedadExistingList } from './NovedadExistingList';
import { NovedadType, CreateNovedadData } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';
import { calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { NovedadRecargoConsolidatedForm } from './forms/NovedadRecargoConsolidatedForm';
import { NovedadVacacionesConsolidatedForm } from './forms/NovedadVacacionesConsolidatedForm';

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
}

// Mapping from categories to specific novedad types
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
  endDate
}) => {
  const [currentStep, setCurrentStep] = useState<'list' | 'selector' | 'form'>('list');
  const [selectedType, setSelectedType] = useState<NovedadType | null>(selectedNovedadType);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Calcular fecha del período para jornada legal
  const getPeriodDate = useCallback(() => {
    if (startDate) {
      const date = new Date(startDate);
      console.log('📅 Usando fecha del período para cálculos:', date.toISOString().split('T')[0]);
      return date;
    }
    console.log('⚠️ No hay startDate, usando fecha actual');
    return new Date();
  }, [startDate]);

  // Initialize step based on whether a specific type was provided
  useEffect(() => {
    if (selectedNovedadType) {
      setSelectedType(selectedNovedadType);
      setCurrentStep('form');
    } else {
      setCurrentStep('list');
      setSelectedType(null);
    }
  }, [selectedNovedadType, open]);

  // Reset states when modal opens
  useEffect(() => {
    if (open) {
      setRefreshTrigger(Date.now());
      setIsSubmitting(false);
    }
  }, [open]);

  // Mock employee name - in real app this would come from props or context
  useEffect(() => {
    if (employeeId) {
      setEmployeeName('Empleado');
    }
  }, [employeeId]);

  const handleClose = () => {
    setOpen(false);
    setCurrentStep('list');
    setSelectedType(null);
    setRefreshTrigger(0);
    setIsSubmitting(false);
    onClose?.();
  };

  const handleCategorySelect = (category: NovedadCategory) => {
    const novedadType = categoryToNovedadType[category];
    setSelectedType(novedadType);
    setCurrentStep('form');
  };

  const handleBackToSelector = () => {
    setCurrentStep('selector');
    setSelectedType(null);
  };

  const handleBackToList = () => {
    setCurrentStep('list');
    setSelectedType(null);
    // Trigger refresh when going back to list after form submission
    setRefreshTrigger(Date.now());
  };

  const handleAddNew = () => {
    setCurrentStep('selector');
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
      
      // Check if form data is an array (multiple entries like Horas Extra)
      const isArrayData = Array.isArray(formData);
      const dataArray = isArrayData ? formData : [formData];
      
      console.log(`🔄 Processing ${dataArray.length} novelty entries`);
      
      // Process each entry
      for (const entry of dataArray) {
        const submitData: CreateNovedadData = {
          empleado_id: employeeId,
          periodo_id: periodId,
          company_id: '', // Will be completed in the service
          tipo_novedad: selectedType!,
          valor: entry.valor || 0,
          horas: entry.horas || undefined,
          dias: entry.dias || undefined,
          observacion: entry.observacion || undefined,
          fecha_inicio: entry.fecha_inicio || undefined,
          fecha_fin: entry.fecha_fin || undefined,
          subtipo: entry.subtipo || undefined,
          base_calculo: entry.base_calculo || undefined
        };

        console.log('💾 Saving novelty entry:', submitData);
        await onSubmit(submitData);
      }
      
      console.log('✅ All novelty entries processed successfully');
      
      // Go back to list to show newly created novelties
      setCurrentStep('list');
      setSelectedType(null);
      setRefreshTrigger(Date.now());
      
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

  const calculateSuggestedValue = useCallback((
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    if (!employeeSalary) {
      console.warn('Salario del empleado no definido. No se puede calcular el valor sugerido.');
      return null;
    }

    try {
      // Usar fecha del período para cálculos
      const fechaPeriodo = getPeriodDate();
      const { valor } = calcularValorNovedadEnhanced(tipoNovedad, subtipo, employeeSalary, dias, horas, fechaPeriodo);
      return valor;
    } catch (error) {
      console.error('Error al calcular el valor sugerido:', error);
      return null;
    }
  }, [employeeSalary, getPeriodDate]);

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
        return <NovedadHorasExtraConsolidatedForm {...baseProps} />;
      
      case 'recargo_nocturno':
        return (
          <NovedadRecargoConsolidatedForm 
            {...baseProps} 
            periodoFecha={getPeriodDate()}
          />
        );
        
      case 'vacaciones':
        return <NovedadVacacionesConsolidatedForm {...baseProps} />;
        
      case 'bonificacion':
      case 'bonificacion_salarial':
      case 'bonificacion_no_salarial':
        return <NovedadBonificacionesConsolidatedForm {...baseProps} />;
        
      case 'otros_ingresos':
      case 'auxilio_conectividad':
      case 'viaticos':
      case 'retroactivos':
      case 'compensacion_ordinaria':
        return <NovedadIngresosAdicionalesConsolidatedForm {...baseProps} />;
        
      case 'libranza':
      case 'anticipo':
        return <NovedadPrestamosConsolidatedForm {...baseProps} />;
        
      case 'descuento_voluntario':
      case 'multa':
      case 'embargo':
        return <NovedadDeduccionesConsolidatedForm {...baseProps} />;

      case 'incapacidad':
        return (
          <NovedadIncapacidadForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            calculateSuggestedValue={calculateSuggestedValue}
            isSubmitting={isSubmitting}
          />
        );
        
      case 'licencia_remunerada':
        return (
          <NovedadLicenciasForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            calculateSuggestedValue={calculateSuggestedValue}
            isSubmitting={isSubmitting}
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
        />
      );
    }

    if (currentStep === 'form') {
      return renderNovedadForm();
    }

    // Fallback
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        {currentStep === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Agregar Novedad</DialogTitle>
              <DialogDescription>
                Completa los campos para agregar una novedad al empleado.
              </DialogDescription>
            </DialogHeader>
          </>
        )}

        {renderContent()}

        {currentStep === 'form' && (
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
