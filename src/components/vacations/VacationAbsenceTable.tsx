
import { VacationAbsence } from '@/types/vacations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VacationAbsenceTableProps {
  vacationsAbsences: VacationAbsence[];
  onView: (vacation: VacationAbsence) => void;
  onEdit: (vacation: VacationAbsence) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const VacationAbsenceTable = ({
  vacationsAbsences,
  onView,
  onEdit,
  onDelete,
  isLoading
}: VacationAbsenceTableProps) => {
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Fecha Fin</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (vacationsAbsences.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Fecha Fin</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No se encontraron registros de vacaciones o ausencias
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Fecha Inicio</TableHead>
            <TableHead>Fecha Fin</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Observaciones</TableHead>
            <TableHead className="w-[70px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vacationsAbsences.map((vacation) => (
            <TableRow key={vacation.id}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {vacation.employee?.nombre} {vacation.employee?.apellido}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vacation.employee?.cedula}
                  </div>
                </div>
              </TableCell>
              <TableCell>{formatDate(vacation.start_date)}</TableCell>
              <TableCell>{formatDate(vacation.end_date)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{vacation.days_count}</Badge>
              </TableCell>
              <TableCell>{getStatusBadge(vacation.status)}</TableCell>
              <TableCell className="max-w-[200px]">
                <div className="truncate" title={vacation.observations}>
                  {vacation.observations || '-'}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(vacation)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    {vacation.status === 'pendiente' && (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(vacation)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(vacation.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
