
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  DollarSign,
  Download,
  Plus,
  FileText,
  User,
  Calculator,
  Loader2,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { HistoryServiceAleluya, PeriodDetail } from '@/services/HistoryServiceAleluya';
import { useToast } from '@/hooks/use-toast';

export const PayrollHistoryDetailPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [periodDetail, setPeriodDetail] = useState<PeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingVoucher, setDownloadingVoucher] = useState<string | null>(null);

  useEffect(() => {
    if (periodId) {
      loadPeriodDetail();
    }
  }, [periodId]);

  const loadPeriodDetail = async () => {
    try {
      setLoading(true);
      const detail = await HistoryServiceAleluya.getPeriodDetail(periodId!);
      setPeriodDetail(detail);
    } catch (error) {
      console.error('Error loading period detail:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle del período",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVoucher = async (employeeId: string, employeeName: string) => {
    try {
      setDownloadingVoucher(employeeId);
      
      toast({
        title: "Generando comprobante",
        description: `Preparando comprobante de ${employeeName}...`,
      });

      await HistoryServiceAleluya.generateVoucherPDF(employeeId, periodId!);
      
      toast({
        title: "Comprobante descargado",
        description: `Comprobante de ${employeeName} descargado exitosamente`,
      });
    } catch (error) {
      console.error('Error downloading voucher:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el comprobante",
        variant: "destructive",
      });
    } finally {
      setDownloadingVoucher(null);
    }
  };

  const handleCreateAdjustment = () => {
    navigate(`/app/payroll-history/${periodId}/adjust`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'original':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Original</Badge>;
      case 'con_ajuste':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Con ajuste</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!periodDetail) {
    return (
      <div className="p-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Período no encontrado</h2>
          <Button onClick={() => navigate('/app/payroll-history')}>
            Volver al historial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/payroll-history')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al historial</span>
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{periodDetail.period.period}</h1>
              <p className="text-gray-600">
                {new Date(periodDetail.period.startDate).toLocaleDateString('es-ES')} - {' '}
                {new Date(periodDetail.period.endDate).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {getStatusBadge(periodDetail.period.status)}
          <Button 
            onClick={handleCreateAdjustment}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Registrar ajuste</span>
          </Button>
        </div>
      </div>

      {/* ✅ NUEVO: Desglose de totales consolidados */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900">
            <Receipt className="h-5 w-5" />
            <span>Desglose de Liquidación</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Salarios Base:</span>
                <span className="font-bold text-blue-900">
                  {formatCurrency(periodDetail.summary.salarioBase)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Novedades:</span>
                <span className="font-bold text-green-600">
                  + {formatCurrency(periodDetail.summary.novedades)}
                </span>
              </div>
              <div className="border-t border-blue-300 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-900">Total Devengado:</span>
                  <span className="font-bold text-lg text-blue-900">
                    {formatCurrency(periodDetail.summary.totalDevengado)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-700">Total Deducciones:</span>
                <span className="font-bold text-red-600">
                  - {formatCurrency(periodDetail.summary.totalDeducciones)}
                </span>
              </div>
              <div className="border-t border-blue-300 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-900">Total Neto:</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(periodDetail.summary.totalNeto)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen del período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devengado</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(periodDetail.summary.totalDevengado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calculator className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deducciones</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(periodDetail.summary.totalDeducciones)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Neto</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(periodDetail.summary.totalNeto)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Costo Total</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(periodDetail.summary.costoTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empleados liquidados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Empleados Liquidados ({periodDetail.employees.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-medium text-gray-900">Empleado</th>
                  <th className="text-right p-4 font-medium text-gray-900">Salario Base</th>
                  <th className="text-right p-4 font-medium text-gray-900">Novedades</th>
                  <th className="text-right p-4 font-medium text-gray-900">Total Bruto</th>
                  <th className="text-right p-4 font-medium text-gray-900">Neto</th>
                  <th className="text-center p-4 font-medium text-gray-900">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {periodDetail.employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(employee.baseSalary)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-medium ${employee.novedades >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {employee.novedades >= 0 ? '+' : ''}{formatCurrency(employee.novedades)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(employee.grossPay)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium text-green-600">
                        {formatCurrency(employee.netPay)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadVoucher(employee.id, employee.name)}
                        disabled={downloadingVoucher === employee.id}
                        className="flex items-center space-x-2"
                      >
                        {downloadingVoucher === employee.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>
                          {downloadingVoucher === employee.id ? 'Generando...' : 'Descargar'}
                        </span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ✅ NUEVO: Novedades aplicadas */}
      {periodDetail.novedades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Novedades Aplicadas ({periodDetail.novedades.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {periodDetail.novedades.map((novedad) => (
                <div key={novedad.id} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{novedad.employeeName}</p>
                        <p className="text-sm text-gray-600">{novedad.concept}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-bold ${novedad.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {novedad.amount >= 0 ? '+' : ''}{formatCurrency(novedad.amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(novedad.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  
                  {novedad.observations && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-700">{novedad.observations}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de ajustes */}
      {periodDetail.adjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Historial de Ajustes ({periodDetail.adjustments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {periodDetail.adjustments.map((adjustment) => (
                <div key={adjustment.id} className="border rounded-lg p-4 bg-orange-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Calculator className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{adjustment.employeeName}</p>
                        <p className="text-sm text-gray-600">{adjustment.concept}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-bold ${adjustment.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {adjustment.amount >= 0 ? '+' : ''}{formatCurrency(adjustment.amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(adjustment.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  
                  {adjustment.observations && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-700">{adjustment.observations}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayrollHistoryDetailPage;
