import type { MayaMessage, MayaContext, PayrollPhase, EmotionalState } from "./types";

export class MayaEngine {
  private static instance: MayaEngine;
  private messageHistory: MayaMessage[] = [];
  private currentContext: MayaContext | null = null;

  static getInstance(): MayaEngine {
    if (!MayaEngine.instance) {
      MayaEngine.instance = new MayaEngine();
    }
    return MayaEngine.instance;
  }

  async generateContextualMessage(context: MayaContext): Promise<MayaMessage> {
    this.currentContext = context;
    
    // Use fallback messages directly - they're appropriate for phase-based contextual messages
    // and don't require the chat-based edge function
    const message = this.getFallbackMessage(context);
    this.messageHistory.push(message);
    return message;
  }

  private getFallbackMessage(context: MayaContext): MayaMessage {
    const fallbackMessages: Record<PayrollPhase, { message: string; emotion: EmotionalState }> = {
      initial: { 
        message: "¡Hola! Soy MAYA, tu asistente de nómina. Estoy aquí para ayudarte con la liquidación.", 
        emotion: 'neutral' 
      },
      period_selection: { 
        message: "Selecciona el período que quieres liquidar. Te ayudo a validar que todo esté correcto.", 
        emotion: 'encouraging' 
      },
      employee_loading: { 
        message: `Cargando ${context.employeeCount || ''} empleados para el período...`, 
        emotion: 'analyzing' 
      },
      data_validation: { 
        message: "Analizando datos de empleados y período para detectar posibles problemas...", 
        emotion: 'analyzing' 
      },
      liquidation_ready: { 
        message: "¡Todo listo! Los cálculos están correctos y puedes proceder con la liquidación.", 
        emotion: 'encouraging' 
      },
      processing: { 
        message: "Procesando liquidación... Te notificaré cuando esté completa.", 
        emotion: 'analyzing' 
      },
      completed: { 
        message: "¡Excelente! La liquidación se completó exitosamente. ¡Buen trabajo!", 
        emotion: 'celebrating' 
      },
      error: { 
        message: "Detecté un problema. No te preocupes, podemos resolverlo juntos.", 
        emotion: 'concerned' 
      }
    };

    const fallback = fallbackMessages[context.phase] || fallbackMessages.initial;
    
    return {
      id: `maya-fallback-${Date.now()}`,
      message: fallback.message,
      emotionalState: fallback.emotion,
      timestamp: new Date().toISOString(),
      isVisible: true
    };
  }

  getMessageHistory(): MayaMessage[] {
    return this.messageHistory;
  }

  clearHistory(): void {
    this.messageHistory = [];
  }

  getCurrentContext(): MayaContext | null {
    return this.currentContext;
  }
}