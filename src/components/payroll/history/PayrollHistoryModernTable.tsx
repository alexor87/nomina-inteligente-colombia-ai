import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Edit, AlertCircle } from 'lucide-react';

interface EmployeePayroll {
  id: string;
  empleado_id: string;
  employee_name: string;
  employee_identification: string;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  tiene_novedades: boolean;
}

interface PendingNovedad {
  id: string;
  empleado_id: string;
  tipo_novedad: string;
  concepto: string;
  valor: number;
  estado: string;
}

interface PayrollHistoryModernTableProps {
  employees: EmployeePayroll[];
  pendingNovedades: PendingNovedad[];
  isLoading: boolean;
  onDownloadVoucher: (employeeId: string) => void;
  onOpenAdjustmentModal: (employeeId: string) => void;
  calculateEmployeePreview: (employee: EmployeePayroll) => {
    totalDevengado: number;
    totalDeducciones: number;
    totalNeto: number;
    hasPendingChanges: boolean;
  };
}

export const PayrollHistoryModernTable = ({
  employees,
  pendingNovedades,
  isLoading,
  onDownloadVoucher,
  onOpenAdjustmentModal,
  calculateEmployeePreview
}: PayrollHistoryModernTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_identification.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empleados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Empleados ({filteredEmployees.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Empleado</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Devengado</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Deducciones</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Neto</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => {
                const preview = calculateEmployeePreview(employee);
                const isChanged = preview.hasPendingChanges;
                
                return (
                  <tr key={employee.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-foreground">
                            {employee.employee_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            CC: {employee.employee_identification}
                          </div>
                        </div>
                        {isChanged && (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="space-y-1">
                        {isChanged && preview.totalDevengado !== employee.total_devengado ? (
                          <>
                            <div className="text-sm text-muted-foreground line-through">
                              {formatCurrency(employee.total_devengado)}
                            </div>
                            <div className="font-medium text-green-600">
                              {formatCurrency(preview.totalDevengado)}
                            </div>
                          </>
                        ) : (
                          <div className="font-medium text-foreground">
                            {formatCurrency(employee.total_devengado)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="space-y-1">
                        {isChanged && preview.totalDeducciones !== employee.total_deducciones ? (
                          <>
                            <div className="text-sm text-muted-foreground line-through">
                              {formatCurrency(employee.total_deducciones)}
                            </div>
                            <div className="font-medium text-red-600">
                              {formatCurrency(preview.totalDeducciones)}
                            </div>
                          </>
                        ) : (
                          <div className="font-medium text-foreground">
                            {formatCurrency(employee.total_deducciones)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="space-y-1">
                        {isChanged && preview.totalNeto !== employee.total_neto ? (
                          <>
                            <div className="text-sm text-muted-foreground line-through">
                              {formatCurrency(employee.total_neto)}
                            </div>
                            <div className="font-medium text-primary">
                              {formatCurrency(preview.totalNeto)}
                            </div>
                          </>
                        ) : (
                          <div className="font-medium text-foreground">
                            {formatCurrency(employee.total_neto)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        {employee.tiene_novedades && (
                          <Badge variant="secondary" className="text-xs">
                            Con novedades
                          </Badge>
                        )}
                        {isChanged && (
                          <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700">
                            Pendiente
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownloadVoucher(employee.empleado_id)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenAdjustmentModal(employee.empleado_id)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron empleados que coincidan con la búsqueda' : 'No hay empleados en este período'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};