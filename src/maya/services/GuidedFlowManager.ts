import { GuidedFlow, FlowState, FlowType, ValidationRule } from '../types/GuidedFlow';
import { employeeManagementFlow } from '../flows/employeeManagementFlow';
import { payrollCalculationFlow } from '../flows/payrollCalculationFlow';

export class GuidedFlowManager {
  private static instance: GuidedFlowManager;
  private flows: Map<FlowType, GuidedFlow> = new Map();
  private activeFlows: Map<string, FlowState> = new Map();

  private constructor() {
    // Register all available flows
    this.registerFlow(employeeManagementFlow);
    this.registerFlow(payrollCalculationFlow);
  }

  static getInstance(): GuidedFlowManager {
    if (!GuidedFlowManager.instance) {
      GuidedFlowManager.instance = new GuidedFlowManager();
    }
    return GuidedFlowManager.instance;
  }

  registerFlow(flow: GuidedFlow): void {
    this.flows.set(flow.id, flow);
    console.log(`✅ Flow registered: ${flow.name}`);
  }

  startFlow(flowId: FlowType): FlowState {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    const flowState: FlowState = {
      flowId,
      currentStep: flow.initialStep,
      accumulatedData: {},
      history: [],
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };

    const sessionId = `${flowId}_${Date.now()}`;
    this.activeFlows.set(sessionId, flowState);

    console.log(`🚀 Flow started: ${flow.name}`, flowState);
    return flowState;
  }

  getCurrentStep(flowState: FlowState): any {
    const flow = this.flows.get(flowState.flowId);
    if (!flow) return null;

    const step = flow.steps[flowState.currentStep];
    if (!step) return null;

    // Interpolate message if it's a function
    const message = typeof step.message === 'function' 
      ? step.message(flowState.accumulatedData)
      : step.message;

    // Process quick replies - handle both static arrays and dynamic functions
    let quickReplies = typeof step.quickReplies === 'function'
      ? step.quickReplies(flowState.accumulatedData)
      : step.quickReplies;

    // Further process quick replies to replace 'custom' values with actual dates
    quickReplies = quickReplies?.map(reply => {
      if (reply.value === 'custom') return reply;
      // For date quick replies, ensure they have current date
      if (step.id === 'start_date' && reply.label === '📅 Hoy') {
        return {
          ...reply,
          value: new Date().toISOString().split('T')[0]
        };
      }
      return reply;
    });

    return {
      ...step,
      message,
      quickReplies
    };
  }

  async advance(
    flowState: FlowState, 
    userInput: string
  ): Promise<{ 
    flowState: FlowState; 
    currentStep: any; 
    validationError?: string 
  }> {
    const flow = this.flows.get(flowState.flowId);
    if (!flow) {
      throw new Error(`Flow ${flowState.flowId} not found`);
    }

    const currentStep = flow.steps[flowState.currentStep];
    if (!currentStep) {
      throw new Error(`Step ${flowState.currentStep} not found in flow ${flowState.flowId}`);
    }

    // Validate input if step has validation rules
    if (currentStep.validationRules && userInput !== 'cancel') {
      const validationError = this.validateInput(userInput, currentStep.validationRules);
      if (validationError) {
        return {
          flowState,
          currentStep: this.getCurrentStep(flowState),
          validationError
        };
      }
    }

    // Store data from current step
    if (userInput && userInput !== 'cancel' && currentStep.type !== 'greeting') {
      // Map step IDs to data keys
      const dataKey = currentStep.id;
      flowState.accumulatedData[dataKey] = userInput;
    }

    // Add current step to history
    flowState.history.push(flowState.currentStep);

    // Determine next step
    const nextStepId = typeof currentStep.nextStep === 'function'
      ? currentStep.nextStep(flowState.accumulatedData, userInput)
      : currentStep.nextStep;

    flowState.currentStep = nextStepId;
    flowState.lastUpdatedAt = new Date().toISOString();

    console.log(`➡️ Advanced to step: ${nextStepId}`, {
      data: flowState.accumulatedData,
      history: flowState.history
    });

    return {
      flowState,
      currentStep: this.getCurrentStep(flowState)
    };
  }

