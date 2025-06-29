import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Trash2, 
  Calculator,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { NovedadType, CreateNovedadData, calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { NovedadForm } from '@/components/payroll/novedades/NovedadForm';
import { formatCurrency } from '@/lib/utils';
import { JornadaLegalTooltip } from '@/components/ui/JornadaLegalTooltip';

interface DevengoModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeSalary: number;
  payrollId: string;
  periodId: string;
  modalType: 'devengado' | 'deduccion';
  onNovedadCreated?: (employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => void;
}

interface NovedadDisplay {
  id: string;
  tipo_novedad: NovedadType;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  base_calculo?: any;
}

export const DevengoModal = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeSalary,
  payrollId,
  periodId,
  modalType,
  onNovedadCreated
}: DevengoModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [novedades, setNovedades] = useState<NovedadDisplay[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<NovedadDisplay | null>(null);
  const [currentPeriodDate, setCurrentPeriodDate] = useState<Date>(new Date());

  // Cargar fecha del período para cálculos precisos
  useEffect(() => {
    const loadPeriodDate = async () => {
      try {
        // Aquí deberías cargar la fecha real del período desde la base de datos
        // Por ahora usamos la fecha actual, pero en producción esto debe venir del período
        setCurrentPeriodDate(new Date());
      } catch (error) {
        console.error('Error loading period date:', error);
        setCurrentPeriodDate(new Date());
      }
    };

    if (isOpen) {
      loadPeriodDate();
    }
  }, [isOpen, periodId]);

  const loadNovedades = useCallback(async () => {
    if (!isOpen) return;
    
    try {
      setIsLoading(true);
      console.log('🔍 Loading novedades for employee in modal:', employeeId, 'period:', periodId);
      
      const data = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);
      
      // Filtrar por tipo de modal
      const filteredNovedades = data.filter(novedad => {
        const isDevengado = ['horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 
                            'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(novedad.tipo_novedad);
        
        return modalType === 'devengado' ? isDevengado : !isDevengado;
      });
      
      setNovedades(filteredNovedades);
      console.log('Loaded novedades:', filteredNovedades);
    } catch (error) {
      console.error('Error loading novedades:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las novedades",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, employeeId, periodId, modalType, toast]);

  useEffect(() => {
    loadNovedades();
  }, [loadNovedades]);

  // Función de cálculo mejorada con jornada legal dinámica
  const calculateSuggestedValue = useCallback((
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    try {
      if (!employeeSalary || employeeSalary <= 0) return null;
      
      // Usar el sistema de cálculo mejorado con fecha del período
      const resultado = calcularValorNovedadEnhanced(
        tipoNovedad,
        subtipo,
        employeeSalary,
        dias,
        horas,
        currentPeriodDate // Usar fecha del período para cálculos históricos precisos
      );
      
      console.log(`💰 Calculated value with enhanced system for ${tipoNovedad}:`, resultado.valor);
      console.log(`📊 Calculation details:`, resultado.baseCalculo.detalle_calculo);
      
      return resultado.valor > 0 ? resultado.valor : null;
    } catch (error) {
      console.error('Error calculating suggested value:', error);
      return null;
    }
  }, [employeeSalary, currentPeriodDate]);

  const handleCreateNovedad = async (formData: CreateNovedadData) => {
    try {
      setIsLoading(true);
      
      const novedadData: CreateNovedadData = {
        empleado_id: employeeId,
        periodo_id: periodId,
        ...formData
      };

      console.log('📝 Creating novedad with enhanced calculation system:', novedadData);
      
      // Usar el servicio mejorado
      const newNovedad = await NovedadesEnhancedService.createNovedad(novedadData);

      if (newNovedad) {
        await loadNovedades();
        setShowForm(false);
        
        // Notificar al componente padre
        if (onNovedadCreated) {
          onNovedadCreated(employeeId, newNovedad.valor, modalType);
        }

        toast({
          title: "Novedad creada",
          description: `Se ha creado la novedad de tipo ${formData.tipo_novedad} por ${formatCurrency(newNovedad.valor)}`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error creating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la novedad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNovedad = async (formData: CreateNovedadData) => {
    if (!editingNovedad) return;

    try {
      setIsLoading(true);
      
      const updatedNovedad = await NovedadesEnhancedService.updateNovedad(
        editingNovedad.id,
        formData
      );

      if (updatedNovedad) {
        await loadNovedades();
        setEditingNovedad(null);
        setShowForm(false);

        if (onNovedadCreated) {
          onNovedadCreated(employeeId, updatedNovedad.valor, modalType);
        }

        toast({
          title: "Novedad actualizada",
          description: "La novedad se ha actualizado correctamente"
        });
      }
    } catch (error) {
      console.error('Error updating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la novedad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    try {
      setIsLoading(true);
      await NovedadesEnhancedService.deleteNovedad(novedadId);
      await loadNovedades();

      if (onNovedadCreated) {
        onNovedadCreated(employeeId, 0, modalType);
      }

      toast({
        title: "Novedad eliminada",
        description: "La novedad se ha eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la novedad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalValue = novedades.reduce((sum, novedad) => sum + novedad.valor, 0);

  const getNovedadLabel = (tipo: NovedadType): string => {
    const labels: Record<NovedadType, string> = {
      horas_extra: 'Horas Extra',
      recargo_nocturno: 'Recargo Nocturno',
      vacaciones: 'Vacaciones',
      licencia_remunerada: 'Licencia Remunerada',
      incapacidad: 'Incapacidad',
      bonificacion: 'Bonificación',
      comision: 'Comisión',
      prima: 'Prima',
      otros_ingresos: 'Otros Ingresos',
      libranza: 'Libranza',
      multa: 'Multa',
      ausencia: 'Ausencia',
      descuento_voluntario: 'Descuento Voluntario',
      retencion_fuente: 'Retención en la Fuente',
      fondo_solidaridad: 'Fondo de Solidaridad',
      salud: 'Salud',
      pension: 'Pensión',
      arl: 'ARL',
      caja_compensacion: 'Caja de Compensación',
      icbf: 'ICBF',
      sena: 'SENA'
    };
    return labels[tipo] || tipo;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span className="text-lg font-semibold">
                {modalType === 'devengado' ? 'Devengados' : 'Deducciones'} - {employeeName}
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Salario: {formatCurrency(employeeSalary)}
                </Badge>
                <JornadaLegalTooltip fecha={currentPeriodDate} />
              </div>
            </div>
            <Badge 
              variant={modalType === 'devengado' ? 'default' : 'destructive'}
              className="text-sm px-3 py-1"
            >
              Total: {formatCurrency(totalValue)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {!showForm ? (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  {novedades.length} {modalType === 'devengado' ? 'devengados' : 'deducciones'} registradas
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar {modalType}</span>
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : novedades.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay {modalType === 'devengado' ? 'devengados' : 'deducciones'}
                    </h3>
                    <p className="text-gray-600">
                      Haz clic en "Agregar {modalType}" para comenzar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {novedades.map((novedad) => (
                      <div key={novedad.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{getNovedadLabel(novedad.tipo_novedad)}</h4>
                              {(novedad.horas || novedad.dias) && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {novedad.horas && `${novedad.horas}h`}
                                    {novedad.horas && novedad.dias && ' - '}
                                    {novedad.dias && `${novedad.dias}d`}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              {novedad.observacion && (
                                <div>
                                  <strong>Observación:</strong> {novedad.observacion}
                                </div>
                              )}
                              {novedad.fecha_inicio && novedad.fecha_fin && (
                                <div>
                                  <strong>Período:</strong> {novedad.fecha_inicio} a {novedad.fecha_fin}
                                </div>
                              )}
                              {novedad.base_calculo?.detalle_calculo && (
                                <div className="text-xs bg-gray-100 p-2 rounded">
                                  <strong>Cálculo:</strong> {novedad.base_calculo.detalle_calculo}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 ml-4">
                            <div className="text-right">
                              <div className={`font-semibold ${
                                modalType === 'devengado' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {modalType === 'devengado' ? '+' : '-'}{formatCurrency(novedad.valor)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingNovedad(novedad);
                                  setShowForm(true);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNovedad(novedad.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {editingNovedad ? 'Editar' : 'Agregar'} {modalType}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingNovedad(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <NovedadForm
                  onSubmit={editingNovedad ? handleUpdateNovedad : handleCreateNovedad}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingNovedad(null);
                  }}
                  initialData={editingNovedad ? {
                    tipo_novedad: editingNovedad.tipo_novedad,
                    valor: editingNovedad.valor,
                    horas: editingNovedad.horas || null,
                    dias: editingNovedad.dias || null,
                    observacion: editingNovedad.observacion || '',
                    fecha_inicio: editingNovedad.fecha_inicio || '',
                    fecha_fin: editingNovedad.fecha_fin || ''
                  } : undefined}
                  isLoading={isLoading}
                  employeeSalary={employeeSalary}
                  calculateSuggestedValue={calculateSuggestedValue}
                  modalType={modalType}
                />
              </ScrollArea>
            </div>
          )}
        </div>

        <Separator />
        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calculator className="h-4 w-4" />
            <span>Cálculos actualizados con jornada legal dinámica</span>
          </div>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
