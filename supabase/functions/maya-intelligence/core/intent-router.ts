/**
 * Intent Router Module
 * Handles routing and execution of detected intents
 */

import { MayaLogger } from './types.ts';
import { HandlerRegistry } from './handler-registry.ts';
import { EmployeeCrudHandlerV2 } from '../handlers/employee-crud-handler-v2.ts';
import * as AggregationService from '../services/aggregation/index.ts';
import { TemporalResolver } from './temporal-resolver.ts';

export interface Intent {
  type: string;
  method: string;
  params: any;
  confidence: number;
  entities?: any[];
}

export interface RouteContext {
  userSupabase: any;
  conversation: any[];
  sessionId: string;
  lastMessage: string;
  logger: MayaLogger;
  metadata?: {
    lastConversationState?: any;
    [key: string]: any;
  };
}

export interface RouteResponse {
  message: string;
  emotionalState: string;
  actions?: any[];
  quickReplies?: string[];
  fieldName?: string;
  conversationState?: any;
}

/**
 * IntentRouter - Routes intents to appropriate handlers
 */
export class IntentRouter {
  private handlerRegistry: HandlerRegistry;
  private logger: MayaLogger;

  constructor(logger: MayaLogger, userSupabase: any) {
    this.logger = logger;
    this.handlerRegistry = new HandlerRegistry(logger, undefined, userSupabase);
  }

  /**
   * Route intent to appropriate handler
   */
  async route(intent: Intent, context: RouteContext): Promise<RouteResponse> {
    this.logger.info(`[ROUTER] Routing intent: ${intent.method} (confidence: ${intent.confidence})`);

    try {
      // Route to specific handler based on method
      switch (intent.method) {
        // Employee CRUD operations
        case 'createEmployee':
        case 'updateEmployee':
        case 'deleteEmployee':
          return await this.routeEmployeeCrud(intent, context);

        // Employee queries
        case 'searchEmployee':
          return await this.routeEmployeeSearch(intent, context);
        
        case 'getEmployeeSalary':
          return await this.routeEmployeeSalary(intent, context);
        
        case 'getEmployeePaidTotal':
          return await this.routeEmployeePaidTotal(intent, context);
        
        case 'getEmployeeBenefitProvision':
          return await this.routeEmployeeBenefitProvision(intent, context);
        
        case 'getEmployeeDetails':
          return await this.routeEmployeeDetails(intent, context);

        // Aggregation queries
        case 'getTotalPayrollCost':
        case 'getSecurityContributions':
        case 'getContributionReport':
        case 'getHighestCostEmployees':
        case 'getLowestCostEmployees':
        case 'getTotalIncapacityDays':
        case 'getTotalOvertimeHours':
        case 'getPayrollProjection':
        case 'simulateHiringCost':
        case 'simulateSalaryIncrease':
          return await this.routeAggregation(intent, context);

        default:
          this.logger.warn(`[ROUTER] Unknown method: ${intent.method}`);
          return {
            message: 'Para consultas específicas, usa términos como "salario de [nombre]" o "buscar [nombre]".',
            emotionalState: 'neutral'
          };
      }
    } catch (error) {
      this.logger.error('[ROUTER] Error routing intent:', error);
      return {
        message: 'Ocurrió un error procesando tu solicitud. Por favor intenta de nuevo.',
        emotionalState: 'confused'
      };
    }
  }

