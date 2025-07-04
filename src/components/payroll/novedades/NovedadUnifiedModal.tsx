
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { NovedadHorasExtraForm } from './forms/NovedadHorasExtraForm';
import { NovedadIncapacidadForm } from './forms/NovedadIncapacidadForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { NovedadLicenciasForm } from './forms/NovedadLicenciasForm';
import { NovedadBonificacionesForm } from './forms/NovedadBonificacionesForm';
import { NovedadDeduccionesForm } from './forms/NovedadDeduccionesForm';
import { NovedadIngresosAdicionalesForm } from './forms/NovedadIngresosAdicionalesForm';
import { NovedadRecargoForm } from './forms/NovedadRecargoForm';

interface NovedadUnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
  employeeSalary: number;
  periodId: string;
  initialNovedadType?: string | null;
  onCreateNovedad: (novedadData: any) => void;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number, dias?: number) => number | null;
  onNovedadChange?: () => Promise<void>;
}

const novedadTypeLabels: Record<string, string> = {
  horas_extra: 'Horas Extra',
  incapacidad: 'Incapacidades',
  vacaciones: 'Vacaciones',
  licencias: 'Licencias',
  bonificaciones: 'Bonificaciones y Auxilios',
  deducciones: 'Deducciones',
  ingresos_adicionales: 'Ingresos Adicionales',
  recargos: 'Recargos'
};

export const NovedadUnifiedModal: React.FC<NovedadUnifiedModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  employeeId,
  employeeSalary,
  periodId,
  initialNovedadType,
  onCreateNovedad,
  calculateSuggestedValue,
  onNovedadChange
}) => {
  const [currentNovedadType, setCurrentNovedadType] = useState<string | null>(null);

  useEffect(() => {
    if (initialNovedadType) {
      setCurrentNovedadType(initialNovedadType);
    }
  }, [initialNovedadType]);

  const handleBack = () => {
    setCurrentNovedadType(null);
  };

  const handleSubmit = async (novedadData: any) => {
    try {
      const completeNovedadData = {
        ...novedadData,
        empleado_id: employeeId,
        periodo_id: periodId,
        created_at: new Date().toISOString()
      };
      
      await onCreateNovedad(completeNovedadData);
      
      // Trigger change callback if provided
      if (onNovedadChange) {
        await onNovedadChange();
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating novedad:', error);
    }
  };

  // Función de cálculo sugerido (simplificada)
  const calculateSuggestedValueInternal = (tipo: string, subtipo?: string, cantidad?: number): number | null => {
    // Use provided calculation function if available
    if (calculateSuggestedValue) {
      return calculateSuggestedValue(tipo, subtipo, cantidad);
    }
    
    // Fallback calculation
    const salarioDiario = employeeSalary / 30;
    const salarioHora = salarioDiario / 8;
    
    switch (tipo) {
      case 'horas_extra_diurnas':
        return cantidad ? Math.round(salarioHora * 1.25 * cantidad) : null;
      case 'horas_extra_nocturnas':
        return cantidad ? Math.round(salarioHora * 1.75 * cantidad) : null;
      case 'horas_extra_dominicales':
        return cantidad ? Math.round(salarioHora * 2.0 * cantidad) : null;
      case 'horas_extra_festivas':
        return cantidad ? Math.round(salarioHora * 2.0 * cantidad) : null;
      case 'incapacidad':
        if (subtipo === 'comun' && cantidad) {
          return cantidad > 3 ? Math.round(salarioDiario * 0.667 * (cantidad - 3)) : 0;
        } else if (subtipo === 'laboral' && cantidad) {
          return Math.round(salarioDiario * cantidad);
        } else if (subtipo === 'maternidad' && cantidad) {
          return Math.round(salarioDiario * cantidad);
        }
        return null;
      case 'vacaciones':
        return cantidad ? Math.round(salarioDiario * cantidad) : null;
      case 'licencia_remunerada':
        return cantidad ? Math.round(salarioDiario * cantidad) : null;
      case 'ausencia':
        return cantidad ? Math.round(salarioDiario * cantidad) : null;
      case 'recargo_nocturno':
        if (subtipo === 'nocturno' && cantidad) {
          return Math.round(salarioHora * 1.35 * cantidad);
        } else if (subtipo === 'dominical' && cantidad) {
          return Math.round(salarioHora * 1.8 * cantidad);
        } else if (subtipo === 'nocturno_dominical' && cantidad) {
          return Math.round(salarioHora * 2.15 * cantidad);
        } else if (subtipo === 'festivo' && cantidad) {
          return Math.round(salarioHora * 1.75 * cantidad);
        } else if (subtipo === 'nocturno_festivo' && cantidad) {
          return Math.round(salarioHora * 2.1 * cantidad);
        }
        return null;
      default:
        return null;
    }
  };

  const renderNovedadForm = () => {
    switch (currentNovedadType) {
      case 'horas_extra':
        return (
          <NovedadHorasExtraForm
            onBack={handleBack}
            onSubmit={handleSubmit}
            employeeSalary={employeeSalary}
            calculateSuggestedValue={calculateSuggestedValueInternal}
          />
        );
      case 'incapacidad':
        return (
          <NovedadIncapacidadForm
            onBack={handleBack}
            onSubmit={handleSubmit}
            employeeSalary={employeeSalary}
            calculateSuggestedValue={calculateSuggestedValueInternal}
          />
        );
      case 'vacaciones':
        return (
          <NovedadVacacionesForm
            onBack={handleBack}
            onSubmit={handleSubmit}
            employeeSalary={employeeSalary}
            calculateSuggestedValue={calculateSuggestedValueInternal}
          />
        );
      case 'licencias':
        return (
          <NovedadLicenciasForm
            onBack={handleBack}
            onSubmit={handleSubmit}
            employeeSalary={employeeSalary}
            calculateSuggestedValue={calculateSuggestedValueInternal}
          />
        );
      case 'bonificaciones':
        return (
          <NovedadBonificacionesForm
            onBack={handleBack}
            onSubmit={handleSubmit}
            employeeSalary={employeeSalary}
          />
        );
      case 'deducciones':
        return (
          <NovedadDeduccionesForm
            onBack={handleBack}
            onSubmit={handleSubmit}
            employeeSalary={employeeSalary}
          />
        );
      case 'ingresos_adicionales':
        return (
          <NovedadIngresosAdicionalesForm
            onBack={handleBack}
            onSubmit={handleSubmit}
            employeeSalary={employeeSalary}
          />
        );
      case 'recargos':
        return (
          <NovedadRecargoForm
            onBack={handleBack}
            onSubmit={handleSubmit}
            employeeSalary={employeeSalary}
            calculateSuggestedValue={calculateSuggestedValueInternal}
          />
        );
      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    if (currentNovedadType) {
      return `${novedadTypeLabels[currentNovedadType]} - ${employeeName}`;
    }
    return `Novedades - ${employeeName}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {currentNovedadType 
              ? `Completa la información para agregar la novedad de ${novedadTypeLabels[currentNovedadType].toLowerCase()}`
              : 'Selecciona el tipo de novedad que deseas agregar'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {currentNovedadType ? (
            renderNovedadForm()
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">
                Se abrirá el formulario correspondiente al tipo de novedad seleccionado.
              </p>
              <Button variant="outline" onClick={onClose} className="mt-4">
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
