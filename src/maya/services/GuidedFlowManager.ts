import { GuidedFlow, FlowState, FlowType, ValidationRule } from '../types/GuidedFlow';
import { employeeManagementFlow } from '../flows/employeeManagementFlow';
import { payrollCalculationFlow } from '../flows/payrollCalculationFlow';
import { reportsGenerationFlow } from '../flows/reportsGenerationFlow';
import { whatIfSimulationFlow } from '../flows/whatIfSimulationFlow';
import { proactiveDetectionFlow } from '../flows/proactiveDetectionFlow';
import { onboardingDemoFlow } from '../flows/onboardingDemoFlow';

export class GuidedFlowManager {
  private static instance: GuidedFlowManager;
  private flows: Map<FlowType, GuidedFlow> = new Map();
  private activeFlows: Map<string, FlowState> = new Map();

  private constructor() {
    // Register all available flows
    this.registerFlow(employeeManagementFlow);
    this.registerFlow(payrollCalculationFlow);
    this.registerFlow(reportsGenerationFlow);
    this.registerFlow(whatIfSimulationFlow);
    this.registerFlow(proactiveDetectionFlow);
    this.registerFlow(onboardingDemoFlow);
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
    if (userInput && userInput !== 'cancel' && (currentStep.dataKey || currentStep.type !== 'greeting')) {
      // Use dataKey if exists, otherwise use step id
      const dataKey = currentStep.dataKey || currentStep.id;
      flowState.accumulatedData[dataKey] = userInput;
      
      console.log(`💾 [FLOW] Guardando dato:`, { 
        stepId: currentStep.id, 
        dataKey, 
        value: userInput 
      });
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

      // Check if this is an action execution step
      if (flowState.currentStep === 'action_execution') {
        const pendingAction = flowState.accumulatedData._pending_action;
        
        if (!pendingAction) {
          throw new Error('No pending action found for execution');
        }

        console.log('🎬 Executing pending action:', pendingAction);

        // Execute the action via edge function
        const { supabase } = await import('@/integrations/supabase/client');
        
        const { data: actionResult, error } = await supabase.functions.invoke('execute-maya-action', {
          body: { action: pendingAction }
        });

        if (error) {
          console.error('❌ Action execution failed:', error);
          return {
            success: false,
            message: `Error al ejecutar la acción: ${error.message}`
          };
        }

        console.log('✅ Action executed successfully:', actionResult);

        // Store the result for the next step
        flowState.accumulatedData._action_execution_result = actionResult;

        // Clear the pending action
        delete flowState.accumulatedData._pending_action;

        return actionResult;
      }
      
      switch (flowState.flowId) {
        case FlowType.EMPLOYEE_CREATE:
          return await this.executeEmployeeCreation(flowState.accumulatedData);
        
        case FlowType.PAYROLL_CALCULATE:
          return await this.executePayrollCalculation(flowState.accumulatedData);
        
        case FlowType.REPORTS_GENERATE:
          return await this.executeReportGeneration(flowState.accumulatedData);
        
        case FlowType.WHAT_IF_SIMULATION:
          return await this.executeWhatIfSimulation(flowState.accumulatedData);
        
        case FlowType.PROACTIVE_SCAN:
          return await this.executeProactiveScan(flowState.accumulatedData);
        
        case FlowType.ONBOARDING_DEMO_LIQUIDATION:
          return await this.executeDemoLiquidation(flowState.accumulatedData);
        
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

      // 🔍 VALIDACIÓN: Verificar que no existe duplicado del período
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', data.selected_period_id)
        .single();

      if (!period) throw new Error('No se encontró el período de nómina');

      // Verificar si hay duplicado del mismo período
      const { data: duplicates, error: dupError } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('fecha_inicio', period.fecha_inicio)
        .eq('fecha_fin', period.fecha_fin)
        .neq('id', period.id);

      if (duplicates && duplicates.length > 0) {
        console.warn('⚠️ [MAYA] Período duplicado detectado, consolidando...');
        // Si hay duplicados, usar el constraint para evitar crear más
      }

      // ✅ USAR BACKEND: EmployeeUnifiedService (mismo que manual moderno)
      const { EmployeeUnifiedService } = await import('@/services/EmployeeUnifiedService');
      
      console.log('🚀 [MAYA] Cargando empleados con EmployeeUnifiedService (BACKEND)');
      
      // Load employees with BACKEND calculations
      const employees = await EmployeeUnifiedService.getEmployeesForPeriod(period.id);

      console.log(`✅ [MAYA] ${employees.length} empleados cargados con BACKEND`);

      // ✅ Totals come directly from BACKEND calculations
      const totalDevengado = employees.reduce((sum, emp) => sum + emp.totalEarnings, 0);
      const totalDeducciones = employees.reduce((sum, emp) => sum + emp.totalDeductions, 0);
      const totalNeto = employees.reduce((sum, emp) => sum + emp.netPay, 0);

      console.log('💰 [MAYA] Backend totals:', {
        totalDevengado: Math.round(totalDevengado),
        totalDeducciones: Math.round(totalDeducciones),
        totalNeto: Math.round(totalNeto),
        allNumeric: Number.isFinite(totalDevengado) && Number.isFinite(totalDeducciones) && Number.isFinite(totalNeto)
      });

      // 🔒 SECURITY: Pre-flight validation de company_id
      if (period.company_id !== profile.company_id) {
        console.error(`🚨 [SECURITY] Cross-company access blocked: period.company_id=${period.company_id}, profile.company_id=${profile.company_id}`);
        throw new Error('🔒 Error de seguridad: El período no pertenece a tu empresa actual. Verifica que estés en la empresa correcta.');
      }

      return {
        success: true,
        period_id: period.id,
        employees_processed: employees.length,
        total_devengado: totalDevengado,
        total_deducciones: totalDeducciones,
        total_neto: totalNeto,
        executableActions: [
          {
            id: 'liquidate_complete',
            type: 'liquidate_payroll_complete',
            label: '✅ Liquidar y Cerrar Período',
            description: 'Cierra el período y crea los registros de nómina definitivos',
            parameters: {
              periodId: period.id,
              startDate: period.fecha_inicio,
              endDate: period.fecha_fin,
              companyId: profile.company_id, // ✅ Validado contra profile
              periodName: period.periodo
            },
            requiresConfirmation: true,
            icon: '💾'
          },
          {
            id: 'view_payroll',
            type: 'view_details',
            label: '👁️ Ver Nómina Calculada',
            description: 'Navega al módulo de liquidación para revisar detalles',
            parameters: {
              entityType: 'period',
              entityId: period.id,
              entityName: period.periodo
            }
          }
        ]
      };

    } catch (error: any) {
      console.error('❌ [MAYA] Payroll calculation error:', error);
      throw new Error(error.message || 'Error al calcular la nómina');
    }
  }

  private async executeReportGeneration(data: Record<string, any>): Promise<any> {
    const { supabase } = await import('@/integrations/supabase/client');
    const { MayaReportService } = await import('./MayaReportService');
    
    try {
      console.log('📊 [MAYA] Ejecutando generación de reporte');
      
      // 1. Obtener company_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No se encontró la empresa del usuario');
      
      // 2. Delegar TODO a MayaReportService (separación de responsabilidades)
      return await MayaReportService.generateReport({
        reportType: data.report_type ?? data.greeting ?? 'payroll_summary',
        period: data.period ?? data.period_selection,
        periodId: data.selected_period_id,
        companyId: profile.company_id,
        filters: {
          employeeIds: data.filter_type === 'employees' 
            ? data.filter_values?.split(',').map((s: string) => s.trim())
            : undefined,
          costCenters: data.filter_type === 'cost_center'
            ? data.filter_values?.split(',').map((s: string) => s.trim())
            : undefined,
          contractTypes: data.filter_type === 'contract_type'
            ? data.filter_values?.split(',').map((s: string) => s.trim())
            : undefined
        },
        includeComparison: true
      });
      
    } catch (error: any) {
      console.error('❌ [MAYA] Report generation error:', error);
      throw new Error(error.message || 'Error al generar el reporte');
    }
  }

  private async executeWhatIfSimulation(data: Record<string, any>): Promise<any> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      console.log('🔮 [MAYA] Ejecutando simulación What-If:', data.scenario_type);
      
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No se encontró la empresa del usuario');

      // Build simulation request
      const simulationRequest = {
        scenarioType: data.scenario_type,
        companyId: profile.company_id,
        currentPeriodId: data.selected_period_id,
        parameters: {
          newHires: data.new_hires_count ? Number(data.new_hires_count) : undefined,
          averageSalary: data.average_salary ? Number(data.average_salary) : undefined,
          percentageIncrease: data.percentage_increase ? Number(data.percentage_increase) : undefined,
          affectedEmployees: data.affected_employees_count ? Number(data.affected_employees_count) : undefined,
          overtimeHours: data.overtime_hours ? Number(data.overtime_hours) : undefined,
          bonusAmount: data.bonus_amount ? Number(data.bonus_amount) : undefined,
          months: data.projection_months ? Number(data.projection_months) : 12
        }
      };

      console.log('📤 [MAYA] Invocando maya-intelligence con simulationRequest:', simulationRequest);

      // Call maya-intelligence edge function
      const { data: simulationResult, error } = await supabase.functions.invoke('maya-intelligence', {
        body: {
          message: `what_if_simulation:${data.scenario_type}`,
          simulationRequest,
          sessionId: `simulation-flow-${Date.now()}`
        }
      });

      if (error) {
        console.error('❌ [MAYA] Error en simulación:', error);
        throw new Error(`Error al ejecutar la simulación: ${error.message}`);
      }

      console.log('✅ [MAYA] Simulación completada exitosamente');

      return {
        success: true,
        scenarioType: data.scenario_type,
        narrative: simulationResult.narrative,
        simulationResult: simulationResult.data,
        executableActions: simulationResult.contextualActions || []
      };

    } catch (error: any) {
      console.error('❌ [MAYA] Simulation error:', error);
      throw new Error(error.message || 'Error al ejecutar la simulación');
    }
  }

  private async executeProactiveScan(data: Record<string, any>): Promise<any> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      console.log('🔍 [MAYA] Ejecutando escaneo proactivo');
      
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No se encontró la empresa del usuario');

      // Build scan request
      const scanRequest = {
        companyId: profile.company_id,
        scanTypes: data.scan_types || ['payroll_anomalies', 'compliance_issues', 'cost_opportunities'],
        periodId: data.selected_period_id
      };

      console.log('📤 [MAYA] Invocando maya-intelligence con scanRequest:', scanRequest);

      // Call maya-intelligence edge function
      const { data: scanResult, error } = await supabase.functions.invoke('maya-intelligence', {
        body: {
          message: 'proactive_scan',
          scanRequest,
          sessionId: `scan-flow-${Date.now()}`
        }
      });

      if (error) {
        console.error('❌ [MAYA] Error en escaneo proactivo:', error);
        throw new Error(`Error al ejecutar el escaneo: ${error.message}`);
      }

      console.log('✅ [MAYA] Escaneo proactivo completado');

      return {
        success: true,
        narrative: scanResult.narrative,
        alerts: scanResult.alerts || [],
        proactiveAlerts: scanResult.data,
        executableActions: scanResult.contextualActions || []
      };

    } catch (error: any) {
      console.error('❌ [MAYA] Proactive scan error:', error);
      throw new Error(error.message || 'Error al ejecutar el escaneo proactivo');
    }
  }

  private async executeDemoLiquidation(data: Record<string, any>): Promise<any> {
    console.log('🎯 [DEMO] Executing demo liquidation', data);
    
    try {
      // Parse employee data from conversational input
      const parsedData = this.parseDemoEmployeeInput(data.capture_name, data.capture_salary);
      
      console.log('📊 [DEMO] Parsed employee data:', parsedData);
      
      // Use PayrollCalculationSimple for in-memory calculation
      const { PayrollCalculationSimple } = await import('@/services/PayrollCalculationSimple');
      
      const calculationInput = {
        salarioBase: parsedData.salary,
        diasTrabajados: 30,
        year: new Date().getFullYear().toString()
      };
      
      const result = PayrollCalculationSimple.calculate(calculationInput);
      
      console.log('✅ [DEMO] Calculation result:', result);
      
      // Generate demo PDF if needed
      if (data.generating_pdf) {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Get company info for PDF header
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user?.id)
          .single();
        
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile?.company_id)
          .single();
        
        // Generate PDF with isDemo flag
        const { data: pdfResult, error } = await supabase.functions.invoke('generate-voucher-pdf', {
          body: {
            isDemo: true,
            employee: {
              nombre: parsedData.name.split(' ')[0] || parsedData.name,
              apellido: parsedData.name.split(' ').slice(1).join(' ') || '',
              cedula: 'Demo',
              cargo: 'Empleado Demo',
              salario_base: result.salarioBase,
              auxilio_transporte: result.auxilioTransporte,
              total_devengado: result.totalDevengado,
              salud_empleado: result.deduccionSalud,
              pension_empleado: result.deduccionPension,
              total_deducciones: result.totalDeducciones,
              neto_pagado: result.netoPagar
            },
            period: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
              type: 'Demo'
            },
            companyInfo: company || {
              razon_social: 'Empresa Demo',
              nit: '900000000-0',
              email: 'demo@empresa.com'
            }
          }
        });
        
        if (error) {
          console.error('❌ [DEMO] PDF generation failed:', error);
          throw new Error('Error generando PDF demo');
        }
        
        console.log('📄 [DEMO] PDF generated successfully');
        
        return {
          success: true,
          employeeName: parsedData.name,
          employeeSalary: parsedData.salary,
          calculationResult: result,
          pdfBase64: pdfResult?.pdfBase64,
          message: '¡Comprobante demo generado exitosamente!'
        };
      }
      
      return {
        success: true,
        employeeName: parsedData.name,
        employeeSalary: parsedData.salary,
        ...result
      };
    } catch (error: any) {
      console.error('❌ [DEMO] Liquidation failed:', error);
      throw new Error(error.message || 'Error ejecutando demo de liquidación');
    }
  }

  private parseDemoEmployeeInput(nameInput: string, salaryInput?: string): { name: string; salary: number } {
    let name = '';
    let salary = 0;

    if (salaryInput) {
      name = nameInput.trim();
      salary = Number(salaryInput.replace(/[$.]/g, ''));
    } else {
      const match = nameInput.match(/^(.+?)[,\s]+\$?([\d.]+)$/);
      
      if (match) {
        name = match[1].trim();
        salary = Number(match[2].replace(/\./g, ''));
      } else {
        name = nameInput.trim();
        salary = 0;
      }
    }

    return { name, salary };
  }

  // Helper para determinar tipo de período basado en fechas
  private determinePeriodType(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (days <= 7) return 'semanal';
    if (days <= 15) return 'quincenal';
    return 'mensual';
  }
}
