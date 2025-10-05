/**
 * EmployeeCrudHandlerV2 - State Machine Implementation
 * 
 * This handler uses formal State Machine modules to manage employee creation flows.
 * It provides better state tracking, validation, and supports multi-field parsing.
 */

import { BaseHandler } from './base-handler.ts';
import { Intent, HandlerResponse, RichContext } from '../core/types.ts';
import { 
  ConversationStateManager, 
  ConversationContext,
  ConversationState,
  FlowType 
} from '../core/conversation-state-manager.ts';
import { StateTransitionValidator } from '../core/state-transition-validator.ts';
import { StateResponseBuilder } from '../core/state-response-builder.ts';
import { ResponseBuilder } from '../core/response-builder.ts';

export class EmployeeCrudHandlerV2 extends BaseHandler {
  /**
   * Determines if this handler can process the given intent
   */
  canHandle(intent: Intent): boolean {
    return intent.type === 'createEmployee' || 
           intent.type === 'updateEmployee' || 
           intent.type === 'deleteEmployee';
  }

  /**
   * Main intent handler - routes to specific CRUD operation
   */
  async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    console.log(`🎯 [V2] Handling intent: ${intent.type}`);
    
    if (intent.type === 'createEmployee') {
      return this.handleCreate(intent, context);
    } else if (intent.type === 'updateEmployee') {
      // V2 only handles create for now, delegate update to V1
      console.log(`⚠️ [V2] Update not implemented, should use V1`);
      return ResponseBuilder.buildErrorResponse('Update operation not available in V2 yet');
    } else if (intent.type === 'deleteEmployee') {
      // V2 only handles create for now, delegate delete to V1
      console.log(`⚠️ [V2] Delete not implemented, should use V1`);
      return ResponseBuilder.buildErrorResponse('Delete operation not available in V2 yet');
    }
    
