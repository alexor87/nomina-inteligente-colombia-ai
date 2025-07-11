
import { VacationAbsence } from '@/types/vacations';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Clock, FileText, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VacationAbsenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vacation: VacationAbsence | null;
  onEdit?: (vacation: VacationAbsence) => void;
  onDelete?: (id: string) => void;
}

export const VacationAbsenceDetailModal = ({
  isOpen,
  onClose,
  vacation,
  onEdit,
  onDelete
}: VacationAbsenceDetailModalProps) => {
  if (!vacation) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case 'liquidada':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Liquidada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Detalle de Ausencia
        </CustomModalTitle>
      </CustomModalHeader>

      <div className="space-y-6 mt-6">
        {/* Información del empleado */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4" />
            EMPLEADO
          </div>
          <div className="pl-6">
            <div className="text-lg font-semibold">
              {vacation.employee?.nombre} {vacation.employee?.apellido}
            </div>
            <div className="text-sm text-muted-foreground">
              Cédula: {vacation.employee?.cedula}
            </div>
          </div>
        </div>

        <Separator />

        {/* Información de fechas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            PERÍODO DE AUSENCIA
          </div>
          <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Fecha de inicio</div>
              <div className="font-medium">{formatDate(vacation.start_date)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Fecha de fin</div>
              <div className="font-medium">{formatDate(vacation.end_date)}</div>
            </div>
          </div>
          <div className="pl-6">
            <div className="text-sm text-muted-foreground">Total de días</div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {vacation.days_count} días
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Estado y observaciones */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            INFORMACIÓN ADICIONAL
          </div>
          <div className="pl-6 space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Estado</div>
              <div className="mt-1">{getStatusBadge(vacation.status)}</div>
            </div>
            {vacation.observations && (
              <div>
                <div className="text-sm text-muted-foreground">Observaciones</div>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  {vacation.observations}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Información de auditoría */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            HISTORIAL
          </div>
          <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Creado el</div>
              <div>{formatDateTime(vacation.created_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Última actualización</div>
              <div>{formatDateTime(vacation.updated_at)}</div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {vacation.status === 'pendiente' && onEdit && (
            <Button
              variant="outline"
              onClick={() => {
                onEdit(vacation);
                onClose();
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {vacation.status === 'pendiente' && onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('¿Está seguro de que desea eliminar esta ausencia?')) {
                  onDelete(vacation.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </CustomModal>
  );
};
