
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { PayrollHistoryDetails as PayrollHistoryDetailsType } from '@/types/payroll-history';
import { formatCurrency } from '@/lib/utils';
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  FileText, 
  Download, 
  RefreshCw,
  AlertCircle 
} from 'lucide-react';

export const PayrollHistoryDetails = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<PayrollHistoryDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = async () => {
    if (!periodId) return;

    try {
      setIsLoading(true);
      setError(null);
      console.log(`🔍 Cargando detalles del período: ${periodId}`);
      
      const periodDetails = await PayrollHistoryService.getPeriodDetails(periodId);
      
      if (periodDetails) {
        setDetails(periodDetails);
        console.log(`✅ Detalles cargados: ${periodDetails.employees.length} empleados`);
      } else {
        setError('No se pudieron cargar los detalles del período');
      }
      
    } catch (error) {
      console.error('❌ Error cargando detalles:', error);
      setError('Error cargando los detalles del período');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    if (!periodId) return;

    try {
      setIsRefreshing(true);
      console.log('🔄 Forzando regeneración de datos...');
      
      const result = await PayrollHistoryService.forceRegenerateHistoricalData(periodId);
      
      if (result.success) {
        console.log('✅ Regeneración exitosa, recargando...');
        await loadDetails();
      } else {
        setError(`Error en regeneración: ${result.message}`);
      }
      
    } catch (error) {
      console.error('❌ Error en regeneración forzada:', error);
      setError('Error regenerando datos');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [periodId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              Cargando detalles del período
            </h3>
            <p className="text-gray-600">
              Obteniendo información de empleados y liquidaciones...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center border-red-200">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error cargando detalles
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={loadDetails} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              
              <Button 
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Regenerar Datos
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Período no encontrado
          </h3>
          <Button onClick={() => navigate('/app/payroll-history')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al historial
          </Button>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cerrado':
        return 'bg-green-100 text-green-800';
      case 'borrador':
        return 'bg-yellow-100 text-yellow-800';
      case 'con_errores':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => navigate('/app/payroll-history')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Detalles del Período
              </h1>
              <p className="text-gray-600">{details.period.period}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge className={getStatusColor(details.period.status)}>
              {details.period.status === 'cerrado' ? 'Cerrado' : 
               details.period.status === 'borrador' ? 'Borrador' : 
               'Con Errores'}
            </Badge>
            
            <Button 
              onClick={loadDetails}
              variant="outline"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualizar
            </Button>
          </div>
        </div>

        {/* Información del Período */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Fechas</p>
              <p className="font-medium">
                {details.period.startDate} - {details.period.endDate}
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Tipo</p>
              <p className="font-medium capitalize">{details.period.type}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Empleados</p>
              <p className="font-medium">{details.employees.length}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Estado de Pago</p>
              <Badge variant="outline" className="text-orange-700 border-orange-200">
                {details.period.paymentStatus || 'Pendiente'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Resumen Financiero */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Devengado</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(details.summary.totalDevengado)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-100 rounded-full">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deducciones</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(details.summary.totalDeducciones)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Neto</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(details.summary.totalNeto)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Costo Total</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(details.summary.costoTotal)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Lista de Empleados */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Empleados ({details.employees.length})
            </h3>
            
            {details.employees.length === 0 && (
              <Button 
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar Datos
              </Button>
            )}
          </div>

          {details.employees.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay empleados en este período
              </h3>
              <p className="text-gray-600 mb-4">
                Los datos pueden necesitar sincronización. Haz clic en "Sincronizar Datos" para cargar la información.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-gray-900">Empleado</th>
                    <th className="text-left p-3 font-medium text-gray-900">Cargo</th>
                    <th className="text-right p-3 font-medium text-gray-900">Devengado</th>
                    <th className="text-right p-3 font-medium text-gray-900">Deducciones</th>
                    <th className="text-right p-3 font-medium text-gray-900">Neto</th>
                    <th className="text-center p-3 font-medium text-gray-900">Estado</th>
                    <th className="text-center p-3 font-medium text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {details.employees.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{employee.name}</div>
                      </td>
                      <td className="p-3 text-gray-600">{employee.position}</td>
                      <td className="p-3 text-right font-medium text-gray-900">
                        {formatCurrency(employee.grossPay)}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        {formatCurrency(employee.deductions)}
                      </td>
                      <td className="p-3 text-right font-medium text-green-600">
                        {formatCurrency(employee.netPay)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant="outline" 
                          className={employee.paymentStatus === 'pagado' ? 
                            'text-green-700 border-green-200' : 
                            'text-orange-700 border-orange-200'
                          }
                        >
                          {employee.paymentStatus === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Aquí iría la lógica para descargar el comprobante PDF
                            console.log(`Descargando comprobante para: ${employee.name}`);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Archivos y Documentos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Archivos y Documentos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Comprobantes de Pago</h4>
              <p className="text-sm text-gray-600 mb-3">
                {details.employees.length} comprobantes disponibles
              </p>
              <Button size="sm" variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Descargar Todos
              </Button>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Archivo PILA</h4>
              <p className="text-sm text-gray-600 mb-3">
                {details.files.pilaFile ? 'Disponible' : 'No generado'}
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                disabled={!details.files.pilaFile}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar PILA
              </Button>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Reportes</h4>
              <p className="text-sm text-gray-600 mb-3">
                {details.files.reports.length} reportes disponibles
              </p>
              <Button size="sm" variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Ver Reportes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
