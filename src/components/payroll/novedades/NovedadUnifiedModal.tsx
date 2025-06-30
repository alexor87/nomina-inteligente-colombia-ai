
import React, { useState } from 'react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/utils';
import { Plus, Check, X } from 'lucide-react';

interface NovedadUnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
  employeeSalary: number;
  onCreateNovedad: (data: CreateNovedadData) => Promise<void>;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number, dias?: number) => number | null;
}

type ModalView = 'selector' | 'form' | 'summary';

interface AddedNovedad {
  id: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
}

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
  const [addedNovedades, setAddedNovedades] = useState<AddedNovedad[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setAddedNovedades([]);
    onClose();
  };

  const handleSubmitSingle = async (formData: any) => {
    console.log('📝 NovedadUnifiedModal - Submitting single novedad:', formData);
    
    const novedadData: CreateNovedadData = {
      empleado_id: employeeId,
      ...formData
    };

    try {
      setIsSubmitting(true);
      await onCreateNovedad(novedadData);
      
      // Add to added novedades list
      const newNovedad: AddedNovedad = {
        id: Date.now().toString(),
        ...formData
      };
      setAddedNovedades(prev => [...prev, newNovedad]);
      
      // Show summary view
      setCurrentView('summary');
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setCurrentView('selector');
    setSelectedCategory(null);
  };

  const getTipoLabel = (tipo: string): string => {
    const labels: Record<string, string> = {
      'horas_extra': 'Horas Extra',
      'recargo_nocturno': 'Recargo Nocturno',
      'vacaciones': 'Vacaciones',
      'incapacidades': 'Incapacidades',
      'licencias': 'Licencias',
      'ingresos_adicionales': 'Ingresos Adicionales',
      'deducciones': 'Deducciones',
      'prestamos': 'Préstamos',
      'retefuente': 'Retención en la Fuente'
    };
    return labels[tipo] || tipo;
  };

  const getTotalDevengos = () => {
    const devengos = ['horas_extra', 'recargo_nocturno', 'vacaciones', 'incapacidades', 'licencias', 'ingresos_adicionales'];
    return addedNovedades
      .filter(n => devengos.includes(n.tipo_novedad))
      .reduce((sum, n) => sum + n.valor, 0);
  };

  const getTotalDeducciones = () => {
    const deducciones = ['deducciones', 'prestamos', 'retefuente'];
    return addedNovedades
      .filter(n => deducciones.includes(n.tipo_novedad))
      .reduce((sum, n) => sum + n.valor, 0);
  };

  const renderForm = () => {
    if (!selectedCategory) return null;

    const commonProps = {
      onBack: handleBackToSelector,
      onSubmit: handleSubmitSingle,
      employeeSalary,
      calculateSuggestedValue
    };

    const commonPropsWithoutCalculation = {
      onBack: handleBackToSelector,
      onSubmit: handleSubmitSingle,
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

  const renderSummary = () => {
    const totalDevengos = getTotalDevengos();
    const totalDeducciones = getTotalDeducciones();
    const totalNeto = totalDevengos - totalDeducciones;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <Check className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Novedades Agregadas</h3>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Se han agregado las siguientes novedades para <strong>{employeeName}</strong>:
          </p>

          {addedNovedades.map((novedad) => (
            <div key={novedad.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{getTipoLabel(novedad.tipo_novedad)}</div>
                {novedad.subtipo && (
                  <div className="text-sm text-gray-500">{novedad.subtipo}</div>
                )}
                {novedad.horas && (
                  <div className="text-sm text-gray-500">{novedad.horas} horas</div>
                )}
                {novedad.dias && (
                  <div className="text-sm text-gray-500">{novedad.dias} días</div>
                )}
              </div>
              <div className="font-semibold">
                {formatCurrency(novedad.valor)}
              </div>
            </div>
          ))}

          {/* Summary totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Devengos:</span>
              <span className="text-green-600 font-medium">
                {formatCurrency(totalDevengos)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Deducciones:</span>
              <span className="text-red-600 font-medium">
                {formatCurrency(totalDeducciones)}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Neto:</span>
              <span className={totalNeto >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(totalNeto)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleAddAnother}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Otra
          </Button>
          <Button onClick={handleClose}>
            <Check className="h-4 w-4 mr-2" />
            Finalizar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={handleClose}
      className="max-w-2xl"
      closeOnEscape={true}
      closeOnBackdrop={true}
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

      {currentView === 'summary' && renderSummary()}

      {isSubmitting && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Guardando novedad...</span>
            </div>
          </div>
        </div>
      )}
    </CustomModal>
  );
};