  goBack(flowState: FlowState): FlowState | null {
    if (flowState.history.length === 0) {
      return null;
    }

    const previousStep = flowState.history.pop();
    if (!previousStep) return null;

    flowState.currentStep = previousStep;
    flowState.lastUpdatedAt = new Date().toISOString();

    console.log(`⬅️ Went back to step: ${previousStep}`);
    return flowState;
  }

  cancelFlow(flowState: FlowState): void {
    const sessionId = Array.from(this.activeFlows.entries())
      .find(([_, state]) => state === flowState)?.[0];
    
    if (sessionId) {
      this.activeFlows.delete(sessionId);
      console.log(`❌ Flow cancelled: ${flowState.flowId}`);
    }
  }

  completeFlow(flowState: FlowState): void {
    const sessionId = Array.from(this.activeFlows.entries())
      .find(([_, state]) => state === flowState)?.[0];
    
    if (sessionId) {
      this.activeFlows.delete(sessionId);
      console.log(`✅ Flow completed: ${flowState.flowId}`, {
        data: flowState.accumulatedData,
        duration: new Date().getTime() - new Date(flowState.startedAt).getTime()
      });
    }
  }

  private validateInput(input: string, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!input || input.trim() === '') {
            return rule.message;
          }
          break;

        case 'minLength':
          if (input.length < rule.value) {
            return rule.message;
          }
          break;

        case 'maxLength':
          if (input.length > rule.value) {
            return rule.message;
          }
          break;

        case 'min':
          if (Number(input) < rule.value) {
            return rule.message;
          }
          break;

