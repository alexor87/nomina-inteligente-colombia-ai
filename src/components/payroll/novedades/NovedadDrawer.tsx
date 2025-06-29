import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NovedadForm } from './NovedadForm';
import { CreateNovedadData, NovedadType } from '@/types/novedades-enhanced';
import { PayrollNovedad } from '@/types/novedades';
import { Trash2, Edit2, Calendar, DollarSign, Plus, FileText, User, Clock, Calculator, TrendingUp, TrendingDown } from 'lucide-react';

// Legacy novedad categories for compatibility
const NOVEDAD_CATEGORIES = {
  devengados: {
    types: {
      horas_extra: { label: 'Horas Extra' },
      recargo_nocturno: { label: 'Recargo Nocturno' },
      bonificacion: { label: 'Bonificación' },
      comision: { label: 'Comisión' },
      prima: { label: 'Prima Extralegal' },
      vacaciones: { label: 'Vacaciones' },
      incapacidad: { label: 'Incapacidad' },
      licencia_remunerada: { label: 'Licencia Remunerada' },
      otros_ingresos: { label: 'Otros Ingresos' }
    }
  },
  deducciones: {
    types: {
      libranza: { label: 'Libranza' },
      multa: { label: 'Multa' },
      ausencia: { label: 'Ausencia' },
      descuento_voluntario: { label: 'Descuento Voluntario' },
      retencion_fuente: { label: 'Retención en la Fuente' },
      fondo_solidaridad: { label: 'Fondo de Solidaridad' },
      salud: { label: 'Salud' },
      pension: { label: 'Pensión' },
      arl: { label: 'ARL' },
      caja_compensacion: { label: 'Caja de Compensación' },
      icbf: { label: 'ICBF' },
      sena: { label: 'SENA' }
    }
  }
} as const;

interface NovedadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
  employeeSalary?: number;
  novedades: PayrollNovedad[];
  onCreateNovedad: (data: CreateNovedadData) => Promise<void>;
  onUpdateNovedad: (id: string, data: CreateNovedadData) => Promise<void>;
  onDeleteNovedad: (id: string) => Promise<void>;
  isLoading?: boolean;
  canEdit?: boolean;
  onRecalculatePayroll?: () => void;
}

