import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { NovedadUnifiedModal } from '@/components/payroll/modals/NovedadUnifiedModal';
import { EmployeeUnified } from '@/types/employee-unified';

interface PayrollLiquidationSimpleTableProps {
  employees: EmployeeUnified[];
  startDate: string;
  endDate: string;
  currentPeriodId: string;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
  year: string;
}

export const PayrollLiquidationSimpleTable = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onRemoveEmployee,
  onEmployeeNovedadesChange,
  year
}: PayrollLiquidationSimpleTableProps) => {
  const [isNovedadModalOpen, setIsNovedadModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const handleOpenNovedadModal = useCallback((employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsNovedadModalOpen(true);
  }, []);

  const handleCloseNovedadModal = useCallback(() => {
    setSelectedEmployeeId(null);
    setIsNovedadModalOpen(false);
  }, []);

  const handleNovedadChange = useCallback(async () => {
    if (selectedEmployeeId) {
      await onEmployeeNovedadesChange(selectedEmployeeId);
    }
    handleCloseNovedadModal();
  }, [selectedEmployeeId, onEmployeeNovedadesChange, handleCloseNovedadModal]);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Cédula</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Salario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>{employee.nombre} {employee.apellido}</TableCell>
              <TableCell>{employee.numero_documento}</TableCell>
              <TableCell>{employee.cargo}</TableCell>
              <TableCell>${employee.salarioBase.toLocaleString()}</TableCell>
              <TableCell>
                {employee.status === 'activo' ? (
                  <Badge variant="outline">Activo</Badge>
                ) : (
                  <Badge>Inactivo</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleOpenNovedadModal(employee.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Novedades
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onRemoveEmployee(employee.id)} className="text-red-500 focus:text-red-500">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <NovedadUnifiedModal
        open={isNovedadModalOpen}
        onClose={handleCloseNovedadModal}
        employeeId={selectedEmployeeId}
        periodId={currentPeriodId}
        startDate={startDate}
        endDate={endDate}
        onNovedadChange={handleNovedadChange}
        year={year}
      />
    </div>
  );
};
