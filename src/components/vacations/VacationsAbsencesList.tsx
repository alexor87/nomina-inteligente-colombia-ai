
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, Calendar } from 'lucide-react';
import { useVacationsAbsences } from '@/hooks/useVacationsAbsences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CSVLink } from 'react-csv';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ReloadData } from '@/components/shared/ReloadData';
import { UnifiedVacationData } from '@/types/unifiedVacations';
import { VacationAbsenceType, VacationAbsenceStatus } from '@/types/vacations';

interface VacationsAbsencesListProps {
  onEdit?: (id: string) => void;
  refreshTrigger?: number;
  showEmployeeColumn?: boolean;
  compactMode?: boolean;
}

export const VacationsAbsencesList: React.FC<VacationsAbsencesListProps> = ({ 
  onEdit, 
  refreshTrigger,
  showEmployeeColumn = true,
  compactMode = false 
}) => {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL_TYPES');
  const [statusFilter, setStatusFilter] = useState<string>('ALL_STATUSES');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isDateRangeOpen, setDateRangeOpen] = useState(false);

  const {
    vacationsAbsences: data,
    isLoading,
    refetch,
    deleteVacationAbsence,
  } = useVacationsAbsences({
    employee_search: search,
    type: typeFilter as VacationAbsenceType,
    status: statusFilter as VacationAbsenceStatus,
    date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
  });

  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  const filteredData = data;

  const pageCount = Math.ceil(filteredData.length / perPage);
  const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVacationAbsence(id);
    } catch (error) {
      console.error('Error deleting vacation/absence:', error);
    }
  };

  const getStatusBadge = (status: string, item: any) => {
    // 🎯 INDICADORES MEJORADOS: Mostrar validación de estado
    const baseProps = {
      className: "text-xs font-medium"
    };

    switch (status) {
      case 'liquidada':
        // Mostrar advertencia si puede ser falso positivo
        const hasPayrollRecord = item.source_type === 'vacation' && item.processed_in_period_id;
        return (
          <div className="flex items-center gap-1">
            <Badge {...baseProps} className="bg-green-100 text-green-800">
              Liquidada
            </Badge>
            {!hasPayrollRecord && (
              <Badge {...baseProps} className="bg-orange-100 text-orange-800">
                ⚠️ Verificar
              </Badge>
            )}
          </div>
        );
      case 'pendiente':
        return (
          <Badge {...baseProps} className="bg-yellow-100 text-yellow-800">
            Pendiente
          </Badge>
        );
      case 'cancelada':
        return (
          <Badge {...baseProps} className="bg-gray-100 text-gray-800">
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge {...baseProps} variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const csvHeaders = [
    { label: 'ID', key: 'id' },
    { label: 'Empleado ID', key: 'employee_id' },
    { label: 'Tipo', key: 'type' },
    { label: 'Subtipo', key: 'subtipo' },
    { label: 'Fecha Inicio', key: 'start_date' },
    { label: 'Fecha Fin', key: 'end_date' },
    { label: 'Días', key: 'days_count' },
    { label: 'Observaciones', key: 'observations' },
    { label: 'Estado', key: 'status' },
    { label: 'Creado Por', key: 'created_by' },
    { label: 'Periodo ID', key: 'processed_in_period_id' },
    { label: 'Creado En', key: 'created_at' },
    { label: 'Actualizado En', key: 'updated_at' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar empleado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex items-center space-x-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_TYPES">Todos los tipos</SelectItem>
              <SelectItem value="vacaciones">Vacaciones</SelectItem>
              <SelectItem value="licencia_remunerada">Licencia Remunerada</SelectItem>
              <SelectItem value="licencia_no_remunerada">Licencia No Remunerada</SelectItem>
              <SelectItem value="incapacidad">Incapacidad</SelectItem>
              <SelectItem value="ausencia">Ausencia</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_STATUSES">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="liquidada">Liquidada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={isDateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {dateFrom && dateTo ? (
                  `${format(dateFrom, "PPP", { locale: es })} - ${format(dateTo, "PPP", { locale: es })}`
                ) : (
                  <span>Filtrar por fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <DatePicker
                mode="range"
                defaultMonth={dateFrom}
                selected={dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined}
                onSelect={(range: any) => {
                  if (range?.from) {
                    setDateFrom(range.from);
                  }
                  if (range?.to) {
                    setDateTo(range.to);
                  }
                }}
                onClose={() => setDateRangeOpen(false)}
              />
            </PopoverContent>
          </Popover>

          <CSVLink
            data={filteredData}
            headers={csvHeaders}
            filename={"vacaciones_ausencias.csv"}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
          >
            Exportar CSV
          </CSVLink>
          <ReloadData refetch={refetch} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showEmployeeColumn && (
                <TableHead>Empleado</TableHead>
              )}
              <TableHead>Tipo</TableHead>
              <TableHead>Subtipo</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Fecha Fin</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={showEmployeeColumn ? 9 : 8} className="text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showEmployeeColumn ? 9 : 8} className="text-center">
                  No hay vacaciones/ausencias registradas.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={item.id}>
                  {showEmployeeColumn && (
                    <TableCell>
                      {item.employee?.nombre} {item.employee?.apellido}
                    </TableCell>
                  )}
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.subtipo || '-'}</TableCell>
                  <TableCell>{item.start_date}</TableCell>
                  <TableCell>{item.end_date}</TableCell>
                  <TableCell>{item.days_count}</TableCell>
                  <TableCell>{item.observations || '-'}</TableCell>
                  
                  <TableCell>
                    {getStatusBadge(item.status, item)}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit?.(item.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" className="text-red-500 w-full justify-start">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. ¿Eliminar esta ausencia?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            Anterior
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
              <Button
                key={num}
                variant={page === num ? "default" : "outline"}
                size="sm"
                className="h-9 w-9"
                onClick={() => handlePageChange(num)}
              >
                {num}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === pageCount}
          >
            Siguiente
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Total: {filteredData.length} registros
        </div>
      </div>
    </div>
  );
};
