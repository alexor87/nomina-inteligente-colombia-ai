
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, X, Calculator, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PayrollEmployeeCalculationService, EmployeeRecalculationInput } from '@/services/PayrollEmployeeCalculationService';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';

/**
 * ✅ PÁGINA DE EDICIÓN DE PERÍODO - UNIFICADA CON MOTOR ROBUSTO
 * Usa PayrollEmployeeCalculationService para cálculos precisos
 * Integra novedades y validaciones del sistema de liquidación
 */
export const PeriodEditPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [period, setPeriod] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [calculatedValues, setCalculatedValues] = useState<Record<string, any>>({});

  // ✅ INTEGRACIÓN: Hook de novedades unificado
  const {
    novedades,
    isLoading: isLoadingNovedades,
    getEmployeeNovedadesList
  } = usePayrollNovedadesUnified({ 
    companyId: period?.company_id, 
    periodId: periodId || '', 
    enabled: !!period?.company_id && !!periodId 
  });

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

  // ✅ UNIFICADO: Usar motor robusto de cálculo en lugar de lógica manual
  const getCalculatedTotals = (employee: any) => {
    const employeeId = employee.id;
    
    // Si hay valores calculados, usarlos. Si no, usar valores actuales del empleado
    const calculated = calculatedValues[employeeId];
    if (calculated) {
      return {
        totalDevengado: calculated.totalDevengado,
        netoAPagar: calculated.netoPagado,
        ibc: calculated.ibc,
        auxilioTransporte: calculated.auxilioTransporte,
        saludEmpleado: calculated.saludEmpleado,
        pensionEmpleado: calculated.pensionEmpleado
      };
    }
    
    // Fallback a valores actuales del empleado
    return {
      totalDevengado: employee.total_devengado || 0,
      netoAPagar: employee.neto_pagado || 0,
      ibc: employee.ibc || 0,
      auxilioTransporte: employee.auxilio_transporte || 0,
      saludEmpleado: employee.salud_empleado || 0,
      pensionEmpleado: employee.pension_empleado || 0
    };
  };

  // ✅ NUEVO: Recalcular empleado individual usando motor robusto
  const recalculateEmployee = async (employeeId: string) => {
    if (!period) return;
    
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;
    
    try {
      // Obtener novedades del empleado
      const employeeNovedades = await getEmployeeNovedadesList(employeeId);
      
      // Usar salario editado o salario base actual
      const currentSalary = editedValues[`${employeeId}_salario_base`] ?? employee.salario_base;
      
      const input: EmployeeRecalculationInput = {
        employeeId,
        baseSalary: currentSalary,
        periodType: period.tipo_periodo,
        fechaInicio: period.fecha_inicio,
        fechaFin: period.fecha_fin,
        novedades: employeeNovedades,
        year: '2025'
      };
      
      const result = await PayrollEmployeeCalculationService.recalculateEmployee(input);
      
      // Actualizar valores calculados
      setCalculatedValues(prev => ({
        ...prev,
        [employeeId]: result
      }));
      
      console.log('✅ Empleado recalculado:', employeeId, result);
      
    } catch (error) {
      console.error('❌ Error recalculando empleado:', error);
      toast({
        title: "Error en recálculo",
        description: `No se pudo recalcular el empleado ${employee.nombre}`,
        variant: "destructive"
      });
    }
  };

  // ✅ NUEVO: Recalcular todos los empleados
  const recalculateAllEmployees = async () => {
    if (!period || employees.length === 0) return;
    
    setIsRecalculating(true);
    try {
      console.log('🔄 Recalculando todos los empleados con motor robusto...');
      
      const inputs: EmployeeRecalculationInput[] = [];
      
      for (const employee of employees) {
        const employeeNovedades = await getEmployeeNovedadesList(employee.id);
        const currentSalary = editedValues[`${employee.id}_salario_base`] ?? employee.salario_base;
        
        inputs.push({
          employeeId: employee.id,
          baseSalary: currentSalary,
          periodType: period.tipo_periodo,
          fechaInicio: period.fecha_inicio,
          fechaFin: period.fecha_fin,
          novedades: employeeNovedades,
          year: '2025'
        });
      }
      
      const results = await PayrollEmployeeCalculationService.recalculateMultipleEmployees(inputs);
      
      setCalculatedValues(results);
      
      toast({
        title: "✅ Recálculo completado",
        description: `Se recalcularon ${employees.length} empleados con el motor robusto`,
        className: "border-green-200 bg-green-50"
      });
      
      console.log('✅ Recálculo masivo completado:', results);
      
    } catch (error) {
      console.error('❌ Error en recálculo masivo:', error);
      toast({
        title: "Error",
        description: "No se pudieron recalcular todos los empleados",
        variant: "destructive"
      });
    } finally {
      setIsRecalculating(false);
    }
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

      // ✅ UNIFICADO: Aplicar cambios usando valores calculados del motor robusto
      for (const [employeeId, updates] of Object.entries(employeeUpdates)) {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
          // Usar valores calculados del motor robusto si están disponibles
          const calculatedTotals = getCalculatedTotals({ ...employee, ...updates });
          
          const { error } = await supabase
            .from('payrolls')
            .update({
              ...updates,
              total_devengado: calculatedTotals.totalDevengado,
              neto_pagado: calculatedTotals.netoAPagar,
              total_deducciones: calculatedTotals.totalDevengado - calculatedTotals.netoAPagar,
              ibc: calculatedTotals.ibc,
              auxilio_transporte: calculatedTotals.auxilioTransporte,
              salud_empleado: calculatedTotals.saludEmpleado,
              pension_empleado: calculatedTotals.pensionEmpleado,
              updated_at: new Date().toISOString()
            })
            .eq('id', employee.id);

          if (error) {
            throw error;
          }
        }
      }

      // ✅ UNIFICADO: Actualizar totales del período usando motor robusto
      const newTotalDevengado = employees.reduce((sum, emp) => {
        const totals = getCalculatedTotals({ ...emp, ...employeeUpdates[emp.id] });
        return sum + totals.totalDevengado;
      }, 0);

      const newTotalNeto = employees.reduce((sum, emp) => {
        const totals = getCalculatedTotals({ ...emp, ...employeeUpdates[emp.id] });
        return sum + totals.netoAPagar;
      }, 0);

      const newTotalDeducciones = newTotalDevengado - newTotalNeto;

      const { error: periodError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: newTotalDevengado,
          total_deducciones: newTotalDeducciones,
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
      setCalculatedValues({});
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
    navigate('/app/dashboard');
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={recalculateAllEmployees}
            disabled={isRecalculating || employees.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculando...' : 'Recalcular Todo'}
          </Button>
          {hasChanges && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setEditedValues({});
                setCalculatedValues({});
              }}
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
                    <th className="text-right p-2">IBC</th>
                    <th className="text-right p-2">Aux. Transporte</th>
                    <th className="text-right p-2">Deducciones</th>
                    <th className="text-right p-2">Total Devengado</th>
                    <th className="text-right p-2">Neto a Pagar</th>
                    <th className="text-right p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const totals = getCalculatedTotals(employee);
                    
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
                            className="w-24 text-right border rounded px-1 py-0.5 text-xs"
                            value={editedValues[`${employee.id}_salario_base`] ?? employee.salario_base}
                            onChange={(e) => {
                              handleValueChange(employee.id, 'salario_base', Number(e.target.value));
                              // Trigger recalculation when salary changes
                              setTimeout(() => recalculateEmployee(employee.id), 100);
                            }}
                          />
                        </td>
                        <td className="p-2 text-right font-medium text-purple-600">
                          {formatCurrency(totals.ibc)}
                        </td>
                        <td className="p-2 text-right font-medium text-blue-600">
                          {formatCurrency(totals.auxilioTransporte)}
                        </td>
                        <td className="p-2 text-right font-medium text-red-600">
                          {formatCurrency(totals.totalDevengado - totals.netoAPagar)}
                        </td>
                        <td className="p-2 text-right font-medium text-green-600">
                          {formatCurrency(totals.totalDevengado)}
                        </td>
                        <td className="p-2 text-right font-bold text-blue-600">
                          {formatCurrency(totals.netoAPagar)}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => recalculateEmployee(employee.id)}
                            className="text-xs"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
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
