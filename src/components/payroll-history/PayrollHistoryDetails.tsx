
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, FileText, Eye } from 'lucide-react';
import { PayrollHistoryPeriod, PayrollHistoryEmployee } from '@/types/payroll-history';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';

export const PayrollHistoryDetails = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [employees, setEmployees] = useState<PayrollHistoryEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (periodId) {
      loadPeriodDetails();
    }
  }, [periodId]);

  const loadPeriodDetails = async () => {
    try {
      setIsLoading(true);
      
      // Cargar todos los períodos y buscar el específico
      const allPeriods = await PayrollHistoryService.getPayrollPeriods();
      const foundPeriod = allPeriods.find(p => p.id === periodId);
      
      if (foundPeriod) {
        // Convertir el registro a PayrollHistoryPeriod si es necesario
        const convertedPeriod: PayrollHistoryPeriod = {
          id: foundPeriod.id,
          period: foundPeriod.periodo || 'Sin período',
          startDate: foundPeriod.fechaCreacion || new Date().toISOString().split('T')[0],
          endDate: foundPeriod.fechaCreacion || new Date().toISOString().split('T')[0],
          type: 'mensual' as const,
          employeesCount: foundPeriod.empleados || 0,
          status: foundPeriod.estado === 'cerrada' || foundPeriod.estado === 'procesada' || foundPeriod.estado === 'pagada' ? 'cerrado' : 
                 foundPeriod.estado === 'borrador' ? 'revision' : 'con_errores',
          totalGrossPay: Number(foundPeriod.totalNomina || 0),
          totalNetPay: Number(foundPeriod.totalNomina || 0),
          totalDeductions: 0,
          totalCost: Number(foundPeriod.totalNomina || 0),
          employerContributions: 0,
          paymentStatus: foundPeriod.estado === 'pagada' ? 'pagado' as const : 'pendiente' as const,
          version: 1,
          createdAt: foundPeriod.fechaCreacion || new Date().toISOString(),
          updatedAt: foundPeriod.fechaCreacion || new Date().toISOString(),
        };
        
        setPeriod(convertedPeriod);
        
        // Por ahora, crear empleados de ejemplo basados en el período
        // En una implementación real, aquí cargarías los empleados específicos del período
        const mockEmployees: PayrollHistoryEmployee[] = Array.from({ length: foundPeriod.empleados || 0 }, (_, index) => ({
          id: `emp-${index + 1}`,
          periodId: periodId,
          name: `Empleado ${index + 1}`,
          position: 'Cargo Ejemplo',
          grossPay: Number(foundPeriod.totalNomina) / foundPeriod.empleados,
          deductions: Number(foundPeriod.totalNomina) * 0.08 / foundPeriod.empleados,
          netPay: Number(foundPeriod.totalNomina) * 0.92 / foundPeriod.empleados,
          paymentStatus: foundPeriod.estado === 'pagada' ? 'pagado' : 'pendiente',
        }));
        
        setEmployees(mockEmployees);
      } else {
        console.log('Período no encontrado:', periodId);
        setPeriod(null);
      }
    } catch (error) {
      console.error('Error loading period details:', error);
      setPeriod(null);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getPaymentStatusBadge = (status: 'pagado' | 'pendiente') => {
    const statusConfig = {
      pagado: { color: 'bg-green-100 text-green-800', text: 'Pagado', icon: '✓' },
      pendiente: { color: 'bg-red-100 text-red-800', text: 'Pendiente', icon: '⏳' }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-xs`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </Badge>
    );
  };

  const handleDownloadPayslip = (employee: PayrollHistoryEmployee) => {
    if (employee.payslipUrl) {
      console.log('Descargando comprobante de:', employee.name);
      // Aquí iría la lógica real de descarga
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Período no encontrado</h2>
          <p className="text-gray-600 mb-4">No se pudo encontrar el período solicitado</p>
          <Button onClick={() => navigate('/app/payroll-history')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al historial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/app/payroll-history')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Detalles del Período: {period.period}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Información detallada del período de nómina
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {period.pilaFileUrl && (
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Descargar PILA
                </Button>
              )}
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Exportar Detalles
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Período</p>
                <p className="text-lg font-semibold text-gray-900">{period.period}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {period.startDate} - {period.endDate}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Estado</p>
                <div className="mt-1">
                  {getStatusBadge(period.status)}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Empleados</p>
                <p className="text-lg font-semibold text-gray-900">{period.employeesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Financiero */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Devengado</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(period.totalGrossPay)}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Deducciones</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(period.totalDeductions)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Neto Pagado</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(period.totalNetPay)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Costo Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(period.totalCost)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Empleados */}
        <Card>
          <CardHeader>
            <CardTitle>Empleados del Período</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Devengado</TableHead>
                  <TableHead className="text-right">Deducciones</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead>Estado Pago</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(employee.grossPay)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(employee.deductions)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatCurrency(employee.netPay)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(employee.paymentStatus)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-1">
                        {employee.payslipUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPayslip(employee)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver comprobante"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPayslip(employee)}
                          className="text-green-600 hover:text-green-800"
                          title="Descargar comprobante"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {employees.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron empleados para este período</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
