
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VacationAbsence } from '@/types/vacations';
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from '@/types/vacations';
import { Eye, Edit, Trash2, Calendar, User, Clock, FileText } from 'lucide-react';
import { formatDateForDisplay } from '@/utils/dateUtils';

interface VacationAbsenceTableProps {
  vacationsAbsences: VacationAbsence[];
  onView: (vacation: VacationAbsence) => void;
  onEdit: (vacation: VacationAbsence) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  getRecordOrigin?: (record: any) => { source: string; icon: string; color: string };
}

export const VacationAbsenceTable = ({
  vacationsAbsences,
  onView,
  onEdit,
  onDelete,
  isLoading,
  getRecordOrigin
}: VacationAbsenceTableProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando ausencias...</p>
        </div>
      </div>
    );
  }

  if (vacationsAbsences.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay ausencias registradas</h3>
          <p className="text-muted-foreground">
            Comienza agregando la primera ausencia o vacación
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendiente: { variant: 'secondary' as const, label: 'Pendiente' },
      liquidada: { variant: 'default' as const, label: 'Liquidada' },
      cancelada: { variant: 'destructive' as const, label: 'Cancelada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendiente;
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Empleado
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Tipo
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Días
              </div>
            </TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Observaciones</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vacationsAbsences.map((vacation) => (
            <TableRow key={vacation.id}>
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold">
                    {vacation.employee?.nombre} {vacation.employee?.apellido}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    CC: {vacation.employee?.cedula}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={ABSENCE_TYPE_COLORS[vacation.type]}
                >
                  {ABSENCE_TYPE_LABELS[vacation.type]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>
                    <strong>Desde:</strong> {formatDateForDisplay(vacation.start_date)}
                  </div>
                  <div>
                    <strong>Hasta:</strong> {formatDateForDisplay(vacation.end_date)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{vacation.days_count}</span>
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(vacation.status)}
              </TableCell>
              <TableCell>
                <div className="max-w-xs truncate text-sm text-muted-foreground">
                  {vacation.observations || 'Sin observaciones'}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(vacation)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(vacation)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(vacation.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
