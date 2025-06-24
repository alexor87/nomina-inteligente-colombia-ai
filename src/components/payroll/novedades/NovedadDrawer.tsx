
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NovedadForm } from './NovedadForm';
import { PayrollNovedad, NovedadFormData, NOVEDAD_TYPES } from '@/types/novedades';
import { Trash2, Edit2, Calendar, DollarSign } from 'lucide-react';

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
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Novedades - {employeeName}</SheetTitle>
          <SheetDescription>
            Gestiona las novedades para este empleado en el período actual
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
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
                >
                  + Agregar novedad
                </Button>
              )}
            </div>
          </div>

          {/* Form for creating/editing */}
          {showForm && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">Nueva novedad</h3>
              <NovedadForm
                onSubmit={handleCreateNovedad}
                onCancel={() => setShowForm(false)}
                isLoading={isLoading}
              />
            </div>
          )}

          {editingNovedad && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">Editar novedad</h3>
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

          {/* List of existing novedades */}
          <div className="space-y-3">
            <h3 className="font-medium">Novedades registradas</h3>
            {novedades.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay novedades registradas para este empleado
              </p>
            ) : (
              <div className="space-y-3">
                {novedades.map((novedad) => (
                  <div key={novedad.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary">
                            {NOVEDAD_TYPES[novedad.tipo_novedad]}
                          </Badge>
                          {novedad.valor > 0 && (
                            <div className="flex items-center text-green-600">
                              <DollarSign className="h-4 w-4 mr-1" />
                              <span className="font-medium">
                                {formatCurrency(novedad.valor)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {(novedad.fecha_inicio || novedad.fecha_fin) && (
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Calendar className="h-4 w-4 mr-1" />
                            {novedad.fecha_inicio && formatDate(novedad.fecha_inicio)}
                            {novedad.fecha_inicio && novedad.fecha_fin && ' - '}
                            {novedad.fecha_fin && formatDate(novedad.fecha_fin)}
                            {novedad.dias && ` (${novedad.dias} días)`}
                          </div>
                        )}
                        
                        {novedad.observacion && (
                          <p className="text-sm text-gray-600">
                            {novedad.observacion}
                          </p>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex space-x-1 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditNovedad(novedad)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNovedad(novedad.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </SheetContent>
    </Sheet>
  );
};
