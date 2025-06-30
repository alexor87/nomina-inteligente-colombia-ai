import React, { useState, useEffect, useCallback } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
import { empleados as empleadosData } from '@/data/empleados';
import { Employee } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ArrowDown, ArrowUp, Copy, UserPlus, FileText, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { calculateValorNovedad } from '@/types/novedades';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { useNovedades } from '@/hooks/useNovedades';
import { Period } from '@/types/periods';
import { usePayrollNovedades } from '@/hooks/usePayrollNovedades';
import { PayrollHistoryModal } from '@/components/payroll/history/PayrollHistoryModal';
import { PayrollPreviewModal } from '@/components/payroll/preview/PayrollPreviewModal';
import { PayrollConfirmationModal } from '@/components/payroll/confirmation/PayrollConfirmationModal';
import { PayrollDownloadModal } from '@/components/payroll/download/PayrollDownloadModal';

interface PayrollTableProps {
  period: Period;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number, dias?: number) => number | null;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({
  period,
  calculateSuggestedValue
}) => {
  const [employees, setEmployees] = useState<Employee[]>(empleadosData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isNovedadModalOpen, setIsNovedadModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const { createNovedad } = useNovedades(period.id);
  const { refreshEmployeeNovedades } = usePayrollNovedades(period.id);

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "nombre",
      header: "Empleado",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={`https://avatar.vercel.sh/${row.original.email}`} />
            <AvatarFallback>{row.original.nombre[0]}{row.original.apellido[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.getValue("nombre")} {row.original.apellido}</p>
            <p className="text-sm text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: "cargo",
      header: "Cargo",
    },
    {
      accessorKey: "salario_base",
      header: "Salario",
      cell: ({ row }) => formatCurrency(Number(row.getValue("salario_base"))),
    },
    {
      id: "novedades",
      header: "Novedades",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedEmployee(row.original);
            setIsNovedadModalOpen(true);
          }}
        >
          <FileText className="h-4 w-4 mr-2" />
          Gestionar
        </Button>
      )
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                setSelectedEmployee(row.original);
                setIsHistoryModalOpen(true);
              }}
            >
              Ver historial <ArrowDown className="ml-auto h-4 w-4" />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedEmployee(row.original);
                setIsPreviewModalOpen(true);
              }}
            >
              Previsualizar <ArrowUp className="ml-auto h-4 w-4" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedEmployee(row.original);
                setIsConfirmationModalOpen(true);
              }}
            >
              Confirmar pago <Copy className="ml-auto h-4 w-4" />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedEmployee(row.original);
                setIsDownloadModalOpen(true);
              }}
            >
              Descargar recibo <UserPlus className="ml-auto h-4 w-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  ];

  const table = useReactTable({
    data: employees.filter(e =>
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      e.apellido.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    ),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <TableCaption>
            Lista de empleados para el período actual.
          </TableCaption>
          <Input
            type="search"
            placeholder="Buscar empleado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} onClick={header.column.getToggleSortingHandler()}>
                        {header.isPlaceholder
                          ? null
                          : (
                            <div className='flex items-center gap-1'>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {
                                {
                                  asc: <ArrowUp className='w-4 h-4' />,
                                  desc: <ArrowDown className='w-4 h-4' />,
                                }[header.column.getIsSorted() as string]
                              }
                            </div>
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Sin resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {/* <TableFooter>
              <TableRow>
                <TableHead>Total</TableHead>
                <TableCell colSpan={3}></TableCell>
                <TableCell className="text-right">{formatCurrency(data.reduce((acc, curr) => acc + curr.amount, 0))}</TableCell>
              </TableRow>
            </TableFooter> */}
          </Table>
        </div>
      </div>

      {selectedEmployee && (
        <NovedadUnifiedModal
          isOpen={isNovedadModalOpen}
          onClose={() => {
            setIsNovedadModalOpen(false);
            setSelectedEmployee(null);
          }}
          employeeName={`${selectedEmployee.nombre} ${selectedEmployee.apellido}`}
          employeeId={selectedEmployee.id}
          employeeSalary={Number(selectedEmployee.salario_base)}
          periodId={period.id}
          onCreateNovedad={async (data) => {
            await createNovedad(data);
            // Refresh novedades after creating
            if (refreshEmployeeNovedades) {
              await refreshEmployeeNovedades(selectedEmployee.id);
            }
          }}
          calculateSuggestedValue={calculateSuggestedValue}
        />
      )}

      {selectedEmployee && (
        <PayrollHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          period={period}
        />
      )}

      {selectedEmployee && (
        <PayrollPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          period={period}
        />
      )}

      {selectedEmployee && (
        <PayrollConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => {
            setIsConfirmationModalOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          period={period}
        />
      )}

      {selectedEmployee && (
        <PayrollDownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => {
            setIsDownloadModalOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          period={period}
        />
      )}
    </>
  );
};