        case 'max':
          if (Number(input) > rule.value) {
            return rule.message;
          }
          break;

        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
            return rule.message;
          }
          break;

        case 'pattern':
          if (!rule.value.test(input)) {
            return rule.message;
          }
          break;

        case 'custom':
          if (rule.validator && !rule.validator(input)) {
            return rule.message;
          }
          break;
      }
    }

    return null;
  }

  async executeFlowAction(flowState: FlowState): Promise<any> {
    console.log(`🎯 Executing flow action for ${flowState.flowId}`, flowState.accumulatedData);
    
    try {
      // Check if this is a loading step for employee count
      if (flowState.currentStep === 'loading_employees') {
        const employeeCount = await this.loadEmployeeCount(flowState.accumulatedData);
        flowState.accumulatedData.employee_count = employeeCount;
        
        return {
          success: true,
          employee_count: employeeCount
        };
      }

      // Check if this is a loading step for current period
      if (flowState.currentStep === 'current_period_loading') {
        const periodInfo = await this.loadCurrentPeriod(flowState.accumulatedData);
        flowState.accumulatedData.selected_period_id = periodInfo.id;
        flowState.accumulatedData.period_name = periodInfo.name;
        flowState.accumulatedData.current_period = periodInfo;
        
        return {
          success: true,
          period: periodInfo
        };
      }

      // Check if this is a loading step for periods
      if (flowState.currentStep === 'period_list_loading') {
        const periods = await this.loadPayrollPeriods(flowState.accumulatedData);
        flowState.accumulatedData.available_periods = periods;
        
        return {
          success: true,
          period_count: periods.length,
          periods
        };
      }
      
      switch (flowState.flowId) {
        case FlowType.EMPLOYEE_CREATE:
          return await this.executeEmployeeCreation(flowState.accumulatedData);
        
        case FlowType.PAYROLL_CALCULATE:
          return await this.executePayrollCalculation(flowState.accumulatedData);
        
        default:
          throw new Error(`No executor for flow type: ${flowState.flowId}`);
      }
    } catch (error) {
      console.error('❌ Flow execution failed:', error);
      throw error;
    }
  }

  private async loadEmployeeCount(data: Record<string, any>): Promise<number> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return 0;

    const employeeSelection = data.employee_selection;
    
    let query = supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id);

    // Filtrar según la selección
    if (employeeSelection === 'all_active') {
      query = query.eq('estado', 'activo');
    } else if (employeeSelection === 'new_employees') {
      // Empleados ingresados en los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query
        .eq('estado', 'activo')
        .gte('fecha_ingreso', thirtyDaysAgo.toISOString().split('T')[0]);
    }

    const { count } = await query;
    return count || 0;
  }

  private async loadPayrollPeriods(data: Record<string, any>): Promise<any[]> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return [];

    const { data: periods } = await supabase
      .from('payroll_periods_real')
      .select('id, periodo, tipo_periodo, fecha_inicio, fecha_fin, estado')
      .eq('company_id', profile.company_id)
      .in('estado', ['borrador', 'abierto'])
      .order('fecha_inicio', { ascending: false })
      .limit(10);

    return periods || [];
  }

  private async loadCurrentPeriod(data: Record<string, any>): Promise<any> {
    const { PayrollDomainService } = await import('@/services/PayrollDomainService');
    
    const result = await PayrollDomainService.detectCurrentPeriodSituation();
    
    if (!result.currentPeriod) {
      throw new Error('No hay un período activo. Por favor crea un período desde el módulo de nómina.');
    }
    
    return {
      id: result.currentPeriod.id,
      name: result.currentPeriod.periodo,
      tipo_periodo: result.currentPeriod.tipo_periodo,
      fecha_inicio: result.currentPeriod.fecha_inicio,
      fecha_fin: result.currentPeriod.fecha_fin,
      estado: result.currentPeriod.estado
    };
  }

  private async executeEmployeeCreation(data: Record<string, any>): Promise<any> {
    const { EmployeeCRUDService } = await import('@/services/EmployeeCRUDService');
    
    // Map flow data to EmployeeCRUDService format
    const employeeData: any = {
      cedula: data.document_number,
      tipoDocumento: data.document_type,
      nombre: data.first_name,
      segundoNombre: data.second_name_input || undefined,
      apellido: data.last_name,
      salarioBase: Number(data.salary),
      tipoContrato: data.contract_type === 'indefinido' ? 'indefinido' : 
                    data.contract_type === 'fijo' ? 'fijo' : 
                    data.contract_type === 'obra_labor' ? 'obra_labor' : 'aprendizaje',
      fechaIngreso: data.start_date,
      periodicidadPago: data.payment_frequency === 'mensual' ? 'mensual' : 'quincenal',
      estado: 'activo',
      tipoJornada: 'completa',
      
      // Optional fields
      email: data.email_input || undefined,
      telefono: data.phone_input || undefined,
      cargo: data.position_input || undefined,
      nivelRiesgoArl: data.arl_level_select || 'I',
      banco: data.bank_select || undefined,
      tipoCuenta: data.account_type_select || 'ahorros',
      numeroCuenta: data.account_number_input || undefined,
      eps: data.eps_input || undefined,
      afp: data.afp_input || undefined,
      arl: data.arl_input || undefined
    };
    
    console.log('📤 Creating employee with data:', employeeData);
    
    // Call CRUD service
    const createdEmployee = await EmployeeCRUDService.create(employeeData);
    
    console.log('✅ Employee created:', createdEmployee);
    
    return {
      success: true,
      employeeId: createdEmployee.id,
      employeeName: `${createdEmployee.nombre} ${createdEmployee.apellido}`,
      data: createdEmployee
    };
  }

  private async executePayrollCalculation(data: Record<string, any>): Promise<any> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No se encontró la empresa del usuario');

      // Get period information
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', data.selected_period_id)
        .single();

      if (!period) throw new Error('No se encontró el período de nómina');

      // ✅ USAR SERVICIO DEL MANUAL: PayrollLiquidationService
      const { PayrollLiquidationService } = await import('@/services/PayrollLiquidationService');
      
      console.log('🚀 [MAYA] Cargando empleados con PayrollLiquidationService (mismo que manual)');
      
      // Load employees with calculations (same as manual)
      const employees = await PayrollLiquidationService.loadEmployeesForPeriod(
        period.fecha_inicio,
        period.fecha_fin,
        new Date().getFullYear().toString()
      );

      console.log(`✅ [MAYA] ${employees.length} empleados cargados con cálculos`);

      // Calculate totals from loaded employees
      const totalDevengado = employees.reduce((sum, emp) => sum + (emp.devengos || 0), 0);
      const totalDeducciones = employees.reduce((sum, emp) => sum + (emp.deducciones || 0), 0);
      const totalNeto = employees.reduce((sum, emp) => sum + (emp.total_pagar || 0), 0);

      return {
        success: true,
        period_id: period.id,
        employees_processed: employees.length,
        total_devengado: totalDevengado,
        total_deducciones: totalDeducciones,
        total_neto: totalNeto
      };

    } catch (error: any) {
      console.error('❌ [MAYA] Payroll calculation error:', error);
      throw new Error(error.message || 'Error al calcular la nómina');
    }
  }
}
