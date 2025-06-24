
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NovedadForm } from './NovedadForm';
import { PayrollNovedad, NovedadFormData, NOVEDAD_TYPES } from '@/types/novedades';
import { Trash2, Edit2, Calendar, DollarSign, Plus } from 'lucide-react';

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
      <SheetContent className="w-[500px] sm:w-[600px] flex flex-col h-full">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-semibold">
            Novedades - {employeeName}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Gestiona las novedades para este empleado en el período actual
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Summary Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 mb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  {novedades.length} novedad{novedades.length !== 1 ? 'es' : ''} registrada{novedades.length !== 1 ? 's' : ''}
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(totalNovedadesValue)}
                </p>
              </div>
              {canEdit && (
                <Button
                  onClick={() => setShowForm(true)}
                  disabled={isLoading || showForm}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar novedad
                </Button>
              )}
            </div>
          </div>

          {/* Form Section */}
          {showForm && (
            <div className="border rounded-lg p-4 mb-6 bg-white">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Nueva novedad</h3>
              <NovedadForm
                onSubmit={handleCreateNovedad}
                onCancel={() => setShowForm(false)}
                isLoading={isLoading}
              />
            </div>
          )}

          {editingNovedad && (
            <div className="border rounded-lg p-4 mb-6 bg-white">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Editar novedad</h3>
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
          )}

          {/* Novedades List */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">Novedades registradas</h3>
              {novedades.length > 0 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  {novedades.length} total
                </Badge>
              )}
            </div>
            
            <ScrollArea className="flex-1 h-full">
              {novedades.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    No hay novedades registradas para este empleado
                  </p>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForm(true)}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar primera novedad
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pb-6">
                  {novedades.map((novedad, index) => (
                    <div key={novedad.id}>
                      <div className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center space-x-3">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {NOVEDAD_TYPES[novedad.tipo_novedad]}
                              </Badge>
                              {novedad.valor > 0 && (
                                <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded">
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  <span className="font-medium text-sm">
                                    {formatCurrency(novedad.valor)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {(novedad.fecha_inicio || novedad.fecha_fin) && (
                              <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span>
                                  {novedad.fecha_inicio && formatDate(novedad.fecha_inicio)}
                                  {novedad.fecha_inicio && novedad.fecha_fin && ' - '}
                                  {novedad.fecha_fin && formatDate(novedad.fecha_fin)}
                                  {novedad.dias && ` (${novedad.dias} días)`}
                                </span>
                              </div>
                            )}
                            
                            {novedad.observacion && (
                              <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                                <p className="font-medium mb-1">Observaciones:</p>
                                <p>{novedad.observacion}</p>
                              </div>
                            )}
                          </div>

                          {canEdit && (
                            <div className="flex flex-col space-y-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditNovedad(novedad)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteNovedad(novedad.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {index < novedades.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
