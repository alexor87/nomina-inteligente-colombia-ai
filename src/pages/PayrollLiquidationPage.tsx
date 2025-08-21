import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PayrollLiquidationSimpleTable } from '@/components/payroll/liquidation/PayrollLiquidationSimpleTable';
import { EmployeeSelectionModal } from '@/components/payroll/modals/EmployeeSelectionModal';
import { SuccessModal } from '@/components/payroll/modals/SuccessModal';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useYear } from '@/contexts/YearContext';

export const PayrollLiquidationPage: React.FC = () => {
  const [isEmployeeSelectionModalOpen, setIsEmployeeSelectionModalOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const { selectedYear } = useYear();

  const {
    employees,
    isLoading,
    isLiquidating,
    currentPeriodId,
    loadEmployees,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    showSuccessModal,
    liquidationResult,
    closeSuccessModal
  } = usePayrollLiquidation();

  const handleOpenEmployeeSelectionModal = () => {
    setIsEmployeeSelectionModalOpen(true);
  };

  const handleCloseEmployeeSelectionModal = () => {
    setIsEmployeeSelectionModalOpen(false);
  };

  const handleAddSelectedEmployees = useCallback((employeeIds: string[]) => {
    addEmployees(employeeIds);
    handleCloseEmployeeSelectionModal();
  }, [addEmployees]);

  const handleRemoveEmployee = useCallback((employeeId: string) => {
    removeEmployee(employeeId);
  }, [removeEmployee]);

  const handleDateChange = useCallback((newDate: Date | undefined) => {
    setDate(newDate);
  }, []);

  const handleStartDateChange = useCallback((newDate: Date | undefined) => {
    setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate: Date | undefined) => {
    setEndDate(newDate);
  }, []);

  const handleLoadEmployees = useCallback(async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un rango de fechas válido.",
        variant: "destructive"
      });
      return;
    }

    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');

    await loadEmployees(formattedStartDate, formattedEndDate, selectedYear);
  }, [startDate, endDate, loadEmployees, toast, selectedYear]);

  const handleLiquidatePayroll = useCallback(async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un rango de fechas válido.",
        variant: "destructive"
      });
      return;
    }

    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');

    await liquidatePayroll(formattedStartDate, formattedEndDate);
  }, [startDate, endDate, liquidatePayroll, toast]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Liquidación de Nómina</h1>

      {/* Date Range Picker */}
      <div className="mb-6 flex items-center space-x-4">
        <div>
          <Label htmlFor="start-date">Fecha de Inicio</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                disabled={(date) =>
                  date > new Date()
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="end-date">Fecha de Fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                disabled={(date) =>
                  date > new Date()
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={handleLoadEmployees} disabled={isLoading}>
          {isLoading ? 'Cargando...' : 'Cargar Empleados'}
        </Button>
      </div>

      {/* Employee List and Actions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Lista de Empleados</h2>
          <Button onClick={handleOpenEmployeeSelectionModal}>
            Agregar Empleados
          </Button>
        </div>

        {/* Employee Table */}
        {employees && employees.length > 0 ? (
          <PayrollLiquidationSimpleTable
            employees={employees as any}
            startDate={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            endDate={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            currentPeriodId={currentPeriodId}
            onRemoveEmployee={handleRemoveEmployee}
            onEmployeeNovedadesChange={refreshEmployeeNovedades}
            year={selectedYear}
          />
        ) : (
          <p>No hay empleados cargados para la liquidación.</p>
        )}
      </div>

      {/* Liquidation Action */}
      <div className="mb-6">
        <Button
          onClick={handleLiquidatePayroll}
          disabled={isLiquidating || employees.length === 0}
        >
          {isLiquidating ? 'Liquidando...' : 'Liquidar Nómina'}
        </Button>
      </div>

      {/* Modals */}
      <EmployeeSelectionModal
        isOpen={isEmployeeSelectionModalOpen}
        onClose={handleCloseEmployeeSelectionModal}
        onAddEmployees={handleAddSelectedEmployees}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={closeSuccessModal}
        periodData={liquidationResult?.periodData}
        summary={liquidationResult?.summary}
      />
    </div>
  );
};
