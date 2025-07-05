
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Users, Calculator } from 'lucide-react';
import { PayrollLiquidationTable } from '@/components/payroll/liquidation/PayrollLiquidationTable';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { format } from 'date-fns';

const PayrollLiquidationPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const {
    employees,
    isLoading,
    isLiquidating,
    loadEmployees,
    removeEmployee,
    liquidatePayroll
  } = usePayrollLiquidation();

  const handleLoadEmployees = () => {
    if (!startDate || !endDate) {
      alert('Por favor selecciona las fechas del período');
      return;
    }
    loadEmployees(startDate, endDate);
  };

  const handleLiquidate = async () => {
    if (employees.length === 0) {
      alert('No hay empleados para liquidar');
      return;
    }

    const confirmMessage = `¿Deseas cerrar este periodo de nómina y generar los comprobantes de pago?\n\nPeríodo: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}\nEmpleados: ${employees.length}`;
    
    if (window.confirm(confirmMessage)) {
      await liquidatePayroll(startDate, endDate);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Liquidación de Nómina</h1>
      </div>

      {/* Formulario de fechas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Seleccionar Período</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="startDate">Fecha desde</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha hasta</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleLoadEmployees} disabled={isLoading}>
              <Users className="h-4 w-4 mr-2" />
              {isLoading ? 'Cargando...' : 'Cargar Empleados'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de empleados */}
      {employees.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Empleados a Liquidar ({employees.length})</CardTitle>
              <Button 
                onClick={handleLiquidate}
                disabled={isLiquidating || employees.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLiquidating ? 'Liquidando...' : 'Liquidar Nómina'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <PayrollLiquidationTable
              employees={employees}
              startDate={startDate}
              endDate={endDate}
              onRemoveEmployee={removeEmployee}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayrollLiquidationPage;
