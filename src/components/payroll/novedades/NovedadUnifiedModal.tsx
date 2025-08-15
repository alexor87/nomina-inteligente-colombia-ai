
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { NovedadIncapacidadFormSimple } from './forms/NovedadIncapacidadFormSimple';
import { NovedadLicenciasForm } from './forms/NovedadLicenciasForm';
import { NovedadHorasExtraConsolidatedForm } from './forms/NovedadHorasExtraConsolidatedForm';
import { NovedadBonificacionesConsolidatedForm } from './forms/NovedadBonificacionesConsolidatedForm';
import { NovedadIngresosAdicionalesConsolidatedForm } from './forms/NovedadIngresosAdicionalesConsolidatedForm';
import { NovedadPrestamosConsolidatedForm } from './forms/NovedadPrestamosConsolidatedForm';
import { NovedadDeduccionesConsolidatedForm } from './forms/NovedadDeduccionesConsolidatedForm';
import { NovedadRetefuenteForm } from './forms/NovedadRetefuenteForm';
import { NovedadTypeSelector, NovedadCategory } from './NovedadTypeSelector';
import { NovedadExistingList } from './NovedadExistingList';
import { NovedadType, CreateNovedadData, NOVEDAD_CATEGORIES } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';
import { NovedadRecargoConsolidatedForm } from './forms/NovedadRecargoConsolidatedForm';
import { NovedadVacacionesConsolidatedForm } from './forms/NovedadVacacionesConsolidatedForm';
import { NovedadVacacionesForm } from './forms/NovedadVacacionesForm';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';

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
  mode?: 'liquidacion' | 'ajustes';
  companyId?: string | null;
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

