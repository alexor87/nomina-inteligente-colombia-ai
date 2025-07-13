
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Calculator, Eye, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollEmployee } from '@/types/payroll';
import { useEmployeeNovedades } from '@/hooks/useEmployeeNovedades';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onRemoveEmployee,
  onEmployeeNovedadesChange
}) => {
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  // 🏖️ NUEVO: Hook para obtener novedades de empleados (incluyendo vacaciones)
  const { 
    novedades, 
    isLoading: novedadesLoading,
    refreshNovedades 
  } = useEmployeeNovedades(currentPeriodId || '');

  // 📊 NUEVO: Calcular totales incluyendo novedades
  const employeesWithNovedades = useMemo(() => {
    return employees.map(employee => {
      const employeeNovedades = novedades[employee.id] || [];
      const totalDevengos = employeeNovedades
        .filter(n => n.valor > 0)
        .reduce((sum, n) => sum + (n.valor || 0), 0);
      const totalDeducciones = employeeNovedades
        .filter(n => n.valor < 0)
        .reduce((sum, n) => sum + Math.abs(n.valor || 0), 0);

      const adjustedNetPay = employee.baseSalary + totalDevengos - totalDeducciones;

      return {
        ...employee,
        novedadesDevengos: totalDevengos,
        novedadesDeducciones: totalDeducciones,
        adjustedNetPay,
        novedadesCount: employeeNovedades.length,
        hasVacations: employeeNovedades.some(n => n.tipo_novedad === 'vacaciones')
      };
    });
  }, [employees, novedades]);

  const handleEdit = (employeeId: string, employee: any) => {
    setEditingEmployee(employeeId);
    setEditValues({
      workedDays: employee.workedDays || 30,
      extraHours: employee.extraHours || 0,
      disabilities: employee.disabilities || 0,
      bonuses: employee.bonuses || 0,
      absences: employee.absences || 0,
      transportAllowance: employee.transportAllowance || 0,
      additionalDeductions: employee.additionalDeductions || 0
    });
  };

  const handleSave = async (employeeId: string) => {
    try {
      await onEmployeeNovedadesChange(employeeId);
      setEditingEmployee(null);
      setEditValues({});
      // Refrescar novedades después de guardar
      await refreshNovedades();
    } catch (error) {
      console.error('Error saving employee changes:', error);
    }
  };

  const handleCancel = () => {
    setEditingEmployee(null);
    setEditValues({});
  };

  const updateEditValue = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditValues(prev => ({ ...prev, [field]: numValue }));
  };

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calculator className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay empleados cargados</h3>
          <p className="text-gray-600 text-center">
            Agrega empleados al período para comenzar la liquidación de nómina.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calcular totales generales
  const totals = employeesWithNovedades.reduce((acc, emp) => ({
    baseSalary: acc.baseSalary + emp.baseSalary,
    novedadesDevengos: acc.novedadesDevengos + emp.novedadesDevengos,
    novedadesDeducciones: acc.novedadesDeducciones + emp.novedadesDeducciones,
    adjustedNetPay: acc.adjustedNetPay + emp.adjustedNetPay,
    novedadesCount: acc.novedadesCount + emp.novedadesCount
  }), {
    baseSalary: 0,
    novedadesDevengos: 0,
    novedadesDeducciones: 0,
    adjustedNetPay: 0,
    novedadesCount: 0
  });

  return (
    <div className="space-y-4">
      {/* 📊 Resumen de totales */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resumen del Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-700 font-medium">Salarios Base</p>
              <p className="text-lg font-bold text-blue-900">{formatCurrency(totals.baseSalary)}</p>
            </div>
            <div>
              <p className="text-green-700 font-medium">Devengos Adicionales</p>
              <p className="text-lg font-bold text-green-800">{formatCurrency(totals.novedadesDevengos)}</p>
            </div>
            <div>
              <p className="text-red-700 font-medium">Deducciones</p>
              <p className="text-lg font-bold text-red-800">{formatCurrency(totals.novedadesDeducciones)}</p>
            </div>
            <div>
              <p className="text-purple-700 font-medium">Total a Pagar</p>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(totals.adjustedNetPay)}</p>
            </div>
          </div>
          <div className="mt-2 text-sm text-blue-700">
            Total de novedades procesadas: {totals.novedadesCount}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de empleados */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 font-medium text-gray-900 border-b">Empleado</th>
              <th className="text-right p-4 font-medium text-gray-900 border-b">Salario Base</th>
              <th className="text-center p-4 font-medium text-gray-900 border-b">Días</th>
              <th className="text-center p-4 font-medium text-gray-900 border-b">Novedades</th>
              <th className="text-right p-4 font-medium text-gray-900 border-b">Devengos Extra</th>
              <th className="text-right p-4 font-medium text-gray-900 border-b">Deducciones</th>
              <th className="text-right p-4 font-medium text-gray-900 border-b">Total a Pagar</th>
              <th className="text-center p-4 font-medium text-gray-900 border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {employeesWithNovedades.map((employee) => {
              const isEditing = editingEmployee === employee.id;
              
              return (
                <tr key={employee.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {employee.name}
                        {employee.hasVacations && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            🏖️ Vacaciones
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{employee.position}</div>
                    </div>
                  </td>
                  
                  <td className="p-4 text-right">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(employee.baseSalary)}
                    </span>
                  </td>
                  
                  <td className="p-4 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.workedDays || 30}
                        onChange={(e) => updateEditValue('workedDays', e.target.value)}
                        className="w-16 text-center"
                        min="1"
                        max="31"
                      />
                    ) : (
                      <span className="text-gray-700">{employee.workedDays || 30}</span>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge 
                        variant={employee.novedadesCount > 0 ? "default" : "outline"}
                        className={employee.novedadesCount > 0 ? "bg-green-100 text-green-800" : ""}
                      >
                        {employee.novedadesCount} {employee.novedadesCount === 1 ? 'novedad' : 'novedades'}
                      </Badge>
                      {novedadesLoading && (
                        <div className="text-xs text-gray-500">Cargando...</div>
                      )}
                    </div>
                  </td>

                  <td className="p-4 text-right">
                    <span className="text-green-600 font-medium">
                      {formatCurrency(employee.novedadesDevengos)}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <span className="text-red-600 font-medium">
                      {formatCurrency(employee.novedadesDeducciones)}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <span className="font-bold text-lg text-purple-600">
                      {formatCurrency(employee.adjustedNetPay)}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSave(employee.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(employee.id, employee)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRemoveEmployee(employee.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🚨 Advertencias */}
      {totals.novedadesCount === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">
              No se han procesado novedades para este período. Las vacaciones y otras novedades deberían aparecer automáticamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
