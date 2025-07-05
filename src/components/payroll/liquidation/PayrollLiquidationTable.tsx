
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { useToast } from '@/components/ui/use-toast';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';

interface PayrollLiquidationTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
}

export const PayrollLiquidationTable: React.FC<PayrollLiquidationTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onRemoveEmployee,
  onEmployeeNovedadesChange
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [novedadModalOpen, setNovedadModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleOpenNovedadModal = useCallback((employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    setNovedadModalOpen(true);
  }, []);

  const handleCloseNovedadModal = useCallback(() => {
    setNovedadModalOpen(false);
    setSelectedEmployee(null);
  }, []);

  const handleOpenConfirmationModal = useCallback((employeeId: string) => {
    setEmployeeToDelete(employeeId);
    setConfirmationModalOpen(true);
  }, []);

  const handleCloseConfirmationModal = useCallback(() => {
    setConfirmationModalOpen(false);
    setEmployeeToDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (employeeToDelete) {
      onRemoveEmployee(employeeToDelete);
      handleCloseConfirmationModal();
      toast({
        title: "Empleado removido",
        description: "El empleado se ha removido de la liquidación actual.",
      });
    }
  }, [employeeToDelete, onRemoveEmployee, handleCloseConfirmationModal, toast]);

  const handleNovedadSubmit = async (data: any) => {
    console.log('Novedad data submitted:', data);
    handleCloseNovedadModal();
    if (selectedEmployee) {
      await onEmployeeNovedadesChange(selectedEmployee.id);
    }
  };

  const handleSalaryChange = async (employeeId: string, newSalary: number) => {
    try {
      toast({
        title: "Salario actualizado",
        description: "El salario del empleado se ha actualizado correctamente.",
      });
      onEmployeeNovedadesChange(employeeId);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el salario del empleado.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Posición</TableHead>
            <TableHead>Salario Base</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.position}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    defaultValue={employee.baseSalary}
                    onBlur={(e) => {
                      const newSalary = parseFloat(e.target.value);
                      if (!isNaN(newSalary) && newSalary !== employee.baseSalary) {
                        handleSalaryChange(employee.id, newSalary);
                      }
                    }}
                    className="w-32"
                  />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleOpenNovedadModal(employee)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Novedades
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleOpenConfirmationModal(employee.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modal de novedades */}
      <NovedadUnifiedModal
        open={novedadModalOpen}
        setOpen={setNovedadModalOpen}
        employeeId={selectedEmployee?.id}
        employeeSalary={selectedEmployee?.baseSalary}
        periodId={currentPeriodId}
        onSubmit={handleNovedadSubmit}
        selectedNovedadType={null}
        onClose={() => {
          setSelectedEmployee(null);
          setNovedadModalOpen(false);
        }}
      />

      {/* Confirmation modal */}
      <CustomModal isOpen={confirmationModalOpen} onClose={handleCloseConfirmationModal}>
        <CustomModalHeader>
          <CustomModalTitle>Confirmar Remoción</CustomModalTitle>
        </CustomModalHeader>
        <p className="text-sm text-gray-500">
          ¿Estás seguro de que deseas remover a este empleado de la liquidación actual?
        </p>
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="secondary" onClick={handleCloseConfirmationModal}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete}>
            Confirmar
          </Button>
        </div>
      </CustomModal>
    </>
  );
};
