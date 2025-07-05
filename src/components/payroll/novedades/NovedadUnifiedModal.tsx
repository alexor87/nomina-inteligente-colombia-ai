import React, { useState, useEffect } from 'react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { NovedadTypeSelector, NovedadCategory } from './NovedadTypeSelector';
import { NovedadHorasExtraConsolidatedForm } from './forms/NovedadHorasExtraConsolidatedForm';
import { NovedadRecargoForm } from './forms/NovedadRecargoForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { NovedadIncapacidadForm } from './forms/NovedadIncapacidadForm';
import { NovedadLicenciasForm } from './forms/NovedadLicenciasForm';
import { NovedadIngresosAdicionalesForm } from './forms/NovedadIngresosAdicionalesForm';
import { NovedadDeduccionesForm } from './forms/NovedadDeduccionesForm';
import { NovedadPrestamosForm } from './forms/NovedadPrestamosForm';
import { NovedadRetefuenteForm } from './forms/NovedadRetefuenteForm';
import { NovedadBonificacionesForm } from './forms/NovedadBonificacionesForm';
import { CreateNovedadData, PayrollNovedad, NovedadType } from '@/types/novedades-enhanced';
import { formatCurrency } from '@/lib/utils';
import { Plus, Check, X, Edit, Trash2, FileText } from 'lucide-react';
import { useNovedades } from '@/hooks/useNovedades';
import { calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';

interface NovedadUnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
  employeeSalary: number;
  periodId: string;
  onCreateNovedad: (data: CreateNovedadData) => Promise<void>;
  onNovedadChange?: () => Promise<void>;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number, dias?: number) => number | null;
}

