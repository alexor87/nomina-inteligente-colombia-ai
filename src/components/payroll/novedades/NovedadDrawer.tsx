
import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, Edit, Trash2, DollarSign, Clock, Calendar, FileText } from 'lucide-react';
import { Employee, PayrollPeriod } from '@/types';
import { NovedadType, PayrollNovedad } from '@/types/novedades-enhanced';
import { NovedadForm } from './NovedadForm';
import { useNovedades } from '@/hooks/useNovedades';
import { formatCurrency } from '@/lib/utils';

interface NovedadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  period: PayrollPeriod | null;
}

export const NovedadDrawer = ({ isOpen, onClose, employee, period }: NovedadDrawerProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<PayrollNovedad | null>(null);
  
  const { novedades, isLoading, createNovedad, loadNovedades, updateNovedad, deleteNovedad } = useNovedades(period?.id || '');

  // Load novedades when drawer opens or employee/period changes
  useEffect(() => {
    if (isOpen && employee && period) {
      loadNovedades(employee.id);
    }
  }, [isOpen, employee, period, loadNovedades]);

  // Close form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setEditingNovedad(null);
    }
  }, [isOpen]);

  const handleCreateNovedad = async (novedadData: any) => {
    if (!employee || !period) return;

    try {
      await createNovedad({
        ...novedadData,
        empleado_id: employee.id,
        periodo_id: period.id
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating novedad:', error);
    }
  };

  const handleUpdateNovedad = async (novedadData: any) => {
    if (!editingNovedad) return;

    try {
      await updateNovedad(editingNovedad.id, novedadData);
      setEditingNovedad(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error updating novedad:', error);
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    try {
      await deleteNovedad(novedadId);
    } catch (error) {
      console.error('Error deleting novedad:', error);
    }
  };

  const handleEditNovedad = (novedad: PayrollNovedad) => {
    setEditingNovedad(novedad);
    setShowForm(true);
  };

  // Categorize novedades
  const categorizedNovedades = useMemo(() => {
    const devengados = novedades.filter(n => 
      ['horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 'incapacidad', 
       'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(n.tipo_novedad)
    );
    
    const deducciones = novedades.filter(n => 
      ['salud', 'pension', 'fondo_solidaridad', 'retencion_fuente', 'libranza', 
       'ausencia', 'multa', 'descuento_voluntario'].includes(n.tipo_novedad)
    );

    return { devengados, deducciones };
  }, [novedades]);

  const totals = useMemo(() => {
    const totalDevengados = categorizedNovedades.devengados.reduce((sum, n) => sum + n.valor, 0);
    const totalDeducciones = categorizedNovedades.deducciones.reduce((sum, n) => sum + n.valor, 0);
    return { totalDevengados, totalDeducciones };
  }, [categorizedNovedades]);

  // ✅ CORRECCIÓN: Labels completos para todos los tipos de novedad
  const getNovedadLabel = (tipo: NovedadType): string => {
    const labels: Record<NovedadType, string> = {
      horas_extra: 'Horas Extra',
      recargo_nocturno: 'Recargo Nocturno',
      vacaciones: 'Vacaciones',
      licencia_remunerada: 'Licencia Remunerada',
      licencia_no_remunerada: 'Licencia No Remunerada', // ✅ AGREGADO
      incapacidad: 'Incapacidad',
      bonificacion: 'Bonificación',
      bonificacion_salarial: 'Bonificación Salarial',
      bonificacion_no_salarial: 'Bonificación No Salarial',
      comision: 'Comisión',
      prima: 'Prima',
      otros_ingresos: 'Otros Ingresos',
      auxilio_conectividad: 'Auxilio de Conectividad',
      viaticos: 'Viáticos',
      retroactivos: 'Retroactivos',
      compensacion_ordinaria: 'Compensación Ordinaria',
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
      sena: 'SENA',
      embargo: 'Embargo',
      anticipo: 'Anticipo',
      aporte_voluntario: 'Aporte Voluntario'
    };
    return labels[tipo] || tipo;
  };

  const NovedadCard = ({ novedad }: { novedad: PayrollNovedad }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline">
                {getNovedadLabel(novedad.tipo_novedad)}
              </Badge>
              {novedad.horas && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {novedad.horas}h
                </div>
              )}
              {novedad.dias && (
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  {novedad.dias} días
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(novedad.valor)}
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditNovedad(novedad)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-3 w-3" />
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
            </div>
            
            {novedad.observacion && (
              <div className="flex items-start text-xs text-gray-500 mt-2">
                <FileText className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                <span>{novedad.observacion}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!employee || !period) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl">
                  Novedades - {employee.nombre} {employee.apellido}
                </SheetTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Período: {period.periodo}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {showForm ? (
              <div className="h-full flex flex-col">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-medium">
                    {editingNovedad ? 'Editar Novedad' : 'Nueva Novedad'}
                  </h3>
                </div>
                
                <div className="flex-1 overflow-auto px-6 py-4">
                  <NovedadForm
                    initialData={editingNovedad}
                    employeeSalary={employee.salarioBase}
                    onSubmit={editingNovedad ? handleUpdateNovedad : handleCreateNovedad}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingNovedad(null);
                    }}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Action Bar */}
                <div className="px-6 py-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <span className="font-medium text-green-600">
                          Devengados: {formatCurrency(totals.totalDevengados)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-red-600">
                          Deducciones: {formatCurrency(totals.totalDeducciones)}
                        </span>
                      </div>
                    </div>
                    
                    <Button onClick={() => setShowForm(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Novedad
                    </Button>
                  </div>
                </div>

                {/* Novedades List */}
                <ScrollArea className="flex-1 px-6 py-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Devengados */}
                      {categorizedNovedades.devengados.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-2 mb-4">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <h4 className="font-medium text-green-600">Devengados</h4>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {categorizedNovedades.devengados.length}
                            </Badge>
                          </div>
                          {categorizedNovedades.devengados.map((novedad) => (
                            <NovedadCard key={novedad.id} novedad={novedad} />
                          ))}
                        </div>
                      )}

                      {/* Deducciones */}
                      {categorizedNovedades.deducciones.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-2 mb-4">
                            <DollarSign className="w-4 h-4 text-red-600" />
                            <h4 className="font-medium text-red-600">Deducciones</h4>
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              {categorizedNovedades.deducciones.length}
                            </Badge>
                          </div>
                          {categorizedNovedades.deducciones.map((novedad) => (
                            <NovedadCard key={novedad.id} novedad={novedad} />
                          ))}
                        </div>
                      )}

                      {/* Empty State */}
                      {novedades.length === 0 && (
                        <div className="text-center py-12">
                          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Sin novedades registradas
                          </h3>
                          <p className="text-gray-500 mb-4">
                            No hay novedades de nómina para este empleado en el período actual.
                          </p>
                          <Button onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Primera Novedad
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NovedadDrawer;
