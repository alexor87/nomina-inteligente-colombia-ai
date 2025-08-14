import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
import { NovedadExistingList } from './NovedadExistingList';
import { NovedadType, CreateNovedadData } from '@/types/novedades-enhanced';
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

  // ✅ KISS: Fecha del período sin complejidad
  const getPeriodDate = useCallback(() => {
    if (startDate) {
      const date = new Date(startDate + 'T00:00:00');
      console.log('📅 Fecha período:', date.toISOString().split('T')[0]);
      return date;
    }
    return new Date();
  }, [startDate]);

  useEffect(() => {
    if (selectedNovedadType) {
      setSelectedType(selectedNovedadType);
      setCurrentStep('form');
    } else {
      // En modo ajustes, ir directamente al selector
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
    // Reset all states before closing
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
    // En modo ajustes, cerrar el modal en lugar de ir a la lista
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
      console.warn('❌ Salario del empleado no definido');
      return null;
    }

    try {
      const fechaPeriodo = getPeriodDate().toISOString().split('T')[0];
      
      console.log('🎯 MODAL: Calculando novedad:', {
        tipo: tipoNovedad,
        subtipo,
        salario: employeeSalary,
        horas,
        dias,
        fecha: fechaPeriodo
      });

      const result = await calculateNovedad({
        tipoNovedad,
        subtipo,
        salarioBase: employeeSalary,
        horas,
        dias,
        fechaPeriodo
      });

      if (result) {
        console.log('✅ MODAL: Cálculo exitoso:', {
          tipo: subtipo || tipoNovedad,
          valor: result.valor,
          detalle: result.detalleCalculo
        });
        return result.valor;
      }

      return null;
    } catch (error) {
      console.error('❌ Error en cálculo:', error);
      return null;
    }
  }, [employeeSalary, getPeriodDate, calculateNovedad]);

  const handleFormSubmit = async (formData: any) => {
    console.log('📤 [MODAL V6.0] ===== RECIBIENDO DATOS DEL FORMULARIO =====');
    console.log('📤 [MODAL V6.0] formData original:', JSON.stringify(formData, null, 2));
    
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
      console.log('📤 [MODAL V6.0] Datos del formulario recibidos:', formData);
      
      const isArrayData = Array.isArray(formData);
      const dataArray = isArrayData ? formData : [formData];
      
      console.log(`🔄 [MODAL V6.0] Procesando ${dataArray.length} entradas de novedad`);
      
      for (const entry of dataArray) {
        console.log('🔍 [MODAL V6.0] ===== PROCESANDO ENTRADA =====');
        console.log('🔍 [MODAL V6.0] Entry data completo:', JSON.stringify(entry, null, 2));
        
        // ✅ V6.0 CORRECCIÓN CRÍTICA: Mapeo específico mejorado para incapacidades
        let diasFinales = entry.dias;
        
        if (selectedType === 'incapacidad') {
          console.log('🏥 [MODAL V6.0] INCAPACIDAD DETECTADA - Análisis de días:', {
            'entry.dias_original': entry.dias,
            'entry.calculatedDays': entry.calculatedDays,
            'typeof entry.dias': typeof entry.dias,
            'typeof entry.calculatedDays': typeof entry.calculatedDays,
            'entry.dias === 0': entry.dias === 0,
            'entry.calculatedDays > 0': entry.calculatedDays > 0,
            timestamp: new Date().toISOString()
          });

          // ✅ V6.0: PRIORIZAR calculatedDays si existe y es válido
          if (entry.calculatedDays !== undefined && entry.calculatedDays !== null && entry.calculatedDays > 0) {
            diasFinales = entry.calculatedDays;
            console.log('✅ [MODAL V6.0] OVERRIDE APLICADO - Usando calculatedDays:', {
              dias_originales: entry.dias,
              dias_finales: diasFinales,
              source: 'calculatedDays prioritario'
            });
          } else if (entry.dias !== undefined && entry.dias !== null && entry.dias > 0) {
            diasFinales = entry.dias;
            console.log('⚠️ [MODAL V6.0] FALLBACK - Usando entry.dias:', {
              dias_originales: entry.dias,
              dias_finales: diasFinales,
              calculatedDays: entry.calculatedDays,
              source: 'entry.dias fallback'
            });
          } else {
            console.error('🚨 [MODAL V6.0] INCAPACIDAD SIN DÍAS VÁLIDOS:', {
              entry_dias: entry.dias,
              calculatedDays: entry.calculatedDays,
              fecha_inicio: entry.fecha_inicio,
              fecha_fin: entry.fecha_fin,
              error: 'Ambos campos son inválidos',
              timestamp: new Date().toISOString()
            });
            
            // ✅ V6.0: CÁLCULO DEFENSIVO DE EMERGENCIA
            if (entry.fecha_inicio && entry.fecha_fin) {
              try {
                const start = new Date(entry.fecha_inicio + 'T00:00:00');
                const end = new Date(entry.fecha_fin + 'T00:00:00');
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                if (calculatedDays > 0) {
                  diasFinales = calculatedDays;
                  console.log('🔧 [MODAL V6.0] CÁLCULO DE EMERGENCIA exitoso:', {
                    fecha_inicio: entry.fecha_inicio,
                    fecha_fin: entry.fecha_fin,
                    dias_calculados: diasFinales
                  });
                } else {
                  throw new Error(`Cálculo de emergencia resultó en ${calculatedDays} días`);
                }
              } catch (calcError) {
                console.error('💥 [MODAL V6.0] Error en cálculo de emergencia:', calcError);
                throw new Error(`Error crítico V6.0: Incapacidad sin días válidos y falló cálculo de emergencia. entry.dias: ${entry.dias}, calculatedDays: ${entry.calculatedDays}`);
              }
            } else {
              throw new Error(`Error crítico V6.0: Incapacidad sin días válidos ni fechas para calcular. Datos: ${JSON.stringify({dias: entry.dias, calculatedDays: entry.calculatedDays, fechas: {inicio: entry.fecha_inicio, fin: entry.fecha_fin}})}`);
            }
          }
        }
        
        console.log('🔍 [MODAL V6.0] Análisis específico de días FINAL:', {
          'entry.dias_original': entry.dias,
          'entry.calculatedDays': entry.calculatedDays,
          'diasFinales_usado': diasFinales,
          'selectedType': selectedType,
          'override_aplicado': selectedType === 'incapacidad' && entry.calculatedDays !== undefined,
          'metodo_seleccion': selectedType === 'incapacidad' 
            ? (entry.calculatedDays > 0 ? 'calculatedDays_prioritario' : 'fallback_o_emergencia')
            : 'dias_normal',
          timestamp: new Date().toISOString()
        });

        const submitData: CreateNovedadData = {
          empleado_id: employeeId,
          periodo_id: periodId,
          company_id: companyId || '',
          tipo_novedad: selectedType!,
          valor: entry.valor || 0,
          horas: entry.horas !== undefined ? entry.horas : undefined,
          dias: diasFinales, // ✅ V6.0: Usar dias corregidos con lógica mejorada
          observacion: entry.observacion || undefined,
          fecha_inicio: entry.fecha_inicio || undefined,
          fecha_fin: entry.fecha_fin || undefined,
          subtipo: entry.subtipo || entry.tipo || undefined,
          base_calculo: entry.base_calculo || undefined
        };

        console.log('🚨 [MODAL V6.0] ===== DATOS FINALES ANTES DE ENVÍO A SERVICIO =====');
        console.log('🚨 [MODAL V6.0] submitData completo:', JSON.stringify(submitData, null, 2));
        console.log('🚨 [MODAL V6.0] Verificación crítica V6.0 FINAL:', {
          tipo_novedad: submitData.tipo_novedad,
          valor: submitData.valor,
          horas: submitData.horas,
          dias: submitData.dias, // ✅ V6.0: Este valor debe ser correcto ahora
          subtipo: submitData.subtipo,
          fecha_inicio: submitData.fecha_inicio,
          fecha_fin: submitData.fecha_fin,
          'dias_type': typeof submitData.dias,
          'dias_is_zero': submitData.dias === 0,
          'dias_is_undefined': submitData.dias === undefined,
          'dias_is_positive': submitData.dias && submitData.dias > 0,
          'expected_for_incapacidad': selectedType === 'incapacidad' ? 'dias > 0' : 'N/A',
          'validation_pass': selectedType === 'incapacidad' ? (submitData.dias && submitData.dias > 0) : true,
          timestamp: new Date().toISOString()
        });

        // ✅ V6.0: VALIDACIÓN FINAL ANTES DE ENVÍO
        if (submitData.tipo_novedad === 'incapacidad') {
          if (submitData.dias === undefined || submitData.dias === null || submitData.dias <= 0) {
            console.error('🚨 [MODAL V6.0] VALIDACIÓN FINAL FALLÓ - Incapacidad con días inválidos:', {
              dias_final: submitData.dias,
              entry_original: {
                dias: entry.dias,
                calculatedDays: entry.calculatedDays
              },
              error: 'Días inválidos después de toda la lógica de corrección',
              timestamp: new Date().toISOString()
            });
            
            throw new Error(`Error crítico V6.0: Incapacidad con días inválidos después de correcciones (${submitData.dias}). Verificar lógica de sincronización.`);
          }
          
          console.log('✅ [MODAL V6.0] Incapacidad validada correctamente para envío:', {
            dias: submitData.dias,
            fechas: `${submitData.fecha_inicio} a ${submitData.fecha_fin}`,
            valor: submitData.valor,
            metodo_obtencion: entry.calculatedDays > 0 ? 'calculatedDays' : 'calculado_internamente'
          });
        }

        console.log('💾 [MODAL V6.0] ===== LLAMANDO A onSubmit =====');
        console.log('💾 [MODAL V6.0] Enviando a servicio NovedadesEnhancedService:', submitData);
        await onSubmit(submitData);
        console.log('✅ [MODAL V6.0] onSubmit completado exitosamente');
      }
      
      console.log('✅ [MODAL V6.0] Todas las entradas de novedad procesadas exitosamente');
      
      // En modo ajustes, cerrar el modal directamente
      if (mode === 'ajustes') {
        handleClose();
      } else {
        setCurrentStep('list');
        setSelectedType(null);
        setRefreshTrigger(Date.now());
      }
      
    } catch (error: any) {
      console.error('❌ [MODAL V6.0] ERROR procesando novedades:', error);
      console.error('❌ [MODAL V6.0] Stack trace:', error.stack);
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
          <NovedadIncapacidadForm
            onBack={handleBackToSelector}
            onSubmit={handleFormSubmit}
            employeeSalary={employeeSalary || 0}
            isSubmitting={isSubmitting}
            periodoFecha={getPeriodDate()}
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
