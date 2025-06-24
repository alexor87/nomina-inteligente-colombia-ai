
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, FileText, Users, Calendar, DollarSign } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { mockPayrollHistoryEmployees } from '@/data/mockPayrollHistory';

interface PayrollHistoryDetailsProps {
  period: PayrollHistoryPeriod;
  onBack: () => void;
}

export const PayrollHistoryDetails = ({ period, onBack }: PayrollHistoryDetailsProps) => {
  const [employees] = useState(mockPayrollHistoryEmployees.filter(emp => emp.periodId === period.id));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: PayrollHistoryPeriod['status']) => {
    const statusConfig = {
      cerrado: { color: 'bg-green-100 text-green-800', text: 'Cerrado', icon: '✓' },
      con_errores: { color: 'bg-red-100 text-red-800', text: 'Con errores', icon: '✗' },
      revision: { color: 'bg-yellow-100 text-yellow-800', text: 'En revisión', icon: '⚠' },
      editado: { color: 'bg-blue-100 text-blue-800', text: 'Editado', icon: '✏' }
    };
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-xs`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="p-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Detalle del Período</h1>
                <p className="text-gray-600 flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{period.period}</span>
                  {period.version > 1 && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">v{period.version}</Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Descargar ZIP
              </Button>
            </div>
          </div>
        </div>

        {/* Resumen del período */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Resumen del Período</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Periodicidad</div>
                <div className="text-lg font-semibold capitalize">{period.type}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Empleados liquidados</div>
                <div className="text-lg font-semibold flex items-center">
                  <Users className="h-4 w-4 mr-1 text-blue-600" />
                  {period.employeesCount}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Estado del período</div>
                <div className="mt-1">{getStatusBadge(period.status)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Estado de pagos</div>
                <div className="mt-1">
                  <Badge className={
                    period.paymentStatus === 'pagado' ? 'bg-green-100 text-green-800' :
                    period.paymentStatus === 'parcial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {period.paymentStatus === 'pagado' ? '✓ Pagado' :
                     period.paymentStatus === 'parcial' ? '⚠ Parcial' : '⏳ Pendiente'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Totales generales */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span>Totales Generales</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(period.totalGrossPay)}</div>
                <div className="text-sm text-gray-600">Devengado Total</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(period.totalDeductions)}</div>
                <div className="text-sm text-gray-600">Deducciones Totales</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(period.totalNetPay)}</div>
                <div className="text-sm text-gray-600">Neto Pagado</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(period.employerContributions)}</div>
                <div className="text-sm text-gray-600">Aportes Empleador</div>
              </div>
              <div className="text-center p-4 border-2 border-purple-300 rounded-lg bg-purple-50">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(period.totalCost)}</div>
                <div className="text-sm text-gray-600">Costo Total Nómina</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de empleados */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Empleados del Período</span>
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Descargar Desprendibles
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Devengado</TableHead>
                  <TableHead>Deducciones</TableHead>
                  <TableHead>Neto Pagado</TableHead>
                  <TableHead>Estado Pago</TableHead>
                  <TableHead className="text-center">Desprendible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(employee.grossPay || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(employee.deductions || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatCurrency(employee.netPay)}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        employee.paymentStatus === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }>
                        {employee.paymentStatus === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Archivos generados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Archivos Generados</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-2">Desprendibles</div>
                <div className="text-xs text-gray-600 mb-2">{employees.length} archivos PDF</div>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-3 w-3 mr-1" />
                  Descargar
                </Button>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-2">Archivo PILA</div>
                <div className="text-xs text-gray-600 mb-2">Archivo TXT</div>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-3 w-3 mr-1" />
                  Descargar
                </Button>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-2">Certificados</div>
                <div className="text-xs text-gray-600 mb-2">Archivos PDF</div>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-3 w-3 mr-1" />
                  Descargar
                </Button>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-2">Reportes</div>
                <div className="text-xs text-gray-600 mb-2">Excel y PDF</div>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-3 w-3 mr-1" />
                  Descargar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
