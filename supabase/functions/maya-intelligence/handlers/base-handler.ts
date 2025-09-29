// ============================================================================
// MAYA Base Handler - Professional Architecture
// ============================================================================

import { Intent, HandlerResponse, RichContext, MayaLogger, ValidationResult } from '../core/types.ts';
import { ResponseBuilder } from '../core/response-builder.ts';

export abstract class BaseHandler {
  protected logger: MayaLogger;
  protected openaiKey?: string;
  
  constructor(logger: MayaLogger, openaiKey?: string) {
    this.logger = logger;
    this.openaiKey = openaiKey;
  }
  
  // Template Method Pattern - Main processing flow
  async process(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    try {
      this.logger.info(`[${this.constructor.name}] Processing intent: ${intent.type}`, {
        confidence: intent.confidence,
        entities: intent.entities.length,
        hasContext: !!context
      });
      
      // 1. Validate intent compatibility
      if (!this.canHandle(intent)) {
        return ResponseBuilder.buildErrorResponse(
          'No puedo manejar esta solicitud',
          'Intenta reformular tu pregunta'
        );
      }
      
      // 2. Validate prerequisites
      const validation = await this.validatePrerequisites(intent, context);
      if (!validation.isValid) {
        return this.handleValidationErrors(validation);
      }
      
      // 3. Check if requires confirmation and not yet confirmed
      if (intent.requiresConfirmation && !this.isConfirmed(intent)) {
        return this.requestConfirmation(intent, context);
      }
      
      // 4. Execute main logic
      const response = await this.handleIntent(intent, context);
      
      // 5. Log success
      this.logger.info(`[${this.constructor.name}] Successfully processed intent`, {
        hasAction: response.hasExecutableAction,
        emotionalState: response.emotionalState
      });
      
      return response;
      
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] Error processing intent:`, error);
      return this.handleError(error, intent);
    }
  }
  
  // Abstract methods that must be implemented by concrete handlers
  abstract canHandle(intent: Intent): boolean;
  abstract handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse>;
  
  // Virtual methods with default implementations
  protected async validatePrerequisites(intent: Intent, context?: RichContext): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [] };
  }
  
  protected handleValidationErrors(validation: ValidationResult): HandlerResponse {
    const message = validation.errors.join('\n');
    const suggestions = validation.warnings.length > 0 ? validation.warnings : undefined;
    
    return ResponseBuilder.buildErrorResponse(message, suggestions?.[0]);
  }
  
  protected isConfirmed(intent: Intent): boolean {
    return intent.parameters?.confirmed === true;
  }
  
  protected requestConfirmation(intent: Intent, context?: RichContext): HandlerResponse {
    const action = this.getActionDescription(intent);
    const message = ResponseBuilder.Messages.CONFIRMATION_REQUIRED(action);
    
    return ResponseBuilder.buildClarificationResponse(message, ['Sí, continuar', 'No, cancelar']);
  }
  
  protected getActionDescription(intent: Intent): string {
    switch (intent.type) {
      case 'VOUCHER_MASS_SEND': return 'envío masivo de desprendibles';
      case 'EMPLOYEE_DELETE': return 'eliminación de empleado';
      case 'PAYROLL_LIQUIDATE': return 'liquidación de nómina';
      default: return intent.type.toLowerCase().replace('_', ' ');
    }
  }
  
  protected handleError(error: any, intent: Intent): HandlerResponse {
    return ResponseBuilder.buildErrorResponse(
      'Ocurrió un error procesando tu solicitud',
      'Por favor intenta de nuevo o contacta soporte'
    );
  }
  
  // Helper methods for common operations
  protected async callWithAI(prompt: string): Promise<string | null> {
    if (!this.openaiKey) return null;
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.3
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.choices[0]?.message?.content || null;
      }
    } catch (error) {
      this.logger.error('[BaseHandler] AI call failed:', error);
    }
    
    return null;
  }
  
  protected findBestMatch(query: string, options: string[]): string | null {
    const queryLower = query.toLowerCase();
    
    // Exact match
    const exact = options.find(opt => opt.toLowerCase() === queryLower);
    if (exact) return exact;
    
    // Partial match
    const partial = options.find(opt => 
      opt.toLowerCase().includes(queryLower) || 
      queryLower.includes(opt.toLowerCase())
    );
    
    return partial || null;
  }
  
  protected extractEmployeeFromContext(context?: RichContext, employeeName?: string): any {
    if (!context?.employeeData?.allEmployees || !employeeName) {
      return null;
    }
    
    const searchName = employeeName.toLowerCase();
    return context.employeeData.allEmployees.find(emp => 
      emp.name.toLowerCase().includes(searchName) ||
      searchName.includes(emp.name.toLowerCase())
    );
  }
}