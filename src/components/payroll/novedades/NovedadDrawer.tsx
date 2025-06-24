
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NovedadForm } from './NovedadForm';
import { PayrollNovedad, NovedadFormData, NOVEDAD_TYPES } from '@/types/novedades';
import { Trash2, Edit2, Calendar, DollarSign, Plus, FileText, User, Clock } from 'lucide-react';

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
      <SheetContent className="w-[98vw] max-w-[1400px] min-w-[1000px] h-full p-0 flex flex-col bg-white">
        {/* Clean Header */}
        <SheetHeader className="px-8 py-6 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <SheetTitle className="text-xl font-medium text-gray-900">
                  {employeeName}
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-500 mt-1">
                  Gestión de novedades
                </SheetDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-lg font-medium text-gray-900">{novedades.length} novedades</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Valor</p>
                <p className="text-lg font-medium text-gray-900">{formatCurrency(totalNovedadesValue)}</p>
              </div>
              {canEdit && (
                <Button
                  onClick={() => {setShowForm(true); setEditingNovedad(null);}}
                  disabled={isLoading || showForm || Boolean(editingNovedad)}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 h-9 text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
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
                  <h3 className="font-medium text-gray-900">Nueva novedad</h3>
                  <p className="text-sm text-gray-500 mt-1">Completa la información de la novedad</p>
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
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <h3 className="font-medium text-gray-900">Editar novedad</h3>
                  <p className="text-sm text-gray-500 mt-1">Modifica la información de la novedad</p>
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
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-8">
                  <div className="p-4 bg-white rounded-lg mb-4 inline-block">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Selecciona una acción
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Crea una nueva novedad o edita una existente
                  </p>
                  {canEdit && (
                    <Button
                      onClick={() => setShowForm(true)}
                      variant="outline"
                      className="border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Novedades registradas</h3>
                  <p className="text-sm text-gray-500 mt-1">Lista de novedades activas</p>
                </div>
                {novedades.length > 0 && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-0 px-2 py-1 text-xs">
                    {novedades.length}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {novedades.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center px-8">
                    <div className="p-4 bg-gray-50 rounded-lg mb-4 inline-block">
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Sin novedades
                    </h3>
                    <p className="text-sm text-gray-500">
                      Este empleado no tiene novedades registradas
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-3">
                  {novedades.map((novedad) => (
                    <div 
                      key={novedad.id}
                      className="bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="secondary" 
                              className="bg-blue-50 text-blue-700 border-0 px-3 py-1 text-xs font-medium"
                            >
                              {NOVEDAD_TYPES[novedad.tipo_novedad]}
                            </Badge>
                            {novedad.valor > 0 && (
                              <div className="flex items-center text-green-700 text-sm font-medium">
                                <DollarSign className="h-3 w-3 mr-1" />
                                {formatCurrency(novedad.valor)}
                              </div>
                            )}
                          </div>
                          
                          {/* Dates */}
                          {(novedad.fecha_inicio || novedad.fecha_fin) && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-3 w-3 mr-2 text-gray-400" />
                              <span>
                                {novedad.fecha_inicio && formatDate(novedad.fecha_inicio)}
                                {novedad.fecha_inicio && novedad.fecha_fin && ' - '}
                                {novedad.fecha_fin && formatDate(novedad.fecha_fin)}
                                {novedad.dias && ` (${novedad.dias} días)`}
                              </span>
                            </div>
                          )}
                          
                          {/* Observations */}
                          {novedad.observacion && (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-md">
                              <p className="text-xs text-amber-700 font-medium mb-1">Observaciones:</p>
                              <p className="text-xs text-amber-800 leading-relaxed">{novedad.observacion}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {canEdit && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditNovedad(novedad)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 text-gray-400 hover:text-blue-600"
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
