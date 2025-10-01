import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExecutableAction, ActionExecutionResult } from '../types/ExecutableAction';
import { VoucherSendDialog } from '@/components/payroll/modals/VoucherSendDialog';
import { PayrollEmployee } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, User, FileText, Eye, Loader2, Calendar } from 'lucide-react';
import { InlineSearchResults } from './inline/InlineSearchResults';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { EmployeeDetailsModal } from '@/components/employees/EmployeeDetailsModal';

interface MayaActionExecutorProps {
  actions: ExecutableAction[];
  onActionExecuted?: (action: ExecutableAction, result: ActionExecutionResult) => void;
}

export const MayaActionExecutor: React.FC<MayaActionExecutorProps> = ({ 
  actions, 
  onActionExecuted 
}) => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [voucherDialog, setVoucherDialog] = useState<{
    isOpen: boolean;
    employee: PayrollEmployee | null;
    period: any;
  }>({
    isOpen: false,
    employee: null,
    period: null
  });
  const [searchResults, setSearchResults] = useState<{
    employees: EmployeeWithStatus[];
    query: string;
  } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithStatus | null>(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const { toast } = useToast();

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'send_voucher': return Send;
      case 'send_voucher_all': return Send;
      case 'confirm_send_voucher': return Send;
      case 'expand_periods': return Calendar;
      case 'search_employee': return User;
      case 'view_details': return Eye;
      case 'generate_report': return FileText;
      default: return FileText;
    }
  };

  const executeAction = async (action: ExecutableAction) => {
    setIsExecuting(action.id);
    
    try {
      let result: ActionExecutionResult;
      
      // If action requires period confirmation, use new conversational flow
      if (action.requiresConfirmation && action.type === 'send_voucher') {
        result = await executeAutomatically(action);
      } else {
        result = await handleAction(action);
      }

      if (result.success) {
        // Handle search results inline
        if (action.type === 'search_employee' && result.data?.employees) {
          setSearchResults({
            employees: result.data.employees,
            query: result.data.query
          });
        }
        
        // Skip success toast for Maya expand_periods and search actions
        if (action.type !== 'expand_periods' && action.type !== 'search_employee') {
          toast({
            title: "✅ Acción ejecutada",
            description: result.message,
            className: "border-green-200 bg-green-50"
          });
        }
      } else {
        toast({
          title: "❌ Error ejecutando acción",
          description: result.message,
          variant: "destructive"
        });
      }

      onActionExecuted?.(action, result);
    } catch (error: any) {
      const result: ActionExecutionResult = {
        success: false,
        message: error.message || 'Error desconocido'
      };
      
      toast({
        title: "❌ Error ejecutando acción",
        description: result.message,
        variant: "destructive"
      });

      onActionExecuted?.(action, result);
    } finally {
      setIsExecuting(null);
    }
  };

  const executeAutomatically = async (action: ExecutableAction, periodId?: string): Promise<ActionExecutionResult> => {
    console.log('🤖 Executing action automatically:', action);
    
    // Include specific periodId if provided
    const actionToExecute = periodId ? {
      ...action,
      parameters: {
        ...action.parameters,
        periodId
      }
    } : action;
    
    const { data, error } = await supabase.functions.invoke('execute-maya-action', {
      body: { action: actionToExecute }
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: data.success,
      message: data.message,
      data: data.data
    };
  };

  const handleAction = async (action: ExecutableAction): Promise<ActionExecutionResult> => {
    switch (action.type) {
      case 'send_voucher':
        return await executeAutomatically(action);
      case 'send_voucher_all':
        return await executeAutomatically(action);
      case 'confirm_send_voucher':
        return await executeAutomatically(action);
      case 'expand_periods':
        return await handleExpandPeriods(action);
      case 'search_employee':
        return await executeSearchEmployee(action);
      case 'view_details':
        return await executeViewDetails(action);
      default:
        return {
          success: false,
          message: `Acción "${action.type}" no implementada`
        };
    }
  };

  const executeSendVoucher = async (action: ExecutableAction): Promise<ActionExecutionResult> => {
    const { employeeId, employeeName, email, periodId, periodName } = action.parameters;

    // Get employee data from database
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employeeData) {
      throw new Error(`No se pudo encontrar el empleado: ${employeeName}`);
    }

    // Get the most recent payroll for this employee if no period specified
    let periodData = null;
    if (periodId) {
      const { data } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();
      periodData = data;
    } else {
      // Get the most recent period
      const { data } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      periodData = data;
    }

    if (!periodData) {
      throw new Error('No se encontró información del período de nómina');
    }

    // Get payroll data
    const { data: payrollData } = await supabase
      .from('payrolls')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('period_id', periodData.id)
      .single();

    if (!payrollData) {
      throw new Error('No se encontró información de nómina para este empleado en el período especificado');
    }

    // Create PayrollEmployee object
    const employee: PayrollEmployee = {
      id: employeeData.id,
      name: `${employeeData.nombre} ${employeeData.apellido}`,
      position: employeeData.cargo || 'N/A',
      baseSalary: payrollData.salario_base || 0,
      transportAllowance: payrollData.auxilio_transporte || 0,
      extraHours: payrollData.horas_extra || 0,
      bonuses: payrollData.bonificaciones || 0,
      grossPay: payrollData.total_devengado || 0,
      healthDeduction: payrollData.salud_empleado || 0,
      pensionDeduction: payrollData.pension_empleado || 0,
      deductions: payrollData.total_deducciones || 0,
      netPay: payrollData.neto_pagado || 0,
      workedDays: payrollData.dias_trabajados || 30,
      disabilities: 0,
      absences: 0,
      status: 'valid',
      errors: [],
      employerContributions: 0,
      cedula: employeeData.cedula
    };

    const period = {
      startDate: periodData.fecha_inicio,
      endDate: periodData.fecha_fin,
      type: periodData.tipo_periodo || 'mensual'
    };

    // Open voucher dialog
    setVoucherDialog({
      isOpen: true,
      employee,
      period
    });

    return {
      success: true,
      message: `Preparando envío de comprobante para ${employeeName}`
    };
  };

  const executeSearchEmployee = async (action: ExecutableAction): Promise<ActionExecutionResult> => {
    const { query } = action.parameters;
    
    try {
      console.log('🔍 Executing employee search:', query);
      
      // Call the backend to search employees
      const { data, error } = await supabase.functions.invoke('execute-maya-action', {
        body: {
          action: {
            ...action,
            type: 'search_employee'
          }
        }
      });

      if (error) {
        console.error('❌ Error searching employees:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Error al buscar empleados');
      }

      console.log('✅ Search results:', data.data);

      // Return the results with employee data
      return {
        success: true,
        message: `${data.data?.employees?.length || 0} empleados encontrados`,
        data: {
          employees: data.data?.employees || [],
          query
        }
      };
    } catch (error: any) {
      console.error('❌ Search execution error:', error);
      return {
        success: false,
        message: error.message || 'Error al buscar empleados'
      };
    }
  };

  const executeViewDetails = async (action: ExecutableAction): Promise<ActionExecutionResult> => {
    // This would typically navigate to details view
    return {
      success: true,
      message: `Viendo detalles de: ${action.parameters.entityName}`
    };
  };

  const handleExpandPeriods = async (action: ExecutableAction): Promise<ActionExecutionResult> => {
    const { employeeId, employeeName } = action.parameters;
    
    try {
      // Fetch additional periods from database with company filter
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin, estado, company_id')
        .ilike('estado', '%cerrado%')
        .order('fecha_fin', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching periods:', error);
        throw error;
      }

      if (!periods || periods.length === 0) {
        return {
          success: false,
          message: 'No hay períodos adicionales disponibles'
        };
      }

      // Call Maya Intelligence with correct structure
      const { data, error: mayaError } = await supabase.functions.invoke('maya-intelligence', {
        body: {
          message: 'expand_periods_response',
          data: {
            employeeId,
            employeeName,
            periods
          }
        }
      });

      if (mayaError) {
        console.error('Maya intelligence error:', mayaError);
        throw mayaError;
      }

      console.log('Maya intelligence response:', data);

      return {
        success: true,
        message: `Períodos adicionales cargados para ${employeeName}`,
        data
      };
    } catch (error: any) {
      console.error('Error in handleExpandPeriods:', error);
      return {
        success: false,
        message: `Error cargando períodos: ${error.message || 'Desconocido'}`
      };
    }
  };

  const handlePeriodConfirmationDialog = async (periodId: string) => {
    // This function is no longer needed with conversational UI
    console.warn('handlePeriodConfirmationDialog called but modal is deprecated');
  };

  if (!Array.isArray(actions) || actions.length === 0) return null;

  const handleViewEmployeeDetails = (employee: EmployeeWithStatus) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetails(true);
  };

  const handleEditEmployee = (employee: EmployeeWithStatus) => {
    toast({
      title: "🚧 Función en desarrollo",
      description: "La edición de empleados estará disponible pronto",
    });
  };

  const handleSendEmployeeVoucher = (employee: EmployeeWithStatus) => {
    toast({
      title: "🚧 Función en desarrollo",
      description: "El envío de comprobantes desde búsqueda estará disponible pronto",
    });
  };

  return (
    <>
      {/* Resultados de búsqueda inline */}
      {searchResults && (
        <InlineSearchResults
          employees={searchResults.employees}
          query={searchResults.query}
          onViewDetails={handleViewEmployeeDetails}
          onEdit={handleEditEmployee}
          onSendVoucher={handleSendEmployeeVoucher}
        />
      )}

      <div className="space-y-2 mt-3">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Acciones disponibles:
        </p>
        {actions.map((action) => {
          const Icon = getActionIcon(action.type);
          const isLoading = isExecuting === action.id;
          
          return (
            <Button
              key={action.id}
              onClick={() => executeAction(action)}
              disabled={isLoading}
              variant={
                action.type === 'confirm_send_voucher'
                  ? 'default' 
                  : action.type === 'expand_periods'
                  ? 'outline' 
                  : 'outline'
              }
              size="sm"
              className={`w-full justify-start text-left h-auto p-3 ${
                action.type === 'confirm_send_voucher'
                  ? 'hover:bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' 
                  : action.type === 'expand_periods'
                  ? 'hover:bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                  : 'hover:bg-primary/5 border-primary/20'
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-primary" />
                )}
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{action.label}</div>
                  {action.description && (
                    <div className="text-xs text-gray-500 mt-1">{action.description}</div>
                  )}
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      <VoucherSendDialog
        isOpen={voucherDialog.isOpen}
        onClose={() => setVoucherDialog({ isOpen: false, employee: null, period: null })}
        employee={voucherDialog.employee}
        period={voucherDialog.period}
      />

      <EmployeeDetailsModal
        isOpen={showEmployeeDetails}
        onClose={() => {
          setShowEmployeeDetails(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
      />
    </>
  );
};