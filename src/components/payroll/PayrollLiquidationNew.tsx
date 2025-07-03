import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { PayrollPeriodService } from '@/services/PayrollPeriodService';
import { Employee } from '@/types';
import { EmployeePayrollView } from './EmployeePayrollView';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { toast } from '@/hooks/use-toast';
import { usePayrolls } from '@/hooks/usePayrolls';
import { useEmployeeStore } from '@/stores/employeeStore';

interface PayrollLiquidationNewProps {
  periodId: string;
  onCalculationComplete?: () => void;
  onEmployeeSelect?: (employeeId: string) => void;
}

export const PayrollLiquidationNew = ({ 
  periodId, 
  onCalculationComplete, 
  onEmployeeSelect 
}: PayrollLiquidationNewProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const { updateEmployee } = useEmployeeStore();
  const { recalculateEmployeePayroll } = usePayrolls();

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

  const recalculateAfterNovedadChange = useCallback(async (employeeId: string) => {
    await handleRecalculateEmployee(employeeId);
  }, [handleRecalculateEmployee]);

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
                    ${PayrollPeriodService.formatNumber(employee.netPay)}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <EmployeePayrollView 
                    employeeId={employee.id}
                    periodId={periodId}
                    onRecalculate={recalculateAfterNovedadChange}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
