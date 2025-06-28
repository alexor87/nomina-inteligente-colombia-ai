
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { EmployeeService } from '@/services/EmployeeService';
import { PayrollHistoryDetails, PayrollHistoryEmployee } from '@/types/payroll-history';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EditableEmployeeTable } from '@/components/payroll-history/EditableEmployeeTable';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { DevengoModal } from '@/components/payroll-history/DevengoModal';

interface DevengoModalState {
  isOpen: boolean;
  employeeId: string;
  employeeName: string;
  employeeSalary: number;
  payrollId: string;
}

const PeriodEditPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [devengoModal, setDevengoModal] = useState<DevengoModalState>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    employeeSalary: 0,
    payrollId: ''
  });
  const [employees, setEmployees] = useState<PayrollHistoryEmployee[]>([]);

  const {
    data: periodDetails,
    isLoading,
    isError,
    refetch,
    error: periodError
  } = useQuery({
    queryKey: ['payrollPeriodDetails', periodId],
    queryFn: () => PayrollHistoryService.getPeriodDetails(periodId as string),
    enabled: !!periodId
  });

  const { data: allEmployees, isLoading: isEmployeesLoading, error: employeesError } = useQuery({
    queryKey: ['employees'],
    queryFn: EmployeeService.getEmployees
  });

  // Handle period details success
  useEffect(() => {
    if (periodDetails) {
      setDate(new Date(periodDetails.period.startDate));
      setEmployees(periodDetails.employees);
    }
  }, [periodDetails]);

  // Handle period details error
  useEffect(() => {
    if (periodError) {
      toast({
        title: "Error al cargar el período",
        description: "No se pudieron cargar los detalles del período seleccionado.",
        variant: "destructive"
      });
    }
  }, [periodError, toast]);

  // Handle employees error
  useEffect(() => {
    if (employeesError) {
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados.",
        variant: "destructive"
      });
    }
  }, [employeesError, toast]);

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
  };

  const handlePreviousMonth = () => {
    if (date) {
      handleDateChange(subMonths(date, 1));
    }
  };

  const handleNextMonth = () => {
    if (date) {
      handleDateChange(addMonths(date, 1));
    }
  };

  const handleEditModeToggle = () => {
    setIsEditMode(!isEditMode);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredEmployees = employees?.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeUpdate = async (employeeId: string, updates: Partial<PayrollHistoryEmployee>) => {
    try {
      await PayrollHistoryService.updateEmployeeValues(periodId as string, employeeId, updates);
      
      // Optimistically update the local state
      setEmployees(prevEmployees =>
        prevEmployees.map(employee =>
          employee.id === employeeId ? { ...employee, ...updates } : employee
        )
      );

      toast({
        title: "Empleado actualizado",
        description: `Se ha actualizado la información de ${employeeId}.`,
      });
    } catch (error) {
      console.error("Error updating employee:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del empleado.",
        variant: "destructive"
      });
    }
  };

  const handleRecalculateTotals = async () => {
    try {
      await PayrollHistoryService.recalculatePeriodTotals(periodId as string);
      toast({
        title: "Totales recalculados",
        description: "Los totales del período se han recalculado correctamente.",
      });
      refetch(); // Refresh the data to reflect the changes
    } catch (error) {
      console.error("Error recalculating totals:", error);
      toast({
        title: "Error",
        description: "No se pudieron recalculados los totales del período.",
        variant: "destructive"
      });
    }
  };

  const handleOpenDevengoModal = (employeeId: string, employeeName: string, employeeSalary: number, payrollId: string) => {
    setDevengoModal({
      isOpen: true,
      employeeId,
      employeeName,
      employeeSalary,
      payrollId
    });
  };

  const handleCloseDevengoModal = useCallback(() => {
    setDevengoModal({
      isOpen: false,
      employeeId: '',
      employeeName: '',
      employeeSalary: 0,
      payrollId: ''
    });
  }, []);

  const handleNovedadCreated = useCallback((employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => {
    // Find the employee to update
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    // Update values automatically
    let updates: Partial<PayrollHistoryEmployee> = {};
    
    if (tipo === 'devengado') {
      updates.grossPay = employee.grossPay + valor;
    } else if (tipo === 'deduccion') {
      updates.deductions = employee.deductions + valor;
    }
    
    // Recalculate neto
    const newGrossPay = updates.grossPay || employee.grossPay;
    const newDeductions = updates.deductions || employee.deductions;
    updates.netPay = newGrossPay - newDeductions;

    handleEmployeeUpdate(employeeId, updates);
    refetch();
  }, [employees, handleEmployeeUpdate, refetch]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="w-[200px] h-8" />
        <div className="flex items-center space-x-4">
          <Skeleton className="w-[150px] h-8" />
          <Skeleton className="w-[150px] h-8" />
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="w-[150px] h-6" /></CardTitle>
              <CardDescription><Skeleton className="w-[100px] h-4" /></CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="w-full h-10" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="w-[150px] h-6" /></CardTitle>
              <CardDescription><Skeleton className="w-[100px] h-4" /></CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="w-full h-10" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="w-[150px] h-6" /></CardTitle>
              <CardDescription><Skeleton className="w-[100px] h-4" /></CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="w-full h-10" />
            </CardContent>
          </Card>
        </div>
        <Separator />
        <Skeleton className="w-full h-[400px]" />
      </div>
    );
  }

  if (isError || !periodDetails) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-md border p-4 text-center">
          <h2 className="text-lg font-semibold">Error al cargar el período</h2>
          <p className="text-gray-500">No se pudieron cargar los detalles del período seleccionado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {format(date || new Date(), 'MMMM yyyy', { locale: es })}
          </h1>
          <p className="text-gray-500">
            {format(startOfMonth(date || new Date()), 'dd MMMM', { locale: es })} -{' '}
            {format(endOfMonth(date || new Date()), 'dd MMMM', { locale: es })}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Siguiente
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Label htmlFor="edit">Modo Edición</Label>
          <Switch id="edit" checked={isEditMode} onCheckedChange={handleEditModeToggle} />
        </div>
        <div className="space-x-2 flex items-center">
          <Input
            type="search"
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-64"
          />
          <Button onClick={handleRecalculateTotals}>Recalcular Totales</Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Devengado</CardTitle>
            <CardDescription>Salarios + Bonificaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(periodDetails.summary.totalDevengado)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Deducciones</CardTitle>
            <CardDescription>Salud, Pensión, etc.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(periodDetails.summary.totalDeducciones)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Neto a Pagar</CardTitle>
            <CardDescription>Total Devengado - Total Deducciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(periodDetails.summary.totalNeto)}</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <EditableEmployeeTable
        employees={filteredEmployees}
        isEditMode={isEditMode}
        onEmployeeUpdate={handleEmployeeUpdate}
        periodId={periodId as string}
        onNovedadChange={refetch}
      />
      
      {/* Devengado Modal */}
      <DevengoModal
        isOpen={devengoModal.isOpen}
        onClose={handleCloseDevengoModal}
        employeeId={devengoModal.employeeId}
        employeeName={devengoModal.employeeName}
        employeeSalary={devengoModal.employeeSalary}
        payrollId={devengoModal.payrollId}
        periodId={periodId as string}
        onNovedadCreated={handleNovedadCreated}
      />
    </div>
  );
};

export default PeriodEditPage;
