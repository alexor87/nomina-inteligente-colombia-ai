import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { NovedadTypeSelector } from './NovedadTypeSelector';
import { NovedadHorasExtraForm } from './forms/NovedadHorasExtraForm';
import { NovedadRecargoForm as NovedadRecargoConsolidatedForm } from './forms/NovedadRecargoForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { NovedadBonificacionesForm as NovedadBonificacionesConsolidatedForm } from './forms/NovedadBonificacionesForm';
import { NovedadComisionesForm as NovedadComisionConsolidatedForm } from './forms/NovedadComisionesForm';
import { NovedadPrimaForm as NovedadPrimaConsolidatedForm } from './forms/NovedadPrimaForm';
import { NovedadOtrosIngresosForm as NovedadOtrosIngresosConsolidatedForm } from './forms/NovedadOtrosIngresosForm';
import { NovedadIncapacidadForm } from './forms/NovedadIncapacidadForm';
import { NovedadLicenciaForm as NovedadLicenciaConsolidatedForm } from './forms/NovedadLicenciaForm';
import { NovedadLicenciaNoRemuneradaForm as NovedadLicenciaNoRemuneradaConsolidatedForm } from './forms/NovedadLicenciaNoRemuneradaForm';
import { NovedadAusenciaForm as NovedadAusenciaConsolidatedForm } from './forms/NovedadAusenciaForm';
import { NovedadFondoSolidaridadForm as NovedadFondoSolidaridadConsolidatedForm } from './forms/NovedadFondoSolidaridadForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { CreateNovedadData, NovedadType } from '@/types/novedades-enhanced';
import { usePeriod } from '@/hooks/usePeriod';

interface NovedadUnifiedModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  employeeId: string;
  employeeSalary?: number;
  periodId: string;
  onSubmit: (data: CreateNovedadData) => Promise<void>;
  selectedNovedadType: NovedadType | null;
  onClose: () => void;
}

export const NovedadUnifiedModal: React.FC<NovedadUnifiedModalProps> = ({
  open,
  setOpen,
  employeeId,
  employeeSalary,
  periodId,
  onSubmit,
  selectedNovedadType,
  onClose
}) => {
  const [currentNovedadType, setCurrentNovedadType] = useState<NovedadType | null>(selectedNovedadType || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { period } = usePeriod(periodId);

  const handleClose = () => {
    setCurrentNovedadType(null);
    onClose();
  };

  const handleBackToSelector = () => {
    setCurrentNovedadType(null);
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      handleClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPeriodDate = (): Date => {
    if (period?.fecha_inicio) {
      const periodDate = new Date(period.fecha_inicio);
      
      // 🔍 DEBUG: Log period date processing
      console.log('📅 getPeriodDate processing:', {
        periodId,
        periodFechaInicio: period.fecha_inicio,
        periodDate,
        periodDateISO: periodDate.toISOString(),
        periodDateString: periodDate.toISOString().split('T')[0]
      });
      
      return periodDate;
    }
    
    const fallbackDate = new Date();
    console.log('⚠️ Using fallback date (today):', fallbackDate.toISOString().split('T')[0]);
    return fallbackDate;
  };

  const renderSelectedForm = () => {
    const baseProps = {
      onBack: handleBackToSelector,
      onSubmit: handleFormSubmit,
      employeeSalary: employeeSalary || 0,
      periodoFecha: getPeriodDate()  // 🔍 DEBUG: Always pass period date
    };

    // 🔍 DEBUG: Log form rendering
    console.log('🎨 Rendering form for:', {
      currentNovedadType,
      baseProps: {
        employeeSalary: baseProps.employeeSalary,
        periodoFecha: baseProps.periodoFecha?.toISOString()
      }
    });

    if (!currentNovedadType) {
      return <NovedadTypeSelector onSelectType={setCurrentNovedadType} />;
    }

    switch (currentNovedadType) {
      case 'horas_extra':
        return (
          <NovedadHorasExtraForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            periodoFecha={getPeriodDate()}
          />
        );
        
      case 'recargo_nocturno':
        return <NovedadRecargoConsolidatedForm {...baseProps} />;
        
      case 'vacaciones':
        return (
          <NovedadVacacionesForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            periodoFecha={getPeriodDate()}
          />
        );
        
      case 'bonificacion':
        return <NovedadBonificacionesConsolidatedForm {...baseProps} />;
        
      case 'comision':
        return <NovedadComisionConsolidatedForm {...baseProps} />;
        
      case 'prima':
        return <NovedadPrimaConsolidatedForm {...baseProps} />;
        
      case 'otros_ingresos':
        return <NovedadOtrosIngresosConsolidatedForm {...baseProps} />;
        
      case 'incapacidad':
        return (
          <NovedadIncapacidadForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            isSubmitting={isSubmitting}
            periodoFecha={getPeriodDate()}
          />
        );
        
      case 'licencia_remunerada':
        return <NovedadLicenciaConsolidatedForm {...baseProps} />;
        
      case 'licencia_no_remunerada':
        return <NovedadLicenciaNoRemuneradaConsolidatedForm {...baseProps} />;
        
      case 'ausencia':
        return <NovedadAusenciaConsolidatedForm {...baseProps} />;
        
      case 'fondo_solidaridad':
        return <NovedadFondoSolidaridadConsolidatedForm {...baseProps} />;
        
      default:
        return <NovedadTypeSelector onSelectType={setCurrentNovedadType} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {currentNovedadType ? `Novedad: ${currentNovedadType}` : 'Agregar Novedad'}
          </DialogTitle>
          <DialogDescription>
            Selecciona el tipo de novedad que deseas agregar al empleado.
          </DialogDescription>
        </DialogHeader>

        {renderSelectedForm()}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
