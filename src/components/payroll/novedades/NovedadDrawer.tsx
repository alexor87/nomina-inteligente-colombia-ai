
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NovedadForm } from './NovedadForm';
import { PayrollNovedad, NovedadFormData, NOVEDAD_TYPES } from '@/types/novedades';
import { Trash2, Edit2, Calendar, DollarSign, Plus, FileText } from 'lucide-react';

interface NovedadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
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

  const totalNovedadesValue = novedades.reduce((sum, novedad) => sum + novedad.valor, 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[98vw] max-w-[1600px] min-w-[1200px] h-full p-0 flex flex-col">
        {/* Fixed Header */}
        <SheetHeader className="px-8 py-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-3xl font-bold text-gray-900">
                Novedades - {employeeName}
              </SheetTitle>
              <SheetDescription className="text-lg text-gray-600 mt-2">
                Gestiona las novedades para este empleado en el período actual
              </SheetDescription>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Total novedades</p>
                <p className="text-2xl font-bold text-blue-700">{novedades.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Valor total</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalNovedadesValue)}</p>
              </div>
              {canEdit && (
                <Button
                  onClick={() => {setShowForm(true); setEditingNovedad(null);}}
                  disabled={isLoading || showForm || Boolean(editingNovedad)}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-base font-medium"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nueva novedad
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Main Content Area - Two Column Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Form */}
          <div className="w-1/2 border-r flex flex-col">
            {showForm && (
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-xl text-gray-900">Nueva novedad</h3>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  <NovedadForm
                    onSubmit={handleCreateNovedad}
                    onCancel={() => setShowForm(false)}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}

            {editingNovedad && (
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-xl text-gray-900">Editar novedad</h3>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  <NovedadForm
                    initialData={{
                      tipo_novedad: editingNovedad.tipo_novedad,
                      fecha_inicio: editingNovedad.fecha_inicio,
                      fecha_fin: editingNovedad.fecha_fin,
                      dias: editingNovedad.dias,
                      valor: editingNovedad.valor,
                      observacion: editingNovedad.observacion
                    }}
                    onSubmit={handleUpdateNovedad}
                    onCancel={() => setEditingNovedad(null)}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}

            {!showForm && !editingNovedad && (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center px-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-600 mb-2">
                    Selecciona una acción
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Crea una nueva novedad o edita una existente
                  </p>
                  {canEdit && (
                    <Button
                      onClick={() => setShowForm(true)}
                      variant="outline"
                      size="lg"
                      className="px-8"
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
          <div className="w-1/2 flex flex-col">
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xl text-gray-900">Novedades registradas</h3>
                {novedades.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1 text-sm">
                    {novedades.length} registrada{novedades.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {novedades.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center px-8">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-600 mb-2">
                      Sin novedades registradas
                    </h3>
                    <p className="text-gray-500">
                      Este empleado no tiene novedades en el período actual
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {novedades.map((novedad, index) => (
                    <div 
                      key={novedad.id}
                      className="bg-white border rounded-xl p-6 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center space-x-4">
                            <Badge 
                              variant="secondary" 
                              className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 px-4 py-2 text-sm font-medium"
                            >
                              {NOVEDAD_TYPES[novedad.tipo_novedad]}
                            </Badge>
                            {novedad.valor > 0 && (
                              <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                                <DollarSign className="h-4 w-4 mr-2" />
                                <span className="font-semibold">
                                  {formatCurrency(novedad.valor)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {(novedad.fecha_inicio || novedad.fecha_fin) && (
                            <div className="flex items-center bg-gray-50 px-4 py-3 rounded-lg border">
                              <Calendar className="h-4 w-4 mr-3 text-gray-600" />
                              <span className="text-gray-700">
                                {novedad.fecha_inicio && formatDate(novedad.fecha_inicio)}
                                {novedad.fecha_inicio && novedad.fecha_fin && ' - '}
                                {novedad.fecha_fin && formatDate(novedad.fecha_fin)}
                                {novedad.dias && ` (${novedad.dias} días)`}
                              </span>
                            </div>
                          )}
                          
                          {novedad.observacion && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                              <p className="font-medium text-amber-900 mb-1">Observaciones:</p>
                              <p className="text-amber-800 text-sm leading-relaxed">{novedad.observacion}</p>
                            </div>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditNovedad(novedad)}
                              className="h-9 w-9 p-0 hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteNovedad(novedad.id)}
                              className="h-9 w-9 p-0 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {index < novedades.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
