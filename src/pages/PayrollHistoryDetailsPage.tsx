
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Users, DollarSign, Download, Edit } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';

/**
 * ✅ PÁGINA DE DETALLES DEL PERÍODO - FASE 3
 * Muestra información detallada de un período específico
 */
export const PayrollHistoryDetailsPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();

  // Por ahora mostrar una página básica - en el futuro se conectará con datos reales
  const mockPeriodData = {
    id: periodId,
    period: "1 - 15 Julio 2025",
    startDate: "2025-07-01",
    endDate: "2025-07-15",
    type: "quincenal" as const,
    status: "borrador" as const,
    employeesCount: 2,
    totalGrossPay: 1914001,
    totalNetPay: 1777255,
    totalDeductions: 136746,
    totalCost: 1914001,
    employerContributions: 392370.205,
    paymentStatus: "pendiente" as const,
    createdAt: "2025-07-03T04:35:13.929711+00:00",
    updatedAt: "2025-07-04T19:17:03.813483+00:00"
  };

  const handleBack = () => {
    navigate('/app/payroll-history');
  };

  const handleEdit = () => {
    navigate(`/app/period-edit/${periodId}`);
  };

  const handleExport = () => {
    console.log('Exportar período:', periodId);
  };

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
              Detalles del Período
            </h1>
            <p className="text-gray-600">{mockPeriodData.period}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {mockPeriodData.status === 'borrador' && (
            <Button size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Información del período */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <p className="font-medium capitalize">{mockPeriodData.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Estado</p>
              <p className="font-medium capitalize">{mockPeriodData.status}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fechas</p>
              <p className="font-medium">
                {new Date(mockPeriodData.startDate).toLocaleDateString('es-ES')} - {' '}
                {new Date(mockPeriodData.endDate).toLocaleDateString('es-ES')}
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
              {mockPeriodData.employeesCount}
            </div>
            <p className="text-xs text-gray-500">Empleados procesados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Estado de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600 capitalize">
              {mockPeriodData.paymentStatus}
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
                {formatCurrency(mockPeriodData.totalGrossPay)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Deducciones</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(mockPeriodData.totalDeductions)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Neto</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(mockPeriodData.totalNetPay)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Aportes Empleador</p>
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(mockPeriodData.employerContributions)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder para tabla de empleados */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados del Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Aquí se mostrará la lista de empleados y sus cálculos detallados</p>
            <p className="text-sm mt-2">Esta funcionalidad se implementará en una fase posterior</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollHistoryDetailsPage;