    return ResponseBuilder.buildErrorResponse('Unknown operation');
  }

  /**
   * Handle employee creation using State Machine
   */
  private async handleCreate(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    console.log(`🆕 [V2] Starting employee creation flow`);
    
    // 1. Get or create conversation context
    const existingContextString = intent.parameters?.conversationState?.context;
    let convContext: ConversationContext;
    
    if (existingContextString && typeof existingContextString === 'string') {
      try {
        convContext = ConversationStateManager.deserialize(existingContextString);
        console.log(`🔄 [V2] Restored existing context, state: ${convContext.state}`);
      } catch (error) {
        console.error(`❌ [V2] Failed to deserialize context:`, error);
        convContext = ConversationStateManager.createNewContext(
          'EMPLOYEE_CREATE' as FlowType,
          context?.companyId,
          context?.userId,
          context?.sessionId
        );
      }
    } else {
      convContext = ConversationStateManager.createNewContext(
        'EMPLOYEE_CREATE' as FlowType,
        context?.companyId,
        context?.userId,
        context?.sessionId
      );
      console.log(`🆕 [V2] Created new context`);
    }
    
    // 2. Extract employee name from intent
    const employeeName = intent.parameters?.employee_name || intent.parameters?.name;
    const userMessage = intent.parameters?.originalMessage || '';
    
    console.log(`📝 [V2] Employee name: ${employeeName}, Message: ${userMessage.substring(0, 50)}...`);
    
    // 3. Update accumulated data with employee name if present
    if (employeeName && !ConversationStateManager.getData(convContext, 'employeeName')) {
      convContext = ConversationStateManager.updateData(convContext, 'employeeName', employeeName);
    }
    
    // 4. Parse additional fields from user message
    const parsedData = this.parseEmployeeDataFromMessage(userMessage, convContext);
    console.log(`🔍 [V2] Parsed data:`, parsedData);
    
    for (const [key, value] of Object.entries(parsedData)) {
      if (value !== undefined && value !== null) {
        convContext = ConversationStateManager.updateData(convContext, key, value);
      }
    }
    
    console.log(`📊 [V2] Accumulated data:`, convContext.accumulatedData);
    
    // 5. Determine next state
    const nextState = ConversationStateManager.getNextState(convContext);
    
    console.log(`🎯 [V2] Current state: ${convContext.state}, Next state: ${nextState || 'COMPLETE'}`);
    
    // 6. If no next state, flow is complete - build executable action
    if (!nextState) {
      console.log(`✅ [V2] Flow complete, building executable action`);
      const actionResponse = StateResponseBuilder.buildExecutableActionFromContext(
        'EMPLOYEE_CREATE' as FlowType, 
        convContext
      );
      
      // Log final state for debugging
      console.log(`🎬 [V2] Final action:`, actionResponse.actions?.[0]?.type);
      
      return actionResponse;
    }
    
    // 7. Validate transition
    const validation = StateTransitionValidator.validateTransition(convContext.state, nextState);
    
    if (!validation.isValid) {
      console.error(`❌ [V2] Invalid transition: ${convContext.state} → ${nextState}`);
      return StateResponseBuilder.buildTransitionErrorResponse(
        convContext.state,
        nextState,
        validation.reason || 'Transición inválida'
      );
    }
    
    // 8. Transition to next state
    convContext = ConversationStateManager.transitionTo(
      convContext, 
      nextState, 
      'user_input',
      'Advancing to next required field'
    );
    
    console.log(`➡️ [V2] Transitioned to: ${nextState}`);
    
    // 9. Build response for the new state
    const stateResponse = StateResponseBuilder.buildStateResponse(nextState, convContext);
    
    console.log(`💬 [V2] Response: ${stateResponse.quickReplies?.length || 0} quick replies`);
    
    return stateResponse;
  }

  /**
   * Parse employee data from natural language message
   */
  private parseEmployeeDataFromMessage(message: string, context: ConversationContext): Record<string, any> {
    const parsed: Record<string, any> = {};
    const messageLower = message.toLowerCase();
    
    // Parse document type
    if (!ConversationStateManager.getData(context, 'tipoDocumento')) {
      if (messageLower.includes('cédula') || messageLower.includes('cedula')) {
        if (messageLower.includes('ciudadanía') || messageLower.includes('ciudadania')) {
          parsed.tipoDocumento = 'CC';
        } else if (messageLower.includes('extranjería') || messageLower.includes('extranjeria')) {
          parsed.tipoDocumento = 'CE';
        }
      } else if (messageLower.includes('pasaporte')) {
        parsed.tipoDocumento = 'PA';
      } else if (messageLower.includes('permiso especial')) {
        parsed.tipoDocumento = 'PEP';
      }
    }
    
    // Parse contract type
    if (!ConversationStateManager.getData(context, 'tipoContrato')) {
      if (messageLower.includes('indefinido')) {
        parsed.tipoContrato = 'indefinido';
      } else if (messageLower.includes('término fijo') || messageLower.includes('termino fijo')) {
        parsed.tipoContrato = 'termino_fijo';
      } else if (messageLower.includes('obra') || messageLower.includes('labor')) {
        parsed.tipoContrato = 'obra_labor';
      } else if (messageLower.includes('aprendizaje')) {
        parsed.tipoContrato = 'aprendizaje';
      } else if (messageLower.includes('prestación') || messageLower.includes('prestacion')) {
        parsed.tipoContrato = 'prestacion_servicios';
      }
    }
    
    // Parse payment frequency
    if (!ConversationStateManager.getData(context, 'periodicidadPago')) {
      if (messageLower.includes('quincenal')) {
        parsed.periodicidadPago = 'quincenal';
      } else if (messageLower.includes('mensual')) {
        parsed.periodicidadPago = 'mensual';
      } else if (messageLower.includes('semanal')) {
        parsed.periodicidadPago = 'semanal';
      }
    }
    
    // Parse cedula (document number)
    if (!ConversationStateManager.getData(context, 'cedula')) {
      const cedulaMatch = message.match(/\b(\d{5,15})\b/);
      if (cedulaMatch) {
        parsed.cedula = cedulaMatch[1];
      }
    }
    
    // Parse salary
    if (!ConversationStateManager.getData(context, 'salario_base')) {
      // Try to find currency amounts
      const salaryMatch = message.match(/\$?\s*([\d,.]+)\s*(?:pesos|cop|cop)?/i);
      if (salaryMatch) {
        const salaryStr = salaryMatch[1].replace(/[,.]/g, '');
        const salary = parseInt(salaryStr);
        // Only accept reasonable salary values (> 100k COP)
        if (!isNaN(salary) && salary > 100000) {
          parsed.salario_base = salary;
        }
      }
    }
    
    // Parse position/cargo
    if (!ConversationStateManager.getData(context, 'cargo')) {
      const cargoPatterns = [
        /cargo[:\s]+([a-záéíóúñ\s]+)/i,
        /posición[:\s]+([a-záéíóúñ\s]+)/i,
        /como[:\s]+([a-záéíóúñ\s]+)/i,
        /de[:\s]+([a-záéíóúñ\s]+)/i
      ];
      
      for (const pattern of cargoPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          const cargo = match[1].trim();
          // Only accept if it's at least 3 characters and not a document type
          if (cargo.length >= 3 && !['cédula', 'cedula', 'pasaporte'].includes(cargo.toLowerCase())) {
            parsed.cargo = cargo;
            break;
          }
        }
      }
    }
    
    return parsed;
  }
}