  /**
   * Route employee CRUD operations
   */
  private async routeEmployeeCrud(intent: Intent, context: RouteContext): Promise<RouteResponse> {
    this.logger.info(`[ROUTER] Routing CRUD: ${intent.method}`);

    // Check for State Machine feature flag
    const USE_STATE_MACHINE = Deno.env.get('USE_STATE_MACHINE_EMPLOYEE') === 'true';

    let handlerResponse;

    if (intent.method === 'createEmployee' && USE_STATE_MACHINE) {
      this.logger.info('[ROUTER] Using EmployeeCrudHandlerV2 (State Machine)');
      
      const handlerV2 = new EmployeeCrudHandlerV2(this.logger, undefined, context.userSupabase);
      
      const handlerIntent = {
        type: intent.type,
        confidence: intent.confidence,
        entities: intent.entities || [],
        parameters: {
          ...intent.params,
          employee_name: intent.params?.name || intent.params?.employee_name,
          originalMessage: context.lastMessage,
          conversationState: context.metadata?.lastConversationState
        }
      };
      
      this.logger.info(`[ROUTER] Using conversationState from metadata:`, context.metadata?.lastConversationState ? 'present' : 'missing');

      const richContext = {
        userId: (await context.userSupabase.auth.getUser()).data.user?.id || '',
        companyId: await this.getCurrentCompanyId(context.userSupabase) || '',
        conversationHistory: context.conversation,
        currentPage: 'maya-chat',
        sessionId: context.sessionId
      };

      handlerResponse = await handlerV2.process(handlerIntent, richContext);
    } else {
      this.logger.info('[ROUTER] Using EmployeeCrudHandler V1 (Legacy)');
      
      const handlerIntent = {
        type: intent.type,
        confidence: intent.confidence,
        entities: intent.entities || [],
        parameters: {
          ...intent.params,
          employee_name: intent.params?.name || intent.params?.employee_name,
          originalMessage: context.lastMessage,
          conversationParams: context.conversation.length > 0 ? 
            context.conversation[context.conversation.length - 1]?.conversationState : undefined
        }
      };

      const richContext = {
        userId: (await context.userSupabase.auth.getUser()).data.user?.id || '',
        companyId: await this.getCurrentCompanyId(context.userSupabase) || '',
        conversationHistory: context.conversation,
        currentPage: 'maya-chat',
        sessionId: context.sessionId
      };

      handlerResponse = await this.handlerRegistry.processIntent(handlerIntent, richContext);
    }

    return {
      message: handlerResponse.response,
      emotionalState: handlerResponse.emotionalState || 'neutral',
      actions: handlerResponse.actions || [],
      quickReplies: handlerResponse.quickReplies || [],
      fieldName: handlerResponse.fieldName,
      conversationState: handlerResponse.conversationState
    };
  }

  /**
   * Route employee search
   */
  private async routeEmployeeSearch(intent: Intent, context: RouteContext): Promise<RouteResponse> {
    const { searchEmployee, validateEmployeeExists } = await import('../query-handlers.ts');
    
    if (intent.params?.name) {
      const validation = await validateEmployeeExists(context.userSupabase, intent.params.name);
      if (!validation.exists) {
        return {
          message: `No encontré un empleado llamado "${intent.params.name}" en tu empresa. ¿Podrías verificar la ortografía?`,
          emotionalState: 'neutral'
        };
      }
    }
    
    return await searchEmployee(context.userSupabase, intent.params?.name);
  }

  /**
   * Route employee salary query
   */
  private async routeEmployeeSalary(intent: Intent, context: RouteContext): Promise<RouteResponse> {
    const { getEmployeeSalary, validateEmployeeExists } = await import('../query-handlers.ts');
    
    if (intent.params?.name) {
      const validation = await validateEmployeeExists(context.userSupabase, intent.params.name);
      if (!validation.exists) {
        return {
          message: `No encontré un empleado llamado "${intent.params.name}" en tu empresa. ¿Podrías verificar la ortografía?`,
          emotionalState: 'neutral'
        };
      }
    }
    
    return await getEmployeeSalary(context.userSupabase, intent.params?.name);
  }

  /**
   * Route employee paid total query
   */
  private async routeEmployeePaidTotal(intent: Intent, context: RouteContext): Promise<RouteResponse> {
    const { getEmployeePaidTotal, validateEmployeeExists } = await import('../query-handlers.ts');
    
    if (intent.params?.name) {
      const validation = await validateEmployeeExists(context.userSupabase, intent.params.name);
      if (!validation.exists) {
        return {
          message: `No encontré un empleado llamado "${intent.params.name}" en tu empresa. ¿Podrías verificar la ortografía?`,
          emotionalState: 'neutral'
        };
      }
    }
    
    return await getEmployeePaidTotal(context.userSupabase, intent.params);
  }

  /**
   * Route employee benefit provision query
   */
  private async routeEmployeeBenefitProvision(intent: Intent, context: RouteContext): Promise<RouteResponse> {
    const { getEmployeeBenefitProvision, validateEmployeeExists } = await import('../query-handlers.ts');
    
    if (intent.params?.name) {
      const validation = await validateEmployeeExists(context.userSupabase, intent.params.name);
      if (!validation.exists) {
        return {
          message: `No encontré un empleado llamado "${intent.params.name}" en tu empresa. ¿Podrías verificar la ortografía?`,
          emotionalState: 'neutral'
        };
      }
    }
    
    return await getEmployeeBenefitProvision(context.userSupabase, intent.params);
  }

