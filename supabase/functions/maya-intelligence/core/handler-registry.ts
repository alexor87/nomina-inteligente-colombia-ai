// ============================================================================
// MAYA Handler Registry - Professional Architecture
// ============================================================================

import { Intent, HandlerResponse, RichContext, MayaLogger } from './types.ts';
import { BaseHandler } from '../handlers/base-handler.ts';
import { VoucherHandler } from '../handlers/voucher-handler.ts';
import { MassVoucherHandler } from '../handlers/mass-voucher-handler.ts';
import { EmployeeHandler } from '../handlers/employee-handler.ts';
import { EmployeeCrudHandler } from '../handlers/employee-crud-handler.ts';
import { PayrollCrudHandler } from '../handlers/payroll-crud-handler.ts';
import { DatabaseQueryHandler } from '../handlers/database-query-handler.ts';
import { ResponseBuilder } from './response-builder.ts';

export class HandlerRegistry {
  private handlers: BaseHandler[] = [];
  private logger: MayaLogger;
  
  constructor(logger: MayaLogger, openaiKey?: string, supabaseClient?: any) {
    this.logger = logger;
    this.initializeHandlers(openaiKey, supabaseClient);
  }
  
  private initializeHandlers(openaiKey?: string, supabaseClient?: any): void {
    // Register all available handlers
    this.handlers = [
      new VoucherHandler(this.logger, openaiKey),
      new MassVoucherHandler(this.logger, openaiKey),
      new EmployeeHandler(this.logger, openaiKey),
      new EmployeeCrudHandler(this.logger, openaiKey),
      new PayrollCrudHandler(this.logger, openaiKey),
      new DatabaseQueryHandler(this.logger, openaiKey, supabaseClient),
      // Future handlers can be added here:
      // new ReportHandler(this.logger, openaiKey),
    ];
    
    this.logger.info('[HandlerRegistry] Initialized with handlers:', {
      handlerCount: this.handlers.length,
      handlerTypes: this.handlers.map(h => h.constructor.name),
      supabaseClientProvided: !!supabaseClient
    });
  }
  
  async processIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    this.logger.info('[HandlerRegistry] Processing intent:', {
      type: intent.type,
      confidence: intent.confidence,
      entityCount: intent.entities.length,
      hasContext: !!context
    });
    
    // Find the appropriate handler
    const handler = this.findHandler(intent);
    
    if (!handler) {
      return this.handleUnknownIntent(intent);
    }
    
    // Process with the selected handler
    try {
      const response = await handler.process(intent, context);
      
      this.logger.info('[HandlerRegistry] Intent processed successfully:', {
        handlerType: handler.constructor.name,
        hasAction: response.hasExecutableAction,
        emotionalState: response.emotionalState
      });
      
      return response;
    } catch (error) {
      this.logger.error('[HandlerRegistry] Handler processing failed:', error);
      
      return ResponseBuilder.buildErrorResponse(
        'Ocurrió un error procesando tu solicitud',
        'Por favor intenta de nuevo'
      );
    }
  }
  
  private findHandler(intent: Intent): BaseHandler | null {
    // Find the first handler that can handle this intent
    for (const handler of this.handlers) {
      if (handler.canHandle(intent)) {
        this.logger.info(`[HandlerRegistry] Selected handler: ${handler.constructor.name}`, {
          intentType: intent.type,
          confidence: intent.confidence
        });
        return handler;
      }
    }
    
    this.logger.warn('[HandlerRegistry] No handler found for intent:', {
      type: intent.type,
      confidence: intent.confidence
    });
    
    return null;
  }
  
  private handleUnknownIntent(intent: Intent): HandlerResponse {
    // For conversation intents or unknown intents, return a conversational response
    if (intent.type === 'CONVERSATION') {
      return ResponseBuilder.buildConversationalResponse(
        'Estoy aquí para ayudarte con tareas de nómina y empleados. ¿En qué puedo asistirte?',
        'neutral'
      );
    }
    
    // For unknown intents, suggest available actions
    const suggestions = this.getAvailableActions();
    
    return ResponseBuilder.buildClarificationResponse(
      'No estoy segura de cómo ayudarte con eso. Aquí están algunas cosas que puedo hacer:',
      suggestions
    );
  }
  
  private getAvailableActions(): string[] {
    return [
      'Enviar desprendibles de nómina a empleados',
      'Buscar información de empleados',
      'Envío masivo de desprendibles',
      'Consultar datos de la empresa',
      'Ayuda con procesos de nómina'
    ];
  }
  
  // Method to add custom handlers dynamically (for future extensibility)
  addHandler(handler: BaseHandler): void {
    this.handlers.push(handler);
    this.logger.info(`[HandlerRegistry] Added custom handler: ${handler.constructor.name}`);
  }
  
  // Method to get handler statistics
  getHandlerStats(): any {
    return {
      totalHandlers: this.handlers.length,
      handlerTypes: this.handlers.map(h => ({
        name: h.constructor.name,
        canHandleTypes: this.getHandlerCapabilities(h)
      }))
    };
  }
  
  private getHandlerCapabilities(handler: BaseHandler): string[] {
    // This would ideally be implemented by handlers themselves
    // For now, return a basic mapping
    const capabilities: Record<string, string[]> = {
      'VoucherHandler': ['VOUCHER_SEND'],
      'MassVoucherHandler': ['VOUCHER_MASS_SEND'],
      'EmployeeHandler': ['EMPLOYEE_SEARCH'],
      'EmployeeCrudHandler': ['EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE'],
      'PayrollCrudHandler': ['PAYROLL_LIQUIDATE', 'VACATION_REGISTER', 'ABSENCE_REGISTER'],
      'DatabaseQueryHandler': ['DATA_QUERY', 'ANALYTICS_REQUEST', 'REPORT_INSIGHTS', 'COMPARISON_ANALYSIS'],
    };
    
    return capabilities[handler.constructor.name] || [];
  }
}