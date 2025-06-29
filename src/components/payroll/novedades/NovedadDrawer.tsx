
import React, { useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { PayrollNovedad, CreateNovedadData, NovedadType, calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { NovedadForm } from './NovedadForm';
import { formatCurrency } from '@/lib/utils';
import { JornadaLegalTooltip } from '@/components/ui/JornadaLegalTooltip';

interface NovedadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
  employeeSalary: number;
  novedades: PayrollNovedad[];
  onCreateNovedad: (data: CreateNovedadData) => Promise<void>;
  onUpdateNovedad: (id: string, data: CreateNovedadData) => Promise<void>;
  onDeleteNovedad: (id: string) => Promise<void>;
  isLoading: boolean;
  canEdit: boolean;
  onRecalculatePayroll?: () => void;
}

export const NovedadDrawer = ({
  isOpen,
  onClose,
  employeeName,
  employeeId,
  employeeSalary,
  novedades,
  onCreateNovedad,
  onUpdateNovedad,
  onDeleteNovedad,
  isLoading,
  canEdit,
  onRecalculatePayroll
}: NovedadDrawerProps) => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<PayrollNovedad | null>(null);
  const [currentPeriodDate] = useState<Date>(new Date());

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
        currentPeriodDate
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
      await onCreateNovedad(formData);
      setShowForm(false);
      
      if (onRecalculatePayroll) {
        onRecalculatePayroll();
      }

      toast({
        title: "Novedad creada",
        description: `Se ha creado la novedad de tipo ${formData.tipo_novedad}`,
        duration: 3000
      });
    } catch (error) {
      console.error('Error creating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la novedad",
        variant: "destructive"
      });
    }
  };

  const handleUpdateNovedad = async (formData: CreateNovedadData) => {
    if (!editingNovedad) return;

    try {
      await onUpdateNovedad(editingNovedad.id, formData);
      setEditingNovedad(null);
      setShowForm(false);

      if (onRecalculatePayroll) {
        onRecalculatePayroll();
      }

      toast({
        title: "Novedad actualizada",
        description: "La novedad se ha actualizado correctamente"
      });
    } catch (error) {
      console.error('Error updating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la novedad",
        variant: "destructive"
      });
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    try {
      await onDeleteNovedad(novedadId);

      if (onRecalculatePayroll) {
        onRecalculatePayroll();
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
    }
  };

  // Separar devengados y deducciones
  const devengados = novedades.filter(novedad => {
    return ['horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 
            'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(novedad.tipo_novedad);
  });

  const deducciones = novedades.filter(novedad => {
    return !['horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 
             'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(novedad.tipo_novedad);
  });

  const totalDevengados = devengados.reduce((sum, novedad) => sum + novedad.valor, 0);
  const totalDeducciones = deducciones.reduce((sum, novedad) => sum + novedad.valor, 0);

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

  const renderNovedadList = (novedadesList: PayrollNovedad[], title: string, isDevengado: boolean) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <Badge 
          variant={isDevengado ? 'default' : 'destructive'}
          className="text-sm"
        >
          {formatCurrency(isDevengado ? totalDevengados : totalDeducciones)}
        </Badge>
      </div>
      
      {novedadesList.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No hay {title.toLowerCase()} registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {novedadesList.map((novedad) => (
            <div key={novedad.id} className="border rounded-lg p-3 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">{getNovedadLabel(novedad.tipo_novedad)}</span>
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
                  
                  {novedad.observacion && (
                    <p className="text-xs text-gray-600 mb-1">
                      <strong>Obs:</strong> {novedad.observacion}
                    </p>
                  )}
                  
                  {novedad.base_calculo?.detalle_calculo && (
                    <div className="text-xs bg-gray-100 p-1 rounded mt-1">
                      {novedad.base_calculo.detalle_calculo}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-3">
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${
                      isDevengado ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {isDevengado ? '+' : '-'}{formatCurrency(novedad.valor)}
                    </div>
                  </div>
                  
                  {canEdit && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingNovedad(novedad);
                          setShowForm(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNovedad(novedad.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[800px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div>
              <span className="text-lg font-semibold">
                Novedades - {employeeName}
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Salario: {formatCurrency(employeeSalary)}
                </Badge>
                <JornadaLegalTooltip fecha={currentPeriodDate} />
              </div>
            </div>
            <Badge 
              variant="secondary"
              className="text-sm px-3 py-1"
            >
              {novedades.length} novedades
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Gestiona las novedades del empleado para este período de nómina
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {!showForm ? (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  Total: {devengados.length} devengados, {deducciones.length} deducciones
                </div>
                {canEdit && (
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="flex items-center space-x-2"
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar novedad</span>
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {renderNovedadList(devengados, 'Devengados', true)}
                    <Separator />
                    {renderNovedadList(deducciones, 'Deducciones', false)}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {editingNovedad ? 'Editar' : 'Agregar'} novedad
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
      </SheetContent>
    </Sheet>
  );
};
