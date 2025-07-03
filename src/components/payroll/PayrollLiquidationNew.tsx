
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Users, Plus } from 'lucide-react';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { EmployeeService } from '@/services/EmployeeService';
import { PayrollHistoryEmployee } from '@/types/payroll-history';
import { toast } from '@/hooks/use-toast';

interface PayrollLiquidationNewProps {
  periodId: string;
  onCalculationComplete?: () => void;
  onEmployeeSelect?: (employeeId: string) => void;
}

// Simple number formatting function
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Empty state when no employees exist in the company
const NoEmployeesEmptyState = ({ onCreateEmployee }: { onCreateEmployee: () => void }) => {
  return (
    <div className="text-center py-12">
      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay empleados registrados</h3>
      <p className="text-gray-600 mb-4">
        Para procesar nómina necesitas tener empleados registrados en tu empresa
      </p>
      <Button onClick={onCreateEmployee} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" />
        Crear Empleado
      </Button>
    </div>
  );
};

export const PayrollLiquidationNew = ({ 
  periodId, 
  onCalculationComplete, 
  onEmployeeSelect 
}: PayrollLiquidationNewProps) => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<PayrollHistoryEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingEmployees, setIsCheckingEmployees] = useState(false);
  const [hasCompanyEmployees, setHasCompanyEmployees] = useState<boolean | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validar UUID
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Verificar si hay empleados en la empresa
  const checkCompanyEmployees = useCallback(async () => {
    if (hasCompanyEmployees !== null) return; // Ya verificado
    
    setIsCheckingEmployees(true);
    try {
      console.log('🔍 Checking if company has employees...');
      const allEmployees = await EmployeeService.getAllEmployees();
      const hasEmployees = allEmployees && allEmployees.length > 0;
      setHasCompanyEmployees(hasEmployees);
      console.log(`✅ Company has employees: ${hasEmployees} (${allEmployees?.length || 0} employees)`);
    } catch (error) {
      console.error('❌ Error checking company employees:', error);
      setHasCompanyEmployees(true); // Assume has employees to avoid blocking UX
    } finally {
      setIsCheckingEmployees(false);
    }
  }, [hasCompanyEmployees]);

  const loadEmployees = useCallback(async () => {
    // Validar periodId antes de hacer la consulta
    if (!periodId || !isValidUUID(periodId)) {
      setError('ID de período inválido');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading employees for period:', periodId);
      const periodDetails = await PayrollHistoryService.getPeriodDetails(periodId);
      
      if (!periodDetails || !periodDetails.employees) {
        console.warn('⚠️ Period details or employees not found');
        setEmployees([]);
        setError('No se encontraron empleados para este período');
        return;
      }
      
      setEmployees(periodDetails.employees);
      console.log('✅ Employees loaded successfully:', periodDetails.employees.length);
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      setError('No se pudieron cargar los empleados del período');
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [periodId]);

  // Verificar empleados de la empresa al montar el componente
  useEffect(() => {
    checkCompanyEmployees();
  }, [checkCompanyEmployees]);

  // Cargar empleados del período después de verificar que hay empleados en la empresa
  useEffect(() => {
    if (hasCompanyEmployees === true) {
      loadEmployees();
    } else if (hasCompanyEmployees === false) {
      setIsLoading(false);
    }
  }, [hasCompanyEmployees, loadEmployees]);

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    onEmployeeSelect?.(employeeId);
  };

  const handleCreateEmployee = () => {
    navigate('/app/employees/create');
  };

  const handleRecalculateEmployee = useCallback(async (employeeId: string) => {
    try {
      // Recalcular totales con novedades
      await PayrollHistoryService.recalculateEmployeeTotalsWithNovedades(employeeId, periodId);
      
      // Recalcular totales del período
      await PayrollHistoryService.recalculatePeriodTotals(periodId);
      
      // Recargar empleados y disparar evento complete
      await loadEmployees();
      onCalculationComplete?.();
      
      toast({
        title: "¡Recálculo exitoso!",
        description: "Se han actualizado los valores del empleado y del período",
      });
    } catch (error) {
      console.error('Error recalculating employee:', error);
      toast({
        title: "Error",
        description: "No se pudo recalcular el empleado",
        variant: "destructive"
      });
    }
  }, [loadEmployees, onCalculationComplete, periodId]);

  // Mostrar loading inicial
  if (isCheckingEmployees || (isLoading && hasCompanyEmployees === null)) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Liquidación de Nómina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si no hay empleados en la empresa, mostrar estado vacío para crear empleados
  if (hasCompanyEmployees === false) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Liquidación de Nómina</CardTitle>
        </CardHeader>
        <CardContent>
          <NoEmployeesEmptyState onCreateEmployee={handleCreateEmployee} />
        </CardContent>
      </Card>
    );
  }

  // Si hay error, mostrar mensaje de error
  if (error && !isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error de Liquidación
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={loadEmployees}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Liquidación de Nómina</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay empleados en este período</p>
            <p className="text-sm text-gray-500 mt-2">
              Los empleados pueden no estar asignados a este período específico
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible>
            {employees.map((employee) => (
              <AccordionItem key={employee.id} value={employee.id}>
                <AccordionTrigger className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-none">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {formatCurrency(employee.netPay)}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Salario Base</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(employee.baseSalary)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Devengado</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(employee.grossPay)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Deducciones</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(employee.deductions)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Neto a Pagar</p>
                        <p className="text-sm font-medium text-green-600">{formatCurrency(employee.netPay)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRecalculateEmployee(employee.id)}
                      className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      Recalcular
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
