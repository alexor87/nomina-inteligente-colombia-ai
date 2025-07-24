import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { usePayrollLiquidationKISS } from '@/hooks/usePayrollLiquidationKISS';
import { Calendar, Users, DollarSign, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * ✅ PÁGINA KISS - LIQUIDACIÓN SIMPLIFICADA
 * - Interface mínima y clara
 * - Proceso lineal sin complejidades
 * - Estados simples: draft → closed
 */
export default function PayrollLiquidationPageKISS() {
  const { companyId } = useCurrentCompany();
  const [selectedPeriod, setSelectedPeriod] = useState({
    startDate: '',
    endDate: ''
  });
  
  const payrollHook = usePayrollLiquidationKISS(companyId || '');

  // Auto-generar fechas para quincena actual
  useEffect(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();

    let startDate: Date;
    let endDate: Date;

    if (day <= 15) {
      // Primera quincena
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month, 15);
    } else {
      // Segunda quincena
      startDate = new Date(year, month, 16);
      endDate = new Date(year, month + 1, 0); // Último día del mes
    }

    setSelectedPeriod({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    });
  }, []);

  const handleLoadEmployees = async () => {
    if (!selectedPeriod.startDate || !selectedPeriod.endDate) return;
    await payrollHook.loadEmployees(selectedPeriod.startDate, selectedPeriod.endDate);
  };

  const handleLiquidate = async () => {
    if (!selectedPeriod.startDate || !selectedPeriod.endDate) return;
    
    const confirmed = window.confirm(
      `¿Está seguro de liquidar la nómina para el período ${selectedPeriod.startDate} - ${selectedPeriod.endDate}?\n\n` +
      `Esta acción procesará ${payrollHook.employees.length} empleados y cerrará el período.`
    );
    
    if (confirmed) {
      await payrollHook.liquidatePayroll(selectedPeriod.startDate, selectedPeriod.endDate);
    }
  };

  const formatPeriodName = () => {
    if (!selectedPeriod.startDate || !selectedPeriod.endDate) return '';
    
    const start = new Date(selectedPeriod.startDate);
    const end = new Date(selectedPeriod.endDate);
    
    return `${start.getDate()} - ${end.getDate()} ${format(start, 'MMMM yyyy', { locale: es })}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const totalGrossPay = payrollHook.employees.reduce((sum, emp) => sum + emp.grossPay, 0);
  const totalNetPay = payrollHook.employees.reduce((sum, emp) => sum + emp.netPay, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Liquidación de Nómina KISS</h1>
          <p className="text-muted-foreground">Proceso simplificado y directo</p>
        </div>
      </div>

      {/* Información del proceso */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Proceso Simplificado KISS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700">
            ✅ Solo Edge Function para cálculos<br/>
            ✅ Estados simples: Borrador → Cerrado<br/>
            ✅ Sin servicios complejos<br/>
            ✅ Vouchers automáticos<br/>
          </p>
        </CardContent>
      </Card>

      {/* Selección de período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período de Liquidación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={selectedPeriod.startDate}
                onChange={(e) => setSelectedPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Fin</label>
              <input
                type="date"
                value={selectedPeriod.endDate}
                onChange={(e) => setSelectedPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          
          {selectedPeriod.startDate && selectedPeriod.endDate && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm">
                <strong>Período seleccionado:</strong> {formatPeriodName()}
              </p>
            </div>
          )}

          <Button 
            onClick={handleLoadEmployees}
            disabled={!selectedPeriod.startDate || !selectedPeriod.endDate || payrollHook.isLoading}
            className="w-full"
          >
            {payrollHook.isLoading ? 'Cargando...' : 'Cargar Empleados'}
          </Button>
        </CardContent>
      </Card>

      {/* Estado actual del período */}
      {payrollHook.currentPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Estado del Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-600">Período</p>
                <p className="font-semibold">{payrollHook.currentPeriod.periodo}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm text-green-600">Empleados</p>
                <p className="font-semibold">{payrollHook.employees.length}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-md">
                <p className="text-sm text-yellow-600">Estado</p>
                <p className="font-semibold capitalize">{payrollHook.currentPeriod.estado}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-md">
                <p className="text-sm text-purple-600">Acción</p>
                <p className="font-semibold">
                  {payrollHook.currentPeriod.estado === 'draft' ? 'Listo para liquidar' : 'Completado'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de empleados */}
      {payrollHook.employees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Empleados ({payrollHook.employees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {payrollHook.employees.map((employee) => (
                <div key={employee.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-sm text-gray-600">{employee.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(employee.baseSalary)}</p>
                    <p className="text-sm text-gray-600">{employee.workedDays} días</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen financiero */}
      {payrollHook.employees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-600">Total Devengado</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalGrossPay)}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-600">Total Neto</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalNetPay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón de liquidación */}
      {payrollHook.canProceedWithLiquidation && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <Button 
              onClick={handleLiquidate}
              disabled={payrollHook.isLiquidating}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {payrollHook.isLiquidating ? 'Liquidando...' : `Liquidar Nómina (${payrollHook.employees.length} empleados)`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Estado completado */}
      {payrollHook.currentPeriod?.estado === 'closed' && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Liquidación Completada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              ✅ El período <strong>{payrollHook.currentPeriod.periodo}</strong> ha sido liquidado exitosamente.<br/>
              ✅ Se procesaron <strong>{payrollHook.employees.length}</strong> empleados.<br/>
              ✅ Los vouchers han sido generados automáticamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}