type ModalView = 'consolidated' | 'selector' | 'form' | 'summary';

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
  periodId,
  onCreateNovedad,
  onNovedadChange,
  calculateSuggestedValue
}) => {
  const [currentView, setCurrentView] = useState<ModalView>('consolidated');
  const [selectedCategory, setSelectedCategory] = useState<NovedadCategory | null>(null);
  const [addedNovedades, setAddedNovedades] = useState<AddedNovedad[]>([]);
  const [existingNovedades, setExistingNovedades] = useState<PayrollNovedad[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { loadNovedades, deleteNovedad } = useNovedades(periodId);

  // Función de cálculo mejorada que maneja todos los casos
  const calculateNovedadValue = (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    console.log('🧮 NovedadUnifiedModal - Calculating value:', { tipoNovedad, subtipo, horas, dias, employeeSalary });
    
    if (!employeeSalary || employeeSalary <= 0) {
      console.log('❌ Invalid salary for calculation');
      return null;
    }

    try {
      // Usar la función externa si está disponible
      if (calculateSuggestedValue) {
        const result = calculateSuggestedValue(tipoNovedad, subtipo, horas, dias);
        console.log('📊 External calculation result:', result);
        if (result && result > 0) {
          return result;
        }
      }

      // Usar la función interna como fallback
      const calculationResult = calcularValorNovedadEnhanced(
        tipoNovedad,
        subtipo,
        employeeSalary,
        dias,
        horas,
        new Date()
      );
      
      console.log('📊 Internal calculation result:', calculationResult.valor);
      return calculationResult.valor > 0 ? calculationResult.valor : null;
    } catch (error) {
      console.error('❌ Error in calculation:', error);
      return null;
    }
  };

  // Load existing novedades when modal opens
  useEffect(() => {
    if (isOpen && employeeId) {
      setIsLoading(true);
      loadNovedades(employeeId)
        .then((novedades) => {
          setExistingNovedades(novedades);
        })
        .catch((error) => {
          console.error('Error loading existing novedades:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, employeeId, loadNovedades]);

  const handleSelectCategory = (category: NovedadCategory) => {
    setSelectedCategory(category);
    setCurrentView('form');
  };

  const handleBackToConsolidated = () => {
    setCurrentView('consolidated');
    setSelectedCategory(null);
  };

  const handleBackToSelector = () => {
    setCurrentView('selector');
    setSelectedCategory(null);
  };

  const handleClose = () => {
    setCurrentView('consolidated');
    setSelectedCategory(null);
    setAddedNovedades([]);
    setExistingNovedades([]);
    onClose();
  };

  const handleSubmitSingle = async (formData: any) => {
    console.log('📝 NovedadUnifiedModal - Submitting single novedad:', formData);
    console.log('👤 NovedadUnifiedModal - For employee:', employeeId);
    
    const novedadData: CreateNovedadData = {
      empleado_id: employeeId,
      periodo_id: periodId,
      company_id: '', // Will be set by the service
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
      
      // Reload existing novedades to show the new one
      const updatedNovedades = await loadNovedades(employeeId);
      setExistingNovedades(updatedNovedades);
      
      // Notificar cambio para recálculo
      if (onNovedadChange) {
        console.log('🔄 Triggering novedad change callback');
        await onNovedadChange();
      }
      
      // Go back to consolidated view
      setCurrentView('consolidated');
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMultiple = async (formDataArray: any[]) => {
    console.log('📝 NovedadUnifiedModal - Submitting multiple novedades:', formDataArray);
    
    try {
      setIsSubmitting(true);
      
      const newNovedades: AddedNovedad[] = [];
      
      // Create each novedad
      for (const formData of formDataArray) {
        const novedadData: CreateNovedadData = {
          empleado_id: employeeId,
          periodo_id: periodId,
          company_id: '', // Will be set by the service
          ...formData
        };
        
        await onCreateNovedad(novedadData);
        
        newNovedades.push({
          id: `${Date.now()}-${Math.random()}`,
          ...formData
        });
      }
      
      // Add all to added novedades list
      setAddedNovedades(prev => [...prev, ...newNovedades]);
      
      // Reload existing novedades to show the new ones
      const updatedNovedades = await loadNovedades(employeeId);
      setExistingNovedades(updatedNovedades);
      
      // Notificar cambio para recálculo
      if (onNovedadChange) {
        console.log('🔄 Triggering novedad change callback for multiple');
        await onNovedadChange();
      }
      
      // Go back to consolidated view
      setCurrentView('consolidated');
    } catch (error) {
      console.error('❌ Error creating novedades:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta novedad?')) {
      try {
        console.log('🗑️ Eliminando novedad:', novedadId);
        await deleteNovedad(novedadId);
        
        // Reload existing novedades
        const updatedNovedades = await loadNovedades(employeeId);
        setExistingNovedades(updatedNovedades);
        
        // Notificar cambio para recálculo automático
        console.log('🔄 Notificando cambio para recálculo...');
        if (onNovedadChange) {
          await onNovedadChange();
        }
        
        console.log('✅ Novedad eliminada y recálculo completado');
      } catch (error) {
        console.error('❌ Error deleting novedad:', error);
      }
    }
  };

  const handleAddAnother = () => {
    setCurrentView('selector');
    setSelectedCategory(null);
  };

  const getTipoLabel = (tipo: string, subtipo?: string): string => {
    const labels: Record<string, string> = {
      'horas_extra': 'Horas Extra',
      'recargo_nocturno': 'Recargo',
      'bonificaciones': 'Bonificaciones',
      'vacaciones': 'Vacaciones',
      'incapacidades': 'Incapacidades',
      'incapacidad': 'Incapacidades',
      'licencias': 'Licencias',
      'licencia_remunerada': 'Licencias',
      'ingresos_adicionales': 'Ingresos Adicionales',
      'otros_ingresos': 'Ingresos Adicionales',
      'deducciones': 'Deducciones',
      'deducciones_especiales': 'Deducciones Especiales',
      'prestamos': 'Préstamos',
      'libranza': 'Préstamos',
      'retefuente': 'Retención en la Fuente',
      'retencion_fuente': 'Retención en la Fuente'
    };
    
    let baseLabel = labels[tipo] || tipo;
    
    // For recargos and horas_extra, add the subtipo for better identification
    if ((tipo === 'recargo_nocturno' || tipo === 'horas_extra') && subtipo) {
      const subtipoLabel = getSubtipoLabel(subtipo);
      if (subtipoLabel) {
        baseLabel = `${baseLabel} - ${subtipoLabel}`;
      }
    }
    
    return baseLabel;
  };

  const getSubtipoLabel = (subtipo: string | undefined): string => {
    if (!subtipo) return '';
    const labels: Record<string, string> = {
      // Horas extra subtipos
      'diurnas': 'Diurnas',
      'nocturnas': 'Nocturnas',
      'dominicales_diurnas': 'Dom. Diurnas',
      'dominicales_nocturnas': 'Dom. Nocturnas',
      'festivas_diurnas': 'Fest. Diurnas',
      'festivas_nocturnas': 'Fest. Nocturnas',
      // Recargo subtipos
      'nocturno': 'Nocturno',
      'dominical': 'Dominical',
      'nocturno_dominical': 'Nocturno Dominical',
      'festivo': 'Festivo',
      'nocturno_festivo': 'Nocturno Festivo'
    };
    return labels[subtipo] || subtipo;
  };

  const getAllNovedades = () => {
    return [...existingNovedades];
  };

  const getTotalDevengos = () => {
    const devengos = ['horas_extra', 'recargo_nocturno', 'bonificaciones', 'vacaciones', 'incapacidades', 'incapacidad', 'licencias', 'licencia_remunerada', 'ingresos_adicionales', 'otros_ingresos'];
    return getAllNovedades()
      .filter(n => devengos.includes(n.tipo_novedad))
      .reduce((sum, n) => sum + Number(n.valor), 0);
  };

  const getTotalDeducciones = () => {
    const deducciones = ['deducciones', 'deducciones_especiales', 'prestamos', 'libranza', 'retefuente', 'retencion_fuente'];
    return getAllNovedades()
      .filter(n => deducciones.includes(n.tipo_novedad))
      .reduce((sum, n) => sum + Number(n.valor), 0);
  };

  const renderConsolidatedView = () => {
    const allNovedades = getAllNovedades();
    const totalDevengos = getTotalDevengos();
    const totalDeducciones = getTotalDeducciones();
    const totalNeto = totalDevengos - totalDeducciones;

    // Group novedades by type for better display
    const groupedNovedades = allNovedades.reduce((acc, novedad) => {
      const key = novedad.tipo_novedad;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(novedad);
      return acc;
    }, {} as Record<string, PayrollNovedad[]>);

    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando novedades...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Novedades - {employeeName}</h3>
          </div>
          <Button onClick={handleAddAnother} className="bg-blue-600 hover:bg-blue-700 relative">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Novedad
          </Button>
        </div>

        {allNovedades.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No hay novedades registradas para este empleado</p>
            <Button onClick={handleAddAnother} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Novedad
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {Object.entries(groupedNovedades).map(([tipo, novedades]) => (
                <div key={tipo} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{getTipoLabel(tipo)}</h4>
                      <span className="text-sm text-gray-600">
                        {novedades.length} registro{novedades.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {novedades.map((novedad) => (
                      <div key={novedad.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            {(novedad as any).subtipo && (
                              <div className="text-sm font-medium text-gray-700">
                                {getSubtipoLabel((novedad as any).subtipo)}
                              </div>
                            )}
                            <div className="text-sm text-gray-500 flex gap-3">
                              {novedad.horas && <span>{novedad.horas} horas</span>}
                              {novedad.dias && <span>{novedad.dias} días</span>}
                            </div>
                          </div>
                          {novedad.observacion && (
                            <div className="text-xs text-gray-500 mt-1">
                              {novedad.observacion}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-right">
                            {formatCurrency(Number(novedad.valor))}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNovedad(novedad.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 px-4 py-2 border-t">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal {getTipoLabel(tipo)}:</span>
                      <span>{formatCurrency(novedades.reduce((sum, n) => sum + Number(n.valor), 0))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary totals */}
            <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-base">
                <span className="font-medium">Total Devengos:</span>
                <span className="text-green-600 font-semibold">
                  {formatCurrency(totalDevengos)}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="font-medium">Total Deducciones:</span>
                <span className="text-red-600 font-semibold">
                  {formatCurrency(totalDeducciones)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Neto:</span>
                  <span className={totalNeto >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(totalNeto)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      </div>
    );
  };

  const renderForm = () => {
    if (!selectedCategory) return null;

    const commonProps = {
      onBack: handleBackToSelector,
      onSubmit: handleSubmitSingle,
      employeeSalary,
      calculateSuggestedValue: calculateNovedadValue
    };

    const commonPropsWithoutCalculation = {
      onBack: handleBackToSelector,
      onSubmit: handleSubmitSingle,
      employeeSalary
    };

    switch (selectedCategory) {
      case 'horas_extra':
        return (
          <NovedadHorasExtraConsolidatedForm 
            onBack={handleBackToSelector}
            onSubmit={handleSubmitMultiple}
            employeeSalary={employeeSalary}
            calculateSuggestedValue={calculateNovedadValue}
          />
        );
      case 'recargo_nocturno':
        return <NovedadRecargoForm {...commonProps} />;
      case 'bonificaciones':
        return <NovedadBonificacionesForm {...commonPropsWithoutCalculation} />;
      case 'vacaciones':
        return <NovedadVacacionesForm {...commonProps} />;
      case 'incapacidades':
        return <NovedadIncapacidadForm {...commonProps} />;
      case 'licencias':
        return <NovedadLicenciasForm {...commonProps} />;
      case 'ingresos_adicionales':
        return <NovedadIngresosAdicionalesForm {...commonPropsWithoutCalculation} />;
      case 'deducciones_especiales':
        return <NovedadDeduccionesForm {...commonPropsWithoutCalculation} />;
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

    // Group novedades by type for better display
    const groupedNovedades = addedNovedades.reduce((acc, novedad) => {
      const key = novedad.tipo_novedad;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(novedad);
      return acc;
    }, {} as Record<string, AddedNovedad[]>);

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

          {Object.entries(groupedNovedades).map(([tipo, novedades]) => (
            <div key={tipo} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h4 className="font-medium text-gray-900">{getTipoLabel(tipo)}</h4>
              </div>
              <div className="p-3 space-y-2">
                {novedades.map((novedad) => (
                  <div key={novedad.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      {novedad.subtipo && (
                        <div className="text-sm text-gray-600">{getSubtipoLabel(novedad.subtipo)}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        {novedad.horas && `${novedad.horas} horas`}
                        {novedad.dias && `${novedad.dias} días`}
                      </div>
                    </div>
                    <div className="font-semibold text-right">
                      {formatCurrency(novedad.valor)}
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal {getTipoLabel(tipo)}:</span>
                    <span>{formatCurrency(novedades.reduce((sum, n) => sum + n.valor, 0))}</span>
                  </div>
                </div>
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
      className="max-w-4xl"
      closeOnEscape={true}
      closeOnBackdrop={true}
    >
      {currentView === 'consolidated' && renderConsolidatedView()}
      
      {currentView === 'selector' && (
        <NovedadTypeSelector
          onClose={handleBackToConsolidated}
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
              <span>Guardando novedades...</span>
            </div>
          </div>
        </div>
      )}
    </CustomModal>
  );
};
