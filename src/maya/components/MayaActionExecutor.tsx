import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExecutableAction, ActionExecutionResult } from '../types/ExecutableAction';
import { VoucherSendDialog } from '@/components/payroll/modals/VoucherSendDialog';
import { PayrollEmployee } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, User, FileText, Eye, Loader2 } from 'lucide-react';

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
  const { toast } = useToast();

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'send_voucher': return Send;
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
      
      // If action doesn't require confirmation, execute automatically
      if (!action.requiresConfirmation && action.type === 'send_voucher') {
        result = await executeAutomatically(action);
      } else {
        result = await handleAction(action);
      }

      if (result.success) {
        toast({
          title: "✅ Acción ejecutada",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
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

  const executeAutomatically = async (action: ExecutableAction): Promise<ActionExecutionResult> => {
    console.log('🤖 Executing action automatically:', action);
    
    const { data, error } = await supabase.functions.invoke('execute-maya-action', {
      body: { action }
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
        return await executeSendVoucher(action);
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
    // This would typically navigate or show results
    return {
      success: true,
      message: `Búsqueda de empleados: "${action.parameters.query}"`
    };
  };

  const executeViewDetails = async (action: ExecutableAction): Promise<ActionExecutionResult> => {
    // This would typically navigate to details view
    return {
      success: true,
      message: `Viendo detalles de: ${action.parameters.entityName}`
    };
  };

  if (!Array.isArray(actions) || actions.length === 0) return null;

  return (
    <>
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
              variant="outline"
              size="sm"
              className="w-full justify-start text-left h-auto p-3 hover:bg-primary/5 border-primary/20"
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
    </>
  );
};