
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Calculator, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { EmployeeUnifiedService, UnifiedEmployeeData } from '@/services/EmployeeUnifiedService';
import { useToast } from '@/hooks/use-toast';

interface PayrollTableNewProps {
  periodId: string;
  onRefresh?: () => void;
}

export const PayrollTableNew: React.FC<PayrollTableNewProps> = ({ periodId, onRefresh }) => {
  const [employees, setEmployees] = useState<UnifiedEmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const loadEmployees = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando empleados con cálculos corregidos 2025...');
      
      const employeeData = await EmployeeUnifiedService.getEmployeesForPeriod(periodId);
      setEmployees(employeeData);
      
      console.log('✅ Empleados cargados:', employeeData.length);
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setUpdating(true);
      console.log('🔄 Recalculando nómina con valores 2025...');
      
      await EmployeeUnifiedService.updatePayrollRecords(periodId);
      await loadEmployees();
      
      toast({
        title: "✅ Nómina recalculada",
        description: "Los cálculos se han actualizado con los valores 2025 correctos",
        className: "border-green-200 bg-green-50"
      });
      
      onRefresh?.();
    } catch (error) {
      console.error('❌ Error recalculando:', error);
      toast({
        title: "Error",
        description: "No se pudo recalcular la nómina",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (periodId) {
      loadEmployees();
    }
  }, [periodId]);

  const totalEarnings = employees.reduce((sum, emp) => sum + emp.totalEarnings, 0);
  const totalDeductions = employees.reduce((sum, emp) => sum + emp.totalDeductions, 0);
  const totalNetPay = employees.reduce((sum, emp) => sum + emp.netPay, 0);
  const employeesWithTransport = employees.filter(emp => emp.transportAllowance > 0).length;

  const configInfo = EmployeeUnifiedService.getConfigurationInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando empleados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Nómina con Cálculos Corregidos 2025</h3>
          <Badge variant="outline" className="text-green-600">
            SMMLV: {formatCurrency(configInfo.salarioMinimo)}
          </Badge>
          <Badge variant="outline" className="text-blue-600">
            Auxilio: {formatCurrency(configInfo.auxilioTransporte)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showDetails ? 'Ocultar' : 'Mostrar'} Detalles
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEmployees}
            disabled={updating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleRecalculate}
            disabled={updating}
          >
            {updating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            Recalcular
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-sm text-muted-foreground">
              {employeesWithTransport} con auxilio
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Devengado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalEarnings)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Deducciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDeductions)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalNetPay)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de empleados */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados - Cálculos Corregidos 2025</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Empleado</th>
                  <th className="text-right p-2">Salario Base</th>
                  <th className="text-right p-2">Días</th>
                  <th className="text-right p-2">Auxilio</th>
                  <th className="text-right p-2">Devengado</th>
                  {showDetails && (
                    <>
                      <th className="text-right p-2">Salud</th>
                      <th className="text-right p-2">Pensión</th>
                      <th className="text-right p-2">Deducciones</th>
                    </>
                  )}
                  <th className="text-right p-2">Neto</th>
                  <th className="text-center p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{employee.name}</td>
                    <td className="text-right p-2">{formatCurrency(employee.baseSalary)}</td>
                    <td className="text-right p-2">{employee.workedDays}</td>
                    <td className="text-right p-2">
                      <span className={employee.transportAllowance > 0 ? 'text-green-600' : 'text-gray-400'}>
                        {formatCurrency(employee.transportAllowance)}
                      </span>
                    </td>
                    <td className="text-right p-2 font-medium">
                      {formatCurrency(employee.totalEarnings)}
                    </td>
                    {showDetails && (
                      <>
                        <td className="text-right p-2 text-red-600">
                          {formatCurrency(employee.healthDeduction)}
                        </td>
                        <td className="text-right p-2 text-red-600">
                          {formatCurrency(employee.pensionDeduction)}
                        </td>
                        <td className="text-right p-2 text-red-600">
                          {formatCurrency(employee.totalDeductions)}
                        </td>
                      </>
                    )}
                    <td className="text-right p-2 font-bold text-blue-600">
                      {formatCurrency(employee.netPay)}
                    </td>
                    <td className="text-center p-2">
                      <Badge variant={employee.status === 'valid' ? 'default' : 'destructive'}>
                        {employee.status === 'valid' ? 'OK' : 'Error'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Información de Cálculo 2025</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>SMMLV 2025:</strong> {formatCurrency(configInfo.salarioMinimo)}
            </div>
            <div>
              <strong>Auxilio Transporte:</strong> {formatCurrency(configInfo.auxilioTransporte)}
            </div>
            <div>
              <strong>Límite Auxilio:</strong> {formatCurrency(configInfo.limitAuxilio)}
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Los empleados con salario ≤ {formatCurrency(configInfo.limitAuxilio)} (2 SMMLV) reciben auxilio de transporte proporcional.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
