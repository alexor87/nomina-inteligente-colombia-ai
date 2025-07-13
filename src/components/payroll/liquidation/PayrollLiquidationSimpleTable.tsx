import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { formatCurrency } from '@/lib/utils';
import { ConfigurationService } from '@/services/ConfigurationService';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
  onRemoveEmployee?: (employeeId: string) => void;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onEmployeeNovedadesChange,
  onRemoveEmployee
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [novedadModalOpen, setNovedadModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<PayrollEmployee | null>(null);
  const { toast } = useToast();

  // ✅ NUEVO: Calcular fecha del período para usar en cálculos de jornada legal
  const getPeriodDate = () => {
    if (startDate) {
      return new Date(startDate);
    }
    return new Date();
  };

  const {
    loadNovedadesTotals,
    createNovedad,
    getEmployeeNovedades,
    refreshEmployeeNovedades,
    isCreating,
    lastRefreshTime
  } = usePayrollNovedadesUnified(currentPeriodId || '');

  // Cargar novedades cuando se monten los empleados o cambie el período
  useEffect(() => {
    if (employees.length > 0 && currentPeriodId) {
      console.log('📊 Cargando novedades para empleados, período:', currentPeriodId);
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
    }
  }, [employees, currentPeriodId, loadNovedadesTotals]);

  const calculateWorkedDays = () => {
    if (!startDate || !endDate) return 30;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(1, diffDays);
  };

  const workedDays = calculateWorkedDays();

  // Obtener configuración legal actual
  const getCurrentYearConfig = () => {
    const currentYear = new Date().getFullYear().toString();
    return ConfigurationService.getConfiguration(currentYear);
  };

  const handleOpenNovedadModal = (employee: PayrollEmployee) => {
    console.log('📝 Abriendo modal de novedades para:', employee.name);
    console.log('📅 Fecha del período:', startDate);
    setSelectedEmployee(employee);
    setNovedadModalOpen(true);
  };

  const handleCloseNovedadModal = async () => {
    if (selectedEmployee) {
      // Asegurar sincronización final al cerrar el modal
      console.log('🔄 Sincronización final al cerrar modal para:', selectedEmployee.name);
      await onEmployeeNovedadesChange(selectedEmployee.id);
    }
    setNovedadModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleNovedadSubmit = async (data: CreateNovedadData) => {
    if (!selectedEmployee || !currentPeriodId) {
      console.warn('⚠️ Faltan datos necesarios para crear novedad');
      return;
    }

    console.log('💾 Creando novedad:', data);
    
    try {
      const result = await createNovedad({
        ...data,
        empleado_id: selectedEmployee.id,
        periodo_id: currentPeriodId
      });
      
      if (result) {
        // Cerrar modal
        handleCloseNovedadModal();
        
        console.log('✅ Novedad creada y sincronizada exitosamente');
      }
    } catch (error) {
      console.error('❌ Error en creación de novedad:', error);
    }
  };

  // Callback para manejar cambios desde el modal (eliminaciones, etc.)
  const handleNovedadChange = async (employeeId: string) => {
    console.log('🔄 Novedad modificada para empleado:', employeeId);
    await onEmployeeNovedadesChange(employeeId);
  };

  const handleDeleteEmployee = (employee: PayrollEmployee) => {
    setEmployeeToDelete(employee);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete && onRemoveEmployee) {
      onRemoveEmployee(employeeToDelete.id);
      toast({
        title: "✅ Empleado removido",
        description: `${employeeToDelete.name} ha sido removido de esta liquidación`,
        className: "border-orange-200 bg-orange-50"
      });
      setEmployeeToDelete(null);
    }
  };

  const cancelDeleteEmployee = () => {
    setEmployeeToDelete(null);
  };

  const calculateTotalToPay = (employee: PayrollEmployee) => {
    const config = getCurrentYearConfig();
    const novedades = getEmployeeNovedades(employee.id);
    
    // Salario proporcional según días trabajados
    const salarioProporcional = (employee.baseSalary / 30) * workedDays;
    
    // Base gravable: salario proporcional + novedades netas
    const baseGravable = salarioProporcional + novedades.totalNeto;
    
    // Deducciones de ley sobre base gravable
    const saludEmpleado = baseGravable * config.porcentajes.saludEmpleado;
    const pensionEmpleado = baseGravable * config.porcentajes.pensionEmpleado;
    const totalDeducciones = saludEmpleado + pensionEmpleado;
    
    // Auxilio de transporte proporcional (solo si salario ≤ 2 SMMLV)
    const auxilioTransporte = employee.baseSalary <= (config.salarioMinimo * 2) 
      ? (config.auxilioTransporte / 30) * workedDays 
      : 0;
    
    // Total a pagar = base gravable - deducciones + auxilio de transporte
    const totalNeto = baseGravable - totalDeducciones + auxilioTransporte;
    
    return Math.max(0, totalNeto);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre Empleado</TableHead>
            <TableHead className="text-right">Salario Base</TableHead>
            <TableHead className="text-center">Días Trabajados</TableHead>
            <TableHead className="text-center">Novedades</TableHead>
            <TableHead className="text-right">Total a Pagar Período</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const novedades = getEmployeeNovedades(employee.id);
            const totalToPay = calculateTotalToPay(employee);
            const hasNovedades = novedades.hasNovedades;

            return (
              <TableRow key={employee.id}>
                <TableCell>
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-sm text-gray-500">{employee.position}</div>
                </TableCell>
                
                <TableCell className="text-right font-medium">
                  {formatCurrency(employee.baseSalary)}
                </TableCell>
                
                <TableCell className="text-center font-medium">
                  {workedDays} días
                </TableCell>
                
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {hasNovedades && (
                      <div className={`text-sm font-medium flex items-center space-x-1 ${
                        novedades.totalNeto >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {novedades.totalNeto >= 0 && <span>+</span>}
                        <span>{formatCurrency(novedades.totalNeto)}</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNovedadModal(employee)}
                      disabled={isCreating}
                      className="h-8 w-8 p-0 rounded-full border-dashed border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                
                <TableCell className="text-right font-semibold text-lg">
                  {formatCurrency(totalToPay)}
                </TableCell>

                <TableCell className="text-center">
                  {onRemoveEmployee && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEmployee(employee)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Modal de novedades */}
      {selectedEmployee && currentPeriodId && (
        <NovedadUnifiedModal
          open={novedadModalOpen}
          setOpen={setNovedadModalOpen}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          periodId={currentPeriodId}
          onSubmit={handleNovedadSubmit}
          selectedNovedadType={null}
          onClose={handleCloseNovedadModal}
          onEmployeeNovedadesChange={handleNovedadChange}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={!!employeeToDelete} onOpenChange={cancelDeleteEmployee}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover empleado de la liquidación?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas remover a <strong>{employeeToDelete?.name}</strong> de esta liquidación? 
              Esta acción no afectará el registro del empleado en el módulo de empleados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteEmployee}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEmployee}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
