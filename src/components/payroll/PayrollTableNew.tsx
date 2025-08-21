
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Calculator, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnifiedService, UnifiedEmployeeData } from '@/services/EmployeeUnifiedService';

interface PayrollTableNewProps {
  periodId: string;
  onEmployeeUpdate?: (employeeId: string) => void;
}

export const PayrollTableNew: React.FC<PayrollTableNewProps> = ({ periodId, onEmployeeUpdate }) => {
  const [employees, setEmployees] = useState<UnifiedEmployeeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState<string | null>(null);
  const { toast } = useToast();

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading employees for period:', periodId);

      const result = await EmployeeUnifiedService.getEmployeesForPeriod(periodId);
      
      if (result.success && result.data) {
        setEmployees(result.data);
        console.log('✅ Employees loaded:', result.data.length);
        
        const transportCount = result.data.filter(emp => (emp.transportAllowance || 0) > 0).length;
        const validEmployees = result.data.filter(emp => emp.status === 'valid').length;

        toast({
          title: "Empleados cargados",
          description: `${result.data.length} empleados procesados. ${validEmployees} válidos, ${transportCount} con auxilio.`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        throw new Error(result.error || 'Error loading employees');
      }
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const correctPayroll = async () => {
    try {
      setIsLoading(true);
      console.log('🔧 Correcting payroll calculations...');

      await EmployeeUnifiedService.updatePayrollRecords(periodId);
      await loadEmployees();

      toast({
        title: "Nómina corregida",
        description: "Todos los cálculos han sido actualizados correctamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('❌ Error correcting payroll:', error);
      toast({
        title: "Error",
        description: "No se pudo corregir la nómina",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    return {
      totalEmployees: employees.length,
      totalGrossPay: employees.reduce((sum, emp) => sum + (emp.totalEarnings || 0), 0),
      totalDeductions: employees.reduce((sum, emp) => sum + (emp.totalDeductions || 0), 0),
      totalNetPay: employees.reduce((sum, emp) => sum + (emp.netPay || 0), 0),
      totalTransport: employees.reduce((sum, emp) => sum + (emp.transportAllowance || 0), 0)
    };
  };

  const recalculateEmployee = async (employeeId: string) => {
    try {
      setIsCalculating(employeeId);
      console.log('🔄 Recalculating employee:', employeeId);

      // Get configuration info
      const configResult = await EmployeeUnifiedService.getConfigurationInfo();
      if (!configResult.success) {
        throw new Error('Could not get configuration');
      }

      const config = configResult.data;
      const salarioMinimo = config.salarioMinimo;
      const auxilioTransporte = config.auxilioTransporte;

      // Update employee calculations
      await EmployeeUnifiedService.updatePayrollRecords(periodId);
      await loadEmployees();

      onEmployeeUpdate?.(employeeId);

      toast({
        title: "Empleado recalculado",
        description: "Los cálculos han sido actualizados",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('❌ Error recalculating employee:', error);
      toast({
        title: "Error",
        description: "No se pudo recalcular el empleado",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(null);
    }
  };

  useEffect(() => {
    if (periodId) {
      loadEmployees();
    }
  }, [periodId]);

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Nómina del Período</h2>
          <p className="text-muted-foreground">
            {employees.length} empleados procesados
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={loadEmployees}
            variant="outline"
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button
            onClick={correctPayroll}
            disabled={isLoading}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            Corregir Nómina
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalEmployees}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Devengado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totals.totalGrossPay.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deducciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totals.totalDeductions.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${totals.totalNetPay.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados Procesados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay empleados procesados para este período
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{employee.name || `${employee.nombre} ${employee.apellido}`}</div>
                    <div className="text-sm text-muted-foreground">
                      Salario Base: ${(employee.baseSalary || employee.salarioBase || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Días: {employee.workedDays || 30}
                    </div>
                    {employee.transportAllowance && employee.transportAllowance > 0 && (
                      <div className="text-sm text-green-600">
                        Auxilio Transporte: ${employee.transportAllowance.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="text-right space-y-2">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Devengado: ${(employee.totalEarnings || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Salud: ${(employee.healthDeduction || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pensión: ${(employee.pensionDeduction || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Deducciones: ${(employee.totalDeductions || 0).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-green-600">
                        ${(employee.netPay || 0).toLocaleString()}
                      </div>
                      <Badge variant={employee.status === 'valid' ? 'default' : 'destructive'}>
                        {employee.status || 'unknown'}
                      </Badge>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => recalculateEmployee(employee.id)}
                      disabled={isCalculating === employee.id}
                      className="gap-1"
                    >
                      {isCalculating === employee.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Calculator className="h-3 w-3" />
                      )}
                      Recalcular
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
