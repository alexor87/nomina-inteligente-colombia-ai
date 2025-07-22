
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, Users, DollarSign, Download, Edit, FileText, Plus, History } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PayrollAdjustmentService, PayrollAdjustment } from '@/services/PayrollAdjustmentService';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  netPay: number;
  baseSalary: number;
}

interface PeriodDetail {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  employeesCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalCost: number;
  employerContributions: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export const PayrollHistoryDetailsPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [periodDetail, setPeriodDetail] = useState<PeriodDetail | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Mock data para desarrollo
  const mockPeriodData: PeriodDetail = {
    id: periodId || '',
    period: "1 - 15 Julio 2025",
    startDate: "2025-07-01",
    endDate: "2025-07-15",
    type: "quincenal",
    status: "cerrado",
    employeesCount: 2,
    totalGrossPay: 1914001,
    totalNetPay: 1777255,
    totalDeductions: 136746,
    totalCost: 1914001,
    employerContributions: 392370,
    paymentStatus: "pagado",
    createdAt: "2025-07-03T04:35:13.929711+00:00",
    updatedAt: "2025-07-04T19:17:03.813483+00:00"
  };

  const mockEmployees: Employee[] = [
    {
      id: '1',
      nombre: 'Juan Carlos',
      apellido: 'Pérez',
      netPay: 888627,
      baseSalary: 2500000
    },
    {
      id: '2',
      nombre: 'María Elena',
      apellido: 'González',
      netPay: 888628,
      baseSalary: 3000000
    }
  ];

  useEffect(() => {
    const loadData = async () => {
      if (!periodId) return;

      try {
        // Cargar datos del período (mock)
        setPeriodDetail(mockPeriodData);
        setEmployees(mockEmployees);

        // Cargar ajustes reales
        const periodAdjustments = await PayrollAdjustmentService.getAdjustmentsByPeriod(periodId);
        setAdjustments(periodAdjustments);

      } catch (error) {
        console.error('Error cargando datos:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar el detalle del período",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [periodId, toast]);

  const handleBack = () => {
    navigate('/app/payroll-history');
  };

  const handleRegisterAdjustment = () => {
    navigate(`/app/payroll-history/${periodId}/adjust`);
  };

  const handleDownloadVoucher = async (employeeId: string) => {
    toast({
      title: "Descargando comprobante",
      description: "Generando PDF...",
    });
    
    // Aquí implementaremos la descarga individual
    console.log('Descargando comprobante para empleado:', employeeId);
  };

  const handleDownloadAllVouchers = async () => {
    setDownloadingAll(true);
    
    try {
      toast({
        title: "Generando comprobantes",
        description: "Preparando archivo ZIP...",
      });
      
      // Aquí implementaremos la descarga masiva
      console.log('Descargando todos los comprobantes');
      
      toast({
        title: "✅ Descarga completada",
        description: "Se han descargado todos los comprobantes",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron descargar los comprobantes",
        variant: "destructive"
      });
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!periodDetail) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Período no encontrado</h3>
        <p className="text-gray-600">No se pudo cargar la información del período</p>
        <Button onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al historial
        </Button>
      </div>
    );
  }

  const hasAdjustments = adjustments.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al historial
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Detalle del Período
            </h1>
            <p className="text-gray-600">{periodDetail.period}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadAllVouchers} disabled={downloadingAll}>
            {downloadingAll ? (
              <LoadingSpinner className="mr-2 h-4 w-4" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar todos
          </Button>
          <Button size="sm" onClick={handleRegisterAdjustment}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar ajuste
          </Button>
        </div>
      </div>

      {/* Información del período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Información del Período
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Tipo</p>
              <p className="font-medium capitalize">{periodDetail.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Estado</p>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {hasAdjustments ? 'Con ajuste' : 'Original'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fechas</p>
              <p className="font-medium text-sm">
                {new Date(periodDetail.startDate).toLocaleDateString('es-ES')} - {' '}
                {new Date(periodDetail.endDate).toLocaleDateString('es-ES')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {periodDetail.employeesCount}
            </div>
            <p className="text-xs text-gray-500">Empleados liquidados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(periodDetail.totalNetPay)}
            </div>
            <p className="text-xs text-gray-500">Valor liquidado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Estado de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-600 capitalize">
              {periodDetail.paymentStatus}
            </div>
            <p className="text-xs text-gray-500">Estado actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen financiero */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Devengado</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(periodDetail.totalGrossPay)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Deducciones</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(periodDetail.totalDeductions)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Neto</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(periodDetail.totalNetPay)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Aportes Empleador</p>
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(periodDetail.employerContributions)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de empleados */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados del Período</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Salario Base</TableHead>
                <TableHead className="text-right">Valor Neto</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.nombre} {employee.apellido}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(employee.baseSalary)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(employee.netPay)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadVoucher(employee.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Descargar comprobante
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Historial de ajustes */}
      {hasAdjustments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Ajustes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Observación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => (
                  <TableRow key={adjustment.id}>
                    <TableCell>
                      {new Date(adjustment.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      {/* Aquí se mostraría el nombre del empleado */}
                      Empleado
                    </TableCell>
                    <TableCell>{adjustment.concept}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={adjustment.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(adjustment.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {/* Aquí se mostraría el nombre del creador */}
                      Administrador
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {adjustment.observations || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayrollHistoryDetailsPage;
