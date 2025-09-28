export interface ExecutableAction {
  id: string;
  type: 'send_voucher' | 'search_employee' | 'generate_report' | 'view_details';
  label: string;
  description?: string;
  parameters: Record<string, any>;
  requiresConfirmation?: boolean;
  icon?: string;
}

export interface ActionExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface VoucherSendAction extends ExecutableAction {
  type: 'send_voucher';
  parameters: {
    employeeId: string;
    employeeName: string;
    email?: string;
    periodId?: string;
    periodName?: string;
  };
}

export interface SearchEmployeeAction extends ExecutableAction {
  type: 'search_employee';
  parameters: {
    query: string;
    filter?: 'name' | 'position' | 'department' | 'salary';
  };
}

export interface ViewDetailsAction extends ExecutableAction {
  type: 'view_details';
  parameters: {
    entityType: 'employee' | 'period' | 'payroll';
    entityId: string;
    entityName: string;
  };
}

export type MayaExecutableAction = VoucherSendAction | SearchEmployeeAction | ViewDetailsAction;