export const NovedadDrawer = ({
  isOpen,
  onClose,
  employeeName,
  employeeId,
  employeeSalary = 1300000,
  novedades,
  onCreateNovedad,
  onUpdateNovedad,
  onDeleteNovedad,
  isLoading = false,
  canEdit = true,
  onRecalculatePayroll
}: NovedadDrawerProps) => {
  const [showForm, setShowForm] = React.useState(false);
  const [editingNovedad, setEditingNovedad] = React.useState<PayrollNovedad | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    try {
      console.log('🎯 Creando novedad para empleado:', employeeId);
      console.log('📋 Datos del formulario:', data);
      
      // Ensure empleado_id is set
      const completeData: CreateNovedadData = {
        ...data,
        empleado_id: employeeId
      };
      
      console.log('📤 Datos completos para crear novedad:', completeData);
      await onCreateNovedad(completeData);
      setShowForm(false);
      setHasChanges(true);
    } catch (error) {
      console.error('❌ Error en handleCreateNovedad:', error);
    }
  };

  const handleUpdateNovedad = async (data: CreateNovedadData) => {
    if (editingNovedad) {
      await onUpdateNovedad(editingNovedad.id, data);
      setEditingNovedad(null);
      setHasChanges(true);
    }
  };

  const handleEditNovedad = (novedad: PayrollNovedad) => {
    setEditingNovedad(novedad);
    setShowForm(false);
  };

  const handleDeleteNovedad = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta novedad?')) {
      await onDeleteNovedad(id);
      setHasChanges(true);
    }
  };

  const handleClose = () => {
    if (hasChanges && onRecalculatePayroll) {
      console.log('🔄 Recalculando nómina al cerrar drawer con cambios');
      onRecalculatePayroll();
    }
    
    setHasChanges(false);
    setShowForm(false);
    setEditingNovedad(null);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO');
  };

  // Separar novedades por categoría
  const devengados = novedades.filter(n => {
    return Object.keys(NOVEDAD_CATEGORIES.devengados.types).includes(n.tipo_novedad as string);
  });

  const deducciones = novedades.filter(n => {
    return Object.keys(NOVEDAD_CATEGORIES.deducciones.types).includes(n.tipo_novedad as string);
  });

  const totalDevengados = devengados.reduce((sum, n) => sum + n.valor, 0);
  const totalDeducciones = deducciones.reduce((sum, n) => sum + n.valor, 0);
  const impactoNeto = totalDevengados - totalDeducciones;

  const getNovedadTypeLabel = (tipoNovedad: NovedadType) => {
    // Check in devengados first
    if (tipoNovedad in NOVEDAD_CATEGORIES.devengados.types) {
      const typeKey = tipoNovedad as keyof typeof NOVEDAD_CATEGORIES.devengados.types;
      return NOVEDAD_CATEGORIES.devengados.types[typeKey].label;
    }
    
    // Check in deducciones
    if (tipoNovedad in NOVEDAD_CATEGORIES.deducciones.types) {
      const typeKey = tipoNovedad as keyof typeof NOVEDAD_CATEGORIES.deducciones.types;
      return NOVEDAD_CATEGORIES.deducciones.types[typeKey].label;
    }
    
    return tipoNovedad;
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-[98vw] max-w-[1400px] min-w-[1000px] h-full p-0 flex flex-col bg-white">
        {/* Header fijo - más compacto */}
        <SheetHeader className="px-6 py-3 border-b border-gray-100 shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold text-gray-900">
                  {employeeName}
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-600">
                  Salario base: {formatCurrency(employeeSalary)}
                </SheetDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-medium">Devengados</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(totalDevengados)}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-red-600">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-xs font-medium">Deducciones</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(totalDeducciones)}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Calculator className="h-3 w-3" />
                    <span className="text-xs font-medium">Impacto</span>
                  </div>
                  <p className={`text-sm font-bold ${impactoNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {impactoNeto >= 0 ? '+' : ''}{formatCurrency(impactoNeto)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {hasChanges && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                    Cambios pendientes
                  </Badge>
                )}
                {canEdit && (
                  <Button
                    onClick={() => {setShowForm(true); setEditingNovedad(null);}}
                    disabled={isLoading || showForm || Boolean(editingNovedad)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva novedad
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Main Content - Diseño horizontal mejorado */}
        <div className="flex-1 flex min-h-0 bg-gray-50">
          {/* Panel izquierdo - Formulario - Fixed width */}
          <div className="w-[500px] border-r border-gray-200 flex flex-col bg-white shrink-0">
            {showForm && (
              <div className="flex-1 flex flex-col h-full">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                  <h3 className="text-base font-semibold text-gray-900">Nueva novedad</h3>
                  <p className="text-xs text-gray-600 mt-1">Completa la información para {employeeName}</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    <NovedadForm
                      onSubmit={handleCreateNovedad}
                      onCancel={() => setShowForm(false)}
                      isLoading={isLoading}
                      employeeSalary={employeeSalary}
                      initialData={{ empleado_id: employeeId, periodo_id: '' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {editingNovedad && (
              <div className="flex-1 flex flex-col h-full">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                  <h3 className="text-base font-semibold text-gray-900">Editar novedad</h3>
                  <p className="text-xs text-gray-600 mt-1">Modifica la información</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    <NovedadForm
                      initialData={{
                        empleado_id: editingNovedad.empleado_id,
                        periodo_id: editingNovedad.periodo_id,
                        tipo_novedad: editingNovedad.tipo_novedad as NovedadType,
                        subtipo: editingNovedad.subtipo,
                        fecha_inicio: editingNovedad.fecha_inicio,
                        fecha_fin: editingNovedad.fecha_fin,
                        dias: editingNovedad.dias,
                        horas: editingNovedad.horas,
                        valor: editingNovedad.valor,
                        observacion: editingNovedad.observacion
                      }}
                      onSubmit={handleUpdateNovedad}
                      onCancel={() => setEditingNovedad(null)}
                      isLoading={isLoading}
                      employeeSalary={employeeSalary}
                    />
                  </div>
                </div>
              </div>
            )}

            {!showForm && !editingNovedad && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="p-4 bg-gray-50 rounded-lg mb-4 inline-block">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    Administrar novedades
                  </h3>
                  <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                    Crea una nueva novedad o selecciona una existente para editarla.
                  </p>
                  {canEdit && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear novedad
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Panel derecho - Lista de novedades - Flexible width */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Novedades registradas</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {novedades.length > 0 ? `${novedades.length} novedades activas` : 'No hay novedades'}
                  </p>
                </div>
                {hasChanges && (
                  <Button
                    onClick={() => {
                      if (onRecalculatePayroll) {
                        console.log('🔄 Recalculando nómina manualmente');
                        onRecalculatePayroll();
                        setHasChanges(false);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Recalcular ahora
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {novedades.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[300px]">
                  <div className="text-center px-6">
                    <div className="p-4 bg-gray-50 rounded-lg mb-4 inline-block">
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">
                      Sin novedades
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Este empleado no tiene novedades registradas
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Devengados */}
                  {devengados.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold text-green-800">Devengados</h4>
                        <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                          {formatCurrency(totalDevengados)}
                        </Badge>
                      </div>
                      
                      {devengados.map((novedad) => (
                        <div key={novedad.id} className="bg-green-50 border border-green-100 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge className="bg-green-200 text-green-800 border-0 px-2 py-0.5 text-xs font-medium">
                                  {getNovedadTypeLabel(novedad.tipo_novedad as NovedadType)}
                                  {novedad.subtipo && ` - ${novedad.subtipo}`}
                                </Badge>
                                <div className="flex items-center text-green-700 text-sm font-semibold">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  {formatCurrency(novedad.valor)}
                                </div>
                              </div>
                              
                              {(novedad.fecha_inicio || novedad.fecha_fin || novedad.dias || novedad.horas) && (
                                <div className="flex items-center text-xs text-green-700 space-x-3">
                                  {(novedad.fecha_inicio || novedad.fecha_fin) && (
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span>
                                        {novedad.fecha_inicio && formatDate(novedad.fecha_inicio)}
                                        {novedad.fecha_inicio && novedad.fecha_fin && ' - '}
                                        {novedad.fecha_fin && formatDate(novedad.fecha_fin)}
                                      </span>
                                    </div>
                                  )}
                                  {novedad.dias && (
                                    <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded text-xs">
                                      {novedad.dias} días
                                    </span>
                                  )}
                                  {novedad.horas && (
                                    <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded text-xs">
                                      {novedad.horas} horas
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {novedad.observacion && (
                                <div className="bg-green-100 border border-green-200 p-2 rounded">
                                  <p className="text-xs text-green-800">{novedad.observacion}</p>
                                </div>
                              )}
                            </div>

                            {canEdit && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditNovedad(novedad)}
                                  className="h-7 w-7 p-0 hover:bg-green-100 text-green-600 hover:text-green-700"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteNovedad(novedad.id)}
                                  className="h-7 w-7 p-0 hover:bg-red-50 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Separador */}
                  {devengados.length > 0 && deducciones.length > 0 && (
                    <Separator className="my-4" />
                  )}

                  {/* Deducciones */}
                  {deducciones.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <h4 className="font-semibold text-red-800">Deducciones</h4>
                        <Badge className="bg-red-100 text-red-800 border-0 text-xs">
                          {formatCurrency(totalDeducciones)}
                        </Badge>
                      </div>
                      
                      {deducciones.map((novedad) => (
                        <div key={novedad.id} className="bg-red-50 border border-red-100 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge className="bg-red-200 text-red-800 border-0 px-2 py-0.5 text-xs font-medium">
                                  {getNovedadTypeLabel(novedad.tipo_novedad as NovedadType)}
                                  {novedad.subtipo && ` - ${novedad.subtipo}`}
                                </Badge>
                                <div className="flex items-center text-red-700 text-sm font-semibold">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  {formatCurrency(novedad.valor)}
                                </div>
                              </div>
                              
                              {(novedad.fecha_inicio || novedad.fecha_fin || novedad.dias || novedad.horas) && (
                                <div className="flex items-center text-xs text-red-700 space-x-3">
                                  {(novedad.fecha_inicio || novedad.fecha_fin) && (
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span>
                                        {novedad.fecha_inicio && formatDate(novedad.fecha_inicio)}
                                        {novedad.fecha_inicio && novedad.fecha_fin && ' - '}
                                        {novedad.fecha_fin && formatDate(novedad.fecha_fin)}
                                      </span>
                                    </div>
                                  )}
                                  {novedad.dias && (
                                    <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded text-xs">
                                      {novedad.dias} días
                                    </span>
                                  )}
                                  {novedad.horas && (
                                    <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded text-xs">
                                      {novedad.horas} horas
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {novedad.observacion && (
                                <div className="bg-red-100 border border-red-200 p-2 rounded">
                                  <p className="text-xs text-red-800">{novedad.observacion}</p>
                                </div>
                              )}
                            </div>

                            {canEdit && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditNovedad(novedad)}
                                  className="h-7 w-7 p-0 hover:bg-red-100 text-red-600 hover:text-red-700"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteNovedad(novedad.id)}
                                  className="h-7 w-7 p-0 hover:bg-red-50 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
