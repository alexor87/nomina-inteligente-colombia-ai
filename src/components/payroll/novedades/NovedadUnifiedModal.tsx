
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
import { NovedadType } from '@/types/novedades-enhanced';
import { useToast } from '@/components/ui/use-toast';
import { calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { NovedadRecargoConsolidatedForm } from './forms/NovedadRecargoConsolidatedForm';
import { NovedadVacacionesConsolidatedForm } from './forms/NovedadVacacionesConsolidatedForm';

interface NovedadUnifiedModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  employeeId: string | undefined;
  employeeSalary: number | undefined;
  onSubmit: (data: any) => Promise<void>;
  onClose?: () => void;
  selectedNovedadType: NovedadType | null;
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
  onSubmit,
  selectedNovedadType,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState<'selector' | 'form'>('selector');
  const [selectedType, setSelectedType] = useState<NovedadType | null>(selectedNovedadType);
  const [employeeName, setEmployeeName] = useState<string>('');
  const { toast } = useToast();

  // Initialize step based on whether a specific type was provided
  useEffect(() => {
    if (selectedNovedadType) {
      setSelectedType(selectedNovedadType);
      setCurrentStep('form');
    } else {
      setCurrentStep('selector');
      setSelectedType(null);
    }
  }, [selectedNovedadType, open]);

  // Mock employee name - in real app this would come from props or context
  useEffect(() => {
    if (employeeId) {
      // For now, we'll use a placeholder. In a real app, you'd fetch this data
      setEmployeeName('Empleado');
    }
  }, [employeeId]);

  const handleClose = () => {
    setOpen(false);
    setCurrentStep('selector');
    setSelectedType(null);
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

  const handleFormSubmit = async (formData: any) => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un empleado",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSubmit({
        ...formData,
        empleado_id: employeeId,
        tipo_novedad: selectedType,
      });
      toast({
        title: "Novedad guardada",
        description: "La novedad se ha guardado correctamente",
      });
      handleClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la novedad",
        variant: "destructive",
      });
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
      const { valor } = calcularValorNovedadEnhanced(tipoNovedad, subtipo, employeeSalary, dias, horas);
      return valor;
    } catch (error) {
      console.error('Error al calcular el valor sugerido:', error);
      return null;
    }
  }, [employeeSalary]);

  const renderNovedadForm = () => {
    if (!selectedType || !employeeId) return null;

    const baseProps = {
      onBack: handleBackToSelector,
      onSubmit: handleFormSubmit,
      employeeSalary: employeeSalary || 0,
      calculateSuggestedValue: calculateSuggestedValue
    };

    switch (selectedType) {
      case 'horas_extra':
        return <NovedadHorasExtraConsolidatedForm {...baseProps} />;
      
      case 'recargo_nocturno':
        return <NovedadRecargoConsolidatedForm {...baseProps} />;
        
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

      // Fallback to individual forms for other types
      case 'incapacidad':
        return (
          <NovedadIncapacidadForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            calculateSuggestedValue={calculateSuggestedValue}
          />
        );
        
      case 'licencia_remunerada':
        return (
          <NovedadLicenciasForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            calculateSuggestedValue={calculateSuggestedValue}
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
    if (currentStep === 'selector') {
      return (
        <NovedadTypeSelector
          onClose={handleClose}
          onSelectCategory={handleCategorySelect}
          employeeName={employeeName}
        />
      );
    }

    return renderNovedadForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
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
            <Button type="button" variant="secondary" onClick={handleBackToSelector}>
              Volver
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
