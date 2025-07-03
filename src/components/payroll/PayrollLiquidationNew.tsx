
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
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

export const PayrollLiquidationNew = ({ 
  periodId, 
  onCalculationComplete, 
  onEmployeeSelect 
}: PayrollLiquidationNewProps) => {
  const [employees, setEmployees] = useState<PayrollHistoryEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const periodDetails = await PayrollHistoryService.getPeriodDetails(periodId);
      setEmployees(periodDetails.employees);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    onEmployeeSelect?.(employeeId);
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
