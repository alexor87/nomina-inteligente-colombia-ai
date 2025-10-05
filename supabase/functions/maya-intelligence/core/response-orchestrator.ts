/**
 * Response Orchestrator Module
 * Orchestrates and builds final responses with proper formatting
 */

import { buildStructuredResponse } from '../structured-response-builder.ts';

export interface OrchestratedResponse {
  // Structured fields
  accion: string;
  periodo: any;
  empleados: any[];
  conceptos: any[];
  totales: any;
  
  // Backward compatibility
  message: string;
  emotionalState: string;
  actions?: any[];
  quickReplies?: string[];
  fieldName?: string;
  conversationState?: any;
  
  // Metadata
  timestamp: string;
  confidence?: number;
  intent?: string;
}

/**
 * ResponseOrchestrator - Builds and formats final responses
 */
export class ResponseOrchestrator {
  /**
   * Orchestrate a complete response from intent and handler result
   */
  static orchestrate(
    intent: any,
    response: any,
    lastMessage: string,
    options: {
      sessionId?: string;
      timestamp?: string;
    } = {}
  ): OrchestratedResponse {
    console.log(`🎭 [ORCHESTRATOR] Building response for intent: ${intent.type}`);
    
    // Build structured response
    const structuredResponse = buildStructuredResponse(intent, response, lastMessage);
    
    // Build orchestrated response
    const orchestrated: OrchestratedResponse = {
      // Structured fields
      accion: structuredResponse.accion,
      periodo: structuredResponse.periodo,
      empleados: structuredResponse.empleados,
      conceptos: structuredResponse.conceptos,
      totales: structuredResponse.totales,
      
      // Backward compatibility
      message: response.message || structuredResponse.mensaje || 'No pude procesar tu solicitud.',
      emotionalState: response.emotionalState || 'neutral',
      actions: response.actions || [],
      quickReplies: response.quickReplies || [],
      fieldName: response.fieldName,
      conversationState: response.conversationState,
      
      // Metadata
      timestamp: options.timestamp || new Date().toISOString(),
      confidence: intent.confidence,
      intent: intent.type
    };
    
    console.log(`✅ [ORCHESTRATOR] Response ready:`, {
      hasActions: orchestrated.actions!.length > 0,
      hasQuickReplies: orchestrated.quickReplies!.length > 0,
      hasConversationState: !!orchestrated.conversationState,
      messageLength: orchestrated.message.length
    });
    
    return orchestrated;
  }

  /**
   * Build error response
   */
  static buildErrorResponse(
    error: any,
    context?: {
      intent?: any;
      lastMessage?: string;
    }
  ): OrchestratedResponse {
    console.error('🚨 [ORCHESTRATOR] Building error response:', error);
    
    return {
      accion: 'ERROR',
      periodo: null,
      empleados: [],
      conceptos: [],
      totales: {},
      
      message: 'Lo siento, ocurrió un error procesando tu solicitud. Por favor intenta de nuevo.',
      emotionalState: 'confused',
      actions: [],
      quickReplies: ['Ayuda', 'Reintentar'],
      
      timestamp: new Date().toISOString(),
      intent: context?.intent?.type || 'UNKNOWN'
    };
  }

  /**
   * Build fallback response for low confidence or unknown intents
   */
  static buildFallbackResponse(
    intent: any,
    lastMessage: string,
    confidence: number
  ): OrchestratedResponse {
    console.log(`🤷 [ORCHESTRATOR] Building fallback response (confidence: ${confidence})`);
    
    let message = 'No estoy seguro de qué necesitas. ¿Podrías ser más específico?';
    
    if (confidence > 0.5) {
      message = 'Para consultas específicas, usa términos como "salario de [nombre]" o "buscar [nombre]".';
    }
    
    return {
      accion: 'FALLBACK',
      periodo: null,
      empleados: [],
      conceptos: [],
      totales: {},
      
      message,
      emotionalState: 'thoughtful',
      actions: [],
      quickReplies: [
        'Buscar empleado',
        'Ver nómina',
        'Reportes',
        'Ayuda'
      ],
      
      timestamp: new Date().toISOString(),
      confidence,
      intent: intent?.type || 'UNKNOWN'
    };
  }

  /**
   * Validate response before sending
   */
  static validate(response: OrchestratedResponse): boolean {
    // Ensure required fields exist
    if (!response.message || typeof response.message !== 'string') {
      console.error('🚨 [ORCHESTRATOR] Invalid response: missing or invalid message');
      return false;
    }
    
    if (!response.emotionalState) {
      console.warn('⚠️ [ORCHESTRATOR] Response missing emotionalState, defaulting to neutral');
      response.emotionalState = 'neutral';
    }
    
    // Validate actions if present
    if (response.actions && !Array.isArray(response.actions)) {
      console.error('🚨 [ORCHESTRATOR] Invalid response: actions must be array');
      return false;
    }
    
    // Validate quick replies if present
    if (response.quickReplies && !Array.isArray(response.quickReplies)) {
      console.error('🚨 [ORCHESTRATOR] Invalid response: quickReplies must be array');
      return false;
    }
    
    console.log('✅ [ORCHESTRATOR] Response validation passed');
    return true;
  }

  /**
   * Sanitize response for security
   */
  static sanitize(response: OrchestratedResponse): OrchestratedResponse {
    // Remove sensitive fields if present
    const sanitized = { ...response };
    
    // Remove any internal fields
    delete (sanitized as any)._internal;
    delete (sanitized as any).__proto__;
    
    // Sanitize message for XSS
    if (sanitized.message) {
      sanitized.message = sanitized.message
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    }
    
    return sanitized;
  }
}
