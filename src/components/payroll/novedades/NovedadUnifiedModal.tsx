
import React, { useState } from 'react';
import { CustomModal } from '@/components/ui/custom-modal';
import { NovedadTypeSelector, NovedadCategory } from './NovedadTypeSelector';
import { NovedadHorasExtraForm } from './forms/NovedadHorasExtraForm';
import { NovedadRecargoForm } from './forms/NovedadRecargoForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { NovedadIncapacidadForm } from './forms/NovedadIncapacidadForm';
import { NovedadLicenciasForm } from './forms/NovedadLicenciasForm';
import { NovedadIngresosAdicionalesForm } from './forms/NovedadIngresosAdicionalesForm';
import { NovedadDeduccionesForm } from './forms/NovedadDeduccionesForm';
import { NovedadPrestamosForm } from './forms/NovedadPrestamosForm';
import { NovedadRetefuenteForm } from './forms/NovedadRetefuenteForm';
import { CreateNovedadData } from '@/types/novedades-enhanced';

interface NovedadUnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
  employeeSalary: number;
  onCreateNovedad: (data: CreateNovedadData) => Promise<void>;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number, dias?: number) => number | null;
}

type ModalView = 'selector' | 'form';

export const NovedadUnifiedModal: React.FC<NovedadUnifiedModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  employeeId,
  employeeSalary,
  onCreateNovedad,
  calculateSuggestedValue
}) => {
  const [currentView, setCurrentView] = useState<ModalView>('selector');
  const [selectedCategory, setSelectedCategory] = useState<NovedadCategory | null>(null);

  const handleSelectCategory = (category: NovedadCategory) => {
    setSelectedCategory(category);
    setCurrentView('form');
  };

  const handleBackToSelector = () => {
    setCurrentView('selector');
    setSelectedCategory(null);
  };

  const handleClose = () => {
    setCurrentView('selector');
    setSelectedCategory(null);
    onClose();
  };

  const handleSubmit = async (formData: any) => {
    const novedadData: CreateNovedadData = {
      empleado_id: employeeId,
      periodo_id: '', // This will be set by the parent component
      ...formData
    };

    await onCreateNovedad(novedadData);
    handleClose();
  };

  const renderForm = () => {
    if (!selectedCategory) return null;

    const commonProps = {
      onBack: handleBackToSelector,
      onSubmit: handleSubmit,
      employeeSalary,
      calculateSuggestedValue
    };

    const commonPropsWithoutCalculation = {
      onBack: handleBackToSelector,
      onSubmit: handleSubmit,
      employeeSalary
    };

    switch (selectedCategory) {
      case 'horas_extra':
        return <NovedadHorasExtraForm {...commonProps} />;
      case 'recargo_nocturno':
        return <NovedadRecargoForm {...commonProps} />;
      case 'vacaciones':
        return <NovedadVacacionesForm {...commonProps} />;
      case 'incapacidades':
        return <NovedadIncapacidadForm {...commonProps} />;
      case 'licencias':
        return <NovedadLicenciasForm {...commonProps} />;
      case 'ingresos_adicionales':
        return <NovedadIngresosAdicionalesForm {...commonPropsWithoutCalculation} />;
      case 'deducciones':
        return <NovedadDeduccionesForm {...commonPropsWithoutCalculation} />;
      case 'prestamos':
        return <NovedadPrestamosForm {...commonPropsWithoutCalculation} />;
      case 'retefuente':
        return <NovedadRetefuenteForm {...commonPropsWithoutCalculation} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Formulario en desarrollo para {selectedCategory}</p>
            <button onClick={handleBackToSelector} className="mt-4 text-blue-600 hover:underline">
              Volver atrás
            </button>
          </div>
        );
    }
  };

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={handleClose}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
      closeOnEscape={false}
      closeOnBackdrop={false}
    >
      {currentView === 'selector' && (
        <NovedadTypeSelector
          isOpen={true}
          onClose={handleClose}
          onSelectCategory={handleSelectCategory}
          employeeName={employeeName}
        />
      )}
      
      {currentView === 'form' && renderForm()}
    </CustomModal>
  );
};
