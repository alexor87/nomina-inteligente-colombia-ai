
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NovedadForm } from './NovedadForm';
import { PayrollNovedad, NovedadFormData, NOVEDAD_CATEGORIES } from '@/types/novedades';
import { Trash2, Edit2, Calendar, DollarSign, Plus, FileText, User, Clock, Calculator, TrendingUp, TrendingDown } from 'lucide-react';

interface NovedadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
  employeeSalary?: number;
  novedades: PayrollNovedad[];
  onCreateNovedad: (data: NovedadFormData) => Promise<void>;
  onUpdateNovedad: (id: string, data: NovedadFormData) => Promise<void>;
  onDeleteNovedad: (id: string) => Promise<void>;
  isLoading?: boolean;
  canEdit?: boolean;
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
  canEdit = true
}: NovedadDrawerProps) => {
  const [showForm, setShowForm] = React.useState(false);
  const [editingNovedad, setEditingNovedad] = React.useState<PayrollNovedad | null>(null);

  const handleCreateNovedad = async (data: NovedadFormData) => {
    await onCreateNovedad(data);
    setShowForm(false);
  };

  const handleUpdateNovedad = async (data: NovedadFormData) => {
    if (editingNovedad) {
      await onUpdateNovedad(editingNovedad.id, data);
      setEditingNovedad(null);
    }
  };

  const handleEditNovedad = (novedad: PayrollNovedad) => {
    setEditingNovedad(novedad);
    setShowForm(false);
  };

  const handleDeleteNovedad = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta novedad?')) {
      await onDeleteNovedad(id);
    }
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
    return Object.keys(NOVEDAD_CATEGORIES.devengados.types).includes(n.tipo_novedad);
  });

  const deducciones = novedades.filter(n => {
    return Object.keys(NOVEDAD_CATEGORIES.deducciones.types).includes(n.tipo_novedad);
  });

  const totalDevengados = devengados.reduce((sum, n) => sum + n.valor, 0);
  const totalDeducciones = deducciones.reduce((sum, n) => sum + n.valor, 0);
  const impactoNeto = totalDevengados - totalDeducciones;

  const getCategoryInfo = (tipoNovedad: string) => {
    for (const [categoryKey, category] of Object.entries(NOVEDAD_CATEGORIES)) {
      const typeKey = tipoNovedad as keyof typeof category.types;
      if (category.types[typeKey]) {
        return {
          category: categoryKey as 'devengados' | 'deducciones',
          config: category,
          type: category.types[typeKey]
        };
      }
    }
    return null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[98vw] max-w-[1600px] min-w-[1200px] h-full p-0 flex flex-col bg-white">
        {/* Header mejorado */}
        <SheetHeader className="px-8 py-6 border-b border-gray-100 shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <SheetTitle className="text-2xl font-semibold text-gray-900">
                  {employeeName}
                </SheetTitle>
                <SheetDescription className="text-base text-gray-600 mt-1">
                  Gestión de novedades - Salario base: {formatCurrency(employeeSalary)}
                </SheetDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-8">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Devengados</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalDevengados)}</p>
                  <p className="text-xs text-gray-500">{devengados.length} conceptos</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-red-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Deducciones</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalDeducciones)}</p>
                  <p className="text-xs text-gray-500">{deducciones.length} conceptos</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Calculator className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Impacto</span>
                  </div>
                  <p className={`text-lg font-bold ${impactoNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {impactoNeto >= 0 ? '+' : ''}{formatCurrency(impactoNeto)}
                  </p>
                  <p className="text-xs text-gray-500">Neto adicional</p>
                </div>
              </div>

              {canEdit && (
                <Button
                  onClick={() => {setShowForm(true); setEditingNovedad(null);}}
                  disabled={isLoading || showForm || Boolean(editingNovedad)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 h-12 text-base font-medium shadow-sm"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nueva novedad
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Form */}
          <div className="w-1/2 border-r border-gray-100 flex flex-col bg-gray-50">
            {showForm && (
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <h3 className="text-lg font-semibold text-gray-900">Nueva novedad</h3>
                  <p className="text-sm text-gray-600 mt-1">Selecciona el tipo y completa la información</p>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  <NovedadForm
                    onSubmit={handleCreateNovedad}
                    onCancel={() => setShowForm(false)}
                    isLoading={isLoading}
                    employeeSalary={employeeSalary}
                  />
                </div>
              </div>
            )}

            {editingNovedad && (
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <h3 className="text-lg font-semibold text-gray-900">Editar novedad</h3>
                  <p className="text-sm text-gray-600 mt-1">Modifica la información de la novedad</p>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  <NovedadForm
                    initialData={{
                      tipo_novedad: editingNovedad.tipo_novedad,
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
            )}

            {!showForm && !editingNovedad && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-8">
                  <div className="p-6 bg-white rounded-xl mb-6 inline-block shadow-sm">
                    <FileText className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Administrar novedades
                  </h3>
                  <p className="text-gray-500 mb-8 text-base leading-relaxed">
                    Crea una nueva novedad o selecciona una existente para editarla.
                    Las novedades afectarán automáticamente el cálculo de nómina.
                  </p>
                  {canEdit && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Crear novedad
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Novedades List */}
          <div className="w-1/2 flex flex-col bg-white">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Novedades registradas</h3>
              <p className="text-sm text-gray-600 mt-1">
                {novedades.length > 0 ? `${novedades.length} novedades activas` : 'No hay novedades registradas'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {novedades.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center px-8">
                    <div className="p-6 bg-gray-50 rounded-xl mb-6 inline-block">
                      <Calendar className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Sin novedades
                    </h3>
                    <p className="text-gray-500 text-base">
                      Este empleado no tiene novedades registradas para este período
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {/* Devengados */}
                  {devengados.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold text-green-800">Devengados</h4>
                        <Badge className="bg-green-100 text-green-800 border-0">
                          {formatCurrency(totalDevengados)}
                        </Badge>
                      </div>
                      
                      {devengados.map((novedad) => {
                        const categoryInfo = getCategoryInfo(novedad.tipo_novedad);
                        return (
                          <div key={novedad.id} className="bg-green-50 border border-green-100 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-green-200 text-green-800 border-0 px-3 py-1 text-sm font-medium">
                                    {categoryInfo?.type?.label || novedad.tipo_novedad}
                                    {novedad.subtipo && ` - ${novedad.subtipo}`}
                                  </Badge>
                                  <div className="flex items-center text-green-700 text-base font-semibold">
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    {formatCurrency(novedad.valor)}
                                  </div>
                                </div>
                                
                                {(novedad.fecha_inicio || novedad.fecha_fin || novedad.dias || novedad.horas) && (
                                  <div className="flex items-center text-sm text-green-700 space-x-4">
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
                                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                        {novedad.dias} días
                                      </span>
                                    )}
                                    {novedad.horas && (
                                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                        {novedad.horas} horas
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {novedad.observacion && (
                                  <div className="bg-green-100 border border-green-200 p-3 rounded-md">
                                    <p className="text-xs text-green-800 leading-relaxed">{novedad.observacion}</p>
                                  </div>
                                )}
                              </div>

                              {canEdit && (
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditNovedad(novedad)}
                                    className="h-8 w-8 p-0 hover:bg-green-100 text-green-600 hover:text-green-700"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteNovedad(novedad.id)}
                                    className="h-8 w-8 p-0 hover:bg-red-50 text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Separador */}
                  {devengados.length > 0 && deducciones.length > 0 && (
                    <Separator className="my-6" />
                  )}

                  {/* Deducciones */}
                  {deducciones.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <h4 className="font-semibold text-red-800">Deducciones</h4>
                        <Badge className="bg-red-100 text-red-800 border-0">
                          {formatCurrency(totalDeducciones)}
                        </Badge>
                      </div>
                      
                      {deducciones.map((novedad) => {
                        const categoryInfo = getCategoryInfo(novedad.tipo_novedad);
                        return (
                          <div key={novedad.id} className="bg-red-50 border border-red-100 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-red-200 text-red-800 border-0 px-3 py-1 text-sm font-medium">
                                    {categoryInfo?.type?.label || novedad.tipo_novedad}
                                    {novedad.subtipo && ` - ${novedad.subtipo}`}
                                  </Badge>
                                  <div className="flex items-center text-red-700 text-base font-semibold">
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    {formatCurrency(novedad.valor)}
                                  </div>
                                </div>
                                
                                {(novedad.fecha_inicio || novedad.fecha_fin || novedad.dias || novedad.horas) && (
                                  <div className="flex items-center text-sm text-red-700 space-x-4">
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
                                      <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                                        {novedad.dias} días
                                      </span>
                                    )}
                                    {novedad.horas && (
                                      <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                                        {novedad.horas} horas
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {novedad.observacion && (
                                  <div className="bg-red-100 border border-red-200 p-3 rounded-md">
                                    <p className="text-xs text-red-800 leading-relaxed">{novedad.observacion}</p>
                                  </div>
                                )}
                              </div>

                              {canEdit && (
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditNovedad(novedad)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 text-red-600 hover:text-red-700"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteNovedad(novedad.id)}
                                    className="h-8 w-8 p-0 hover:bg-red-50 text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
