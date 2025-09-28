import { supabase } from "@/integrations/supabase/client";
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
    
    try {
      const { data, error } = await supabase.functions.invoke('maya-intelligence', {
        body: {
          context: this.buildContextString(context),
          phase: context.phase,
          data: {
            employeeCount: context.employeeCount,
            periodName: context.periodName,
            hasErrors: context.hasErrors,
            isProcessing: context.isProcessing,
            completionPercentage: context.completionPercentage,
            validationResults: context.validationResults
          }
        }
      });

      if (error) throw error;

      const message: MayaMessage = {
        id: `maya-${Date.now()}`,
        message: data.message,
        emotionalState: data.emotionalState,
        contextualActions: data.contextualActions,
        timestamp: data.timestamp,
        isVisible: true
      };

      this.messageHistory.push(message);
      return message;

    } catch (error) {
      console.error('Maya Engine Error:', error);
      return this.getFallbackMessage(context);
    }
  }

  private buildContextString(context: MayaContext): string {
    const parts = [];
    
    if (context.periodName) {
      parts.push(`Período: ${context.periodName}`);
    }
    
    if (context.employeeCount) {
      parts.push(`${context.employeeCount} empleados`);
    }
    
    if (context.hasErrors) {
      parts.push('errores detectados');
    }
    
    if (context.isProcessing) {
      parts.push('procesando liquidación');
    }
    
    if (context.completionPercentage) {
      parts.push(`${context.completionPercentage}% completado`);
    }

    return `${context.phase}: ${parts.join(', ')}`;
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