  /**
   * Route employee details query
   */
  private async routeEmployeeDetails(intent: Intent, context: RouteContext): Promise<RouteResponse> {
    const { getEmployeeDetails, validateEmployeeExists } = await import('../query-handlers.ts');
    const { extractLastEmployeeFromContext } = await import('./context-enricher.ts');
    
    let employeeName = intent.params?.name;
    
    if (!employeeName) {
      employeeName = extractLastEmployeeFromContext(context.conversation);
      this.logger.info(`[ROUTER] Extracted employee from context: "${employeeName}"`);
    }
    
    if (!employeeName) {
      return {
        message: "¿De qué empleado necesitas más información? Por favor especifica el nombre.",
        emotionalState: 'neutral'
      };
    }
    
    const validation = await validateEmployeeExists(context.userSupabase, employeeName);
    if (!validation.exists) {
      return {
        message: `No encontré un empleado llamado "${employeeName}" en tu empresa. ¿Podrías verificar la ortografía?`,
        emotionalState: 'neutral'
      };
    }
    
    if (validation.multiple) {
      const employeeList = Array.isArray(validation.employee) 
        ? validation.employee.map((emp: any) => `• **${emp.nombre} ${emp.apellido}**`).join('\n')
        : '';
      return {
        message: `Encontré varios empleados con "${employeeName}":\n\n${employeeList}\n\n¿Podrías ser más específico?`,
        emotionalState: 'neutral'
      };
    }
    
    return await getEmployeeDetails(context.userSupabase, employeeName);
  }

  /**
   * Route aggregation queries
   */
  private async routeAggregation(intent: Intent, context: RouteContext): Promise<RouteResponse> {
    this.logger.info(`[ROUTER] Routing aggregation: ${intent.method}`);
    
    const temporalParams = TemporalResolver.isLegacyFormat(intent.params)
      ? TemporalResolver.fromLegacy(intent.params)
      : intent.params;
    
    // 🔥 Log to verify contributionType is preserved
    this.logger.info(`[ROUTER] TemporalParams after conversion:`, temporalParams);

    let result;
    
    switch (intent.method) {
      case 'getTotalPayrollCost':
        result = await AggregationService.getTotalPayrollCost(context.userSupabase, temporalParams);
        break;
      case 'getSecurityContributions':
        result = await AggregationService.getSecurityContributions(context.userSupabase, temporalParams);
        break;
      case 'getContributionReport':
        result = await AggregationService.getContributionReport(context.userSupabase, temporalParams);
        break;
      case 'getHighestCostEmployees':
        result = await AggregationService.getHighestCostEmployees(context.userSupabase, temporalParams);
        break;
      case 'getLowestCostEmployees':
        result = await AggregationService.getLowestCostEmployees(context.userSupabase, temporalParams);
        break;
      case 'getTotalIncapacityDays':
        result = await AggregationService.getTotalIncapacityDays(context.userSupabase, temporalParams);
        break;
      case 'getTotalOvertimeHours':
        result = await AggregationService.getTotalOvertimeHours(context.userSupabase, temporalParams);
        break;
      case 'getPayrollProjection':
        result = await AggregationService.getPayrollProjection(context.userSupabase, temporalParams);
        break;
      case 'simulateHiringCost':
        result = await AggregationService.simulateHiringCost(context.userSupabase, intent.params);
        break;
      case 'simulateSalaryIncrease':
        this.logger.info('[INFO] [ROUTER] TemporalParams after conversion:', intent.params);
        result = await AggregationService.simulateSalaryIncrease(
          context.userSupabase,
          intent.params as { employeeName: string; increaseAmount: number }
        );
        break;
      default:
        return {
          message: 'No pude procesar esa consulta de agregación.',
          emotionalState: 'confused'
        };
    }

    return result;
  }

  /**
   * Helper to get current company ID
   */
  private async getCurrentCompanyId(supabase: any): Promise<string | null> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();
      return profile?.company_id || null;
    } catch (error) {
      this.logger.error('[ROUTER] Error getting company ID:', error);
      return null;
    }
  }
}