const determineConstitutivo = (tipoNovedad: NovedadType, subtipo?: string): boolean => {
  for (const category of Object.values(NOVEDAD_CATEGORIES)) {
    const novedadConfig = category.types[tipoNovedad];
    if (novedadConfig) {
      return novedadConfig.constitutivo_default ?? true;
    }
  }
  
  return ['incapacidad', 'licencia_remunerada'].includes(tipoNovedad) ? false : true;
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
  endDate,
  mode = 'liquidacion',
  companyId
}) => {
  const [currentStep, setCurrentStep] = useState<'list' | 'selector' | 'form'>('list');
  const [selectedType, setSelectedType] = useState<NovedadType | null>(selectedNovedadType);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeFullName, setEmployeeFullName] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (selectedNovedadType) {
      setSelectedType(selectedNovedadType);
      setCurrentStep('form');
    } else {
      if (mode === 'ajustes') {
        setCurrentStep('selector');
      } else {
        setCurrentStep('list');
      }
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
    setRefreshTrigger(0);
    setOpen(false);
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
    if (mode === 'ajustes') {
      handleClose();
    } else {
      setCurrentStep('list');
      setSelectedType(null);
      setRefreshTrigger(Date.now());
    }
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

      return result?.valor || null;
    } catch (error) {
      console.error('Error en cálculo:', error);
      return null;
    }
  }, [employeeSalary, getPeriodDate, calculateNovedad]);

  const handleFormSubmit = async (formData: any) => {
    console.log('📥 V20.2 - Form data received:', formData);

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
      
      for (const entry of dataArray) {
        // ✅ V20.2: CONVERSIÓN EXPLÍCITA Y DEFINITIVA DE STRINGS A NÚMEROS
        const valorConverted = typeof entry.valor === 'string' ? parseFloat(entry.valor) : entry.valor;
        const diasConverted = entry.dias ? (typeof entry.dias === 'string' ? parseInt(entry.dias, 10) : entry.dias) : undefined;
        const horasConverted = entry.horas ? (typeof entry.horas === 'string' ? parseFloat(entry.horas) : entry.horas) : undefined;

        console.log('🔢 V20.2 - EXPLICIT CONVERSION:', {
          valorOriginal: entry.valor,
          valorType: typeof entry.valor,
          valorConverted,
          valorConvertedType: typeof valorConverted,
          diasOriginal: entry.dias,
          diasType: typeof entry.dias,
          diasConverted,
          diasConvertedType: typeof diasConverted,
          timestamp: new Date().toISOString()
        });

        // Validaciones defensivas específicas para incapacidad (sin cambiar la UI)
        if (selectedType === 'incapacidad') {
          if (!entry.fecha_inicio || !entry.fecha_fin) {
            toast({
              title: "Fechas requeridas",
              description: "Por favor selecciona fecha de inicio y fin para la incapacidad.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
          if (!diasConverted || diasConverted <= 0 || isNaN(diasConverted)) {
            console.error('❌ V20.2 - Invalid dias after conversion:', diasConverted);
            toast({
              title: "Días inválidos",
              description: "Los días de incapacidad deben ser mayores a 0.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
          if (!valorConverted || valorConverted <= 0 || isNaN(valorConverted)) {
            console.error('❌ V20.2 - Invalid valor after conversion:', valorConverted);
            toast({
              title: "Valor inválido",
              description: "El valor de la incapacidad debe ser mayor a 0.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }

        const constitutivo = determineConstitutivo(selectedType!, entry.subtipo);
        
        // ✅ V20.2: Estructura con NÚMEROS GARANTIZADOS
        const createData: CreateNovedadData = {
          empleado_id: employeeId,
          periodo_id: periodId,
          company_id: companyId || '',
          tipo_novedad: selectedType!,
          // ✅ V20.2: VALORES NUMÉRICOS EXPLÍCITAMENTE CONVERTIDOS
          valor: valorConverted,
          horas: horasConverted,
          dias: diasConverted,
          observacion: entry.observacion,
          fecha_inicio: entry.fecha_inicio,
          fecha_fin: entry.fecha_fin,
          subtipo: entry.subtipo || entry.tipo,
          base_calculo: entry.base_calculo,
          constitutivo_salario: constitutivo
        };
        
        console.log('📤 V20.2 - FINAL SUBMIT DATA WITH GUARANTEED NUMBERS:', {
          ...createData,
          valorType: typeof createData.valor,
          diasType: typeof createData.dias,
          horasType: typeof createData.horas,
          timestamp: new Date().toISOString()
        });
        
        await onSubmit(createData);

        // ✅ Notificar al padre para refrescar lista del empleado
        if (onEmployeeNovedadesChange && employeeId) {
          await onEmployeeNovedadesChange(employeeId);
        }
      }
      
      if (mode === 'ajustes') {
        handleClose();
      } else {
        setCurrentStep('list');
        setSelectedType(null);
        setRefreshTrigger(Date.now());
      }
      
    } catch (error: any) {
      console.error('Error procesando novedades:', error);
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
        return <NovedadHorasExtraConsolidatedForm {...baseProps} />;
      
      case 'recargo_nocturno':
        return (
          <NovedadRecargoConsolidatedForm 
            {...baseProps} 
            periodoFecha={getPeriodDate()}
          />
        );
        
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
        
      case 'otros_ingresos':
        return <NovedadIngresosAdicionalesConsolidatedForm {...baseProps} />;
        
      case 'libranza':
        return <NovedadPrestamosConsolidatedForm {...baseProps} />;
        
      case 'descuento_voluntario':
      case 'multa':
        return <NovedadDeduccionesConsolidatedForm {...baseProps} />;

      case 'incapacidad':
        return (
          <NovedadIncapacidadFormSimple
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
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
          mode={mode}
        />
      );
    }

    if (currentStep === 'form') {
      return renderNovedadForm();
    }

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
              <DialogTitle>
                {mode === 'ajustes' ? 'Registrar Ajuste de Nómina' : 'Agregar Novedad'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'ajustes' 
                  ? 'Registra un ajuste manual para el empleado en este período.'
                  : 'Completa los campos para agregar una novedad al empleado.'
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
