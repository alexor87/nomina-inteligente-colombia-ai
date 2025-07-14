
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { NovedadTypeSelector } from './NovedadTypeSelector';
import { NovedadHorasExtraForm } from './forms/NovedadHorasExtraForm';
import { NovedadRecargoForm as NovedadRecargoConsolidatedForm } from './forms/NovedadRecargoForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { NovedadBonificacionesForm as NovedadBonificacionesConsolidatedForm } from './forms/NovedadBonificacionesForm';
import { NovedadIncapacidadForm } from './forms/NovedadIncapacidadForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { CreateNovedadData, NovedadType } from '@/types/novedades-enhanced';

interface NovedadUnifiedModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  employeeId: string;
  employeeSalary?: number;
  periodId: string;
  onSubmit: (data: CreateNovedadData) => Promise<void>;
  selectedNovedadType: NovedadType | null;
  onClose: () => void;
  startDate?: string;
  endDate?: string;
}

export const NovedadUnifiedModal: React.FC<NovedadUnifiedModalProps> = ({
  open,
  setOpen,
  employeeId,
  employeeSalary,
  periodId,
  onSubmit,
  selectedNovedadType,
  onClose,
  startDate,
  endDate
}) => {
  const [currentNovedadType, setCurrentNovedadType] = useState<NovedadType | null>(selectedNovedadType || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (startDate) {
      const periodDate = new Date(startDate);
      
      // 🔍 DEBUG: Log period date processing
      console.log('📅 NovedadUnifiedModal getPeriodDate processing:', {
        periodId,
        startDate,
        periodDate,
        periodDateISO: periodDate.toISOString(),
        periodDateString: periodDate.toISOString().split('T')[0]
      });
      
      return periodDate;
    }
    
    const fallbackDate = new Date();
    console.log('⚠️ NovedadUnifiedModal using fallback date (today):', fallbackDate.toISOString().split('T')[0]);
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
    console.log('🎨 NovedadUnifiedModal rendering form for:', {
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
