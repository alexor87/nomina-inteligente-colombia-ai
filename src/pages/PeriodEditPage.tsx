
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, X, Calculator } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * ✅ PÁGINA DE EDICIÓN DE PERÍODO - FASE 3 CRÍTICA
 * Implementa funcionalidad real de edición
 */
export const PeriodEditPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [period, setPeriod] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (periodId) {
      loadPeriodData();
    }
  }, [periodId]);

  const loadPeriodData = async () => {
    try {
      setIsLoading(true);
      
      // Cargar datos del período
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError) {
        throw periodError;
      }

      // Cargar empleados del período
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees!inner(id, nombre, apellido, cargo)
        `)
        .eq('period_id', periodId);

      if (payrollError) {
        console.warn('No se encontraron payrolls para este período');
      }

      setPeriod(periodData);
      setEmployees(payrollData || []);
      
    } catch (error) {
      console.error('Error cargando datos del período:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (employeeId: string, field: string, value: number) => {
    setEditedValues(prev => ({
      ...prev,
      [`${employeeId}_${field}`]: value
    }));
  };

  const calculateTotals = (employee: any) => {
    const salarioBase = editedValues[`${employee.id}_salario_base`] ?? employee.salario_base;
    const horasExtra = editedValues[`${employee.id}_horas_extra`] ?? employee.horas_extra ?? 0;
    const bonificaciones = editedValues[`${employee.id}_bonificaciones`] ?? employee.bonificaciones ?? 0;
    const deducciones = editedValues[`${employee.id}_total_deducciones`] ?? employee.total_deducciones ?? 0;
    
    const totalDevengado = Number(salarioBase) + Number(horasExtra) + Number(bonificaciones);
    const netoAPagar = totalDevengado - Number(deducciones);
    
    return { totalDevengado, netoAPagar };
  };

  const handleSave = async () => {
    if (Object.keys(editedValues).length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Agrupar cambios por empleado
      const employeeUpdates: Record<string, any> = {};
      
      Object.entries(editedValues).forEach(([key, value]) => {
        const [employeeId, field] = key.split('_');
        if (!employeeUpdates[employeeId]) {
          employeeUpdates[employeeId] = { id: employeeId };
        }
        employeeUpdates[employeeId][field] = value;
      });

      // Aplicar cambios a cada empleado
      for (const [employeeId, updates] of Object.entries(employeeUpdates)) {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
          const totals = calculateTotals({ ...employee, ...updates });
          
          const { error } = await supabase
            .from('payrolls')
            .update({
              ...updates,
              total_devengado: totals.totalDevengado,
              neto_pagado: totals.netoAPagar,
              updated_at: new Date().toISOString()
            })
            .eq('id', employee.id);

          if (error) {
            throw error;
          }
        }
      }

      // Actualizar totales del período
      const newTotalDevengado = employees.reduce((sum, emp) => {
        const totals = calculateTotals({ ...emp, ...employeeUpdates[emp.id] });
        return sum + totals.totalDevengado;
      }, 0);

      const newTotalNeto = employees.reduce((sum, emp) => {
        const totals = calculateTotals({ ...emp, ...employeeUpdates[emp.id] });
        return sum + totals.netoAPagar;
      }, 0);

      const { error: periodError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: newTotalDevengado,
          total_neto: newTotalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (periodError) {
        throw periodError;
      }

      toast({
        title: "✅ Cambios guardados",
        description: "Los cambios se han guardado exitosamente",
        className: "border-green-200 bg-green-50"
      });

      setEditedValues({});
      await loadPeriodData();
      
    } catch (error) {
      console.error('Error guardando cambios:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/app/payroll-history');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-gray-600">Cargando datos del período...</p>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Período no encontrado</p>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al historial
        </Button>
      </div>
    );
  }

  const hasChanges = Object.keys(editedValues).length > 0;

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
              Editar Período
            </h1>
            <p className="text-gray-600">{period.periodo}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEditedValues({})}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar cambios
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      {/* Información del período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Información del Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <p className="font-medium capitalize">{period.tipo_periodo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              <p className="font-medium capitalize">{period.estado}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Empleados</p>
              <p className="font-medium">{employees.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fechas</p>
              <p className="font-medium">
                {new Date(period.fecha_inicio).toLocaleDateString('es-ES')} - {' '}
                {new Date(period.fecha_fin).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de empleados editable */}
      {employees.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Empleados del Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Empleado</th>
                    <th className="text-right p-2">Salario Base</th>
                    <th className="text-right p-2">Horas Extra</th>
                    <th className="text-right p-2">Bonificaciones</th>
                    <th className="text-right p-2">Deducciones</th>
                    <th className="text-right p-2">Total Devengado</th>
                    <th className="text-right p-2">Neto a Pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const totals = calculateTotals(employee);
                    
                    return (
                      <tr key={employee.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">
                              {employee.employees?.nombre} {employee.employees?.apellido}
                            </p>
                            <p className="text-xs text-gray-500">{employee.employees?.cargo}</p>
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            className="w-20 text-right border rounded px-1 py-0.5 text-xs"
                            value={editedValues[`${employee.id}_salario_base`] ?? employee.salario_base}
                            onChange={(e) => handleValueChange(employee.id, 'salario_base', Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            className="w-20 text-right border rounded px-1 py-0.5 text-xs"
                            value={editedValues[`${employee.id}_horas_extra`] ?? employee.horas_extra ?? 0}
                            onChange={(e) => handleValueChange(employee.id, 'horas_extra', Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            className="w-20 text-right border rounded px-1 py-0.5 text-xs"
                            value={editedValues[`${employee.id}_bonificaciones`] ?? employee.bonificaciones ?? 0}
                            onChange={(e) => handleValueChange(employee.id, 'bonificaciones', Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            className="w-20 text-right border rounded px-1 py-0.5 text-xs"
                            value={editedValues[`${employee.id}_total_deducciones`] ?? employee.total_deducciones ?? 0}
                            onChange={(e) => handleValueChange(employee.id, 'total_deducciones', Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2 text-right font-medium text-green-600">
                          {formatCurrency(totals.totalDevengado)}
                        </td>
                        <td className="p-2 text-right font-bold text-blue-600">
                          {formatCurrency(totals.netoAPagar)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            <p>No hay empleados en este período</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeriodEditPage;
