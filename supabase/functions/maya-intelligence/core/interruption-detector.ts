import { Intent } from './types.ts';
import { ConversationContext } from './conversation-state-manager.ts';

export type InterruptionType = 'greeting' | 'query' | 'cancel' | 'none';

export interface InterruptionResult {
  isInterruption: boolean;
  interruptionType: InterruptionType;
  detectedIntent?: Intent;
}

export class InterruptionDetector {
  private static GREETINGS = [
    'hola', 'buenos días', 'buenas tardes', 'buenas noches', 'buen día',
    'hi', 'hello', 'hey', 'saludos', 'qué tal', 'cómo estás', 'cómo está'
  ];

  private static CANCEL_COMMANDS = [
    'cancelar', 'cancela', 'salir', 'detener', 'olvídalo', 'olvidalo',
    'déjalo', 'dejalo', 'no importa', 'cancel', 'stop', 'quit', 'exit'
  ];

  /**
   * Detect if a message is an interruption during an active flow
   */
  static detect(
    message: string,
    currentContext: ConversationContext,
    classifiedIntent?: Intent
  ): InterruptionResult {
    const normalizedMessage = message.toLowerCase().trim();

    // 1. Check for cancellation commands (highest priority)
    if (this.isCancelCommand(normalizedMessage)) {
      return {
        isInterruption: true,
        interruptionType: 'cancel',
      };
    }

    // 2. Check for greetings
    if (this.isGreeting(normalizedMessage)) {
      return {
        isInterruption: true,
        interruptionType: 'greeting',
      };
    }

    // 3. Check if the classified intent is different from the current flow
    if (classifiedIntent && this.isOutOfContextQuery(classifiedIntent, currentContext)) {
      return {
        isInterruption: true,
        interruptionType: 'query',
        detectedIntent: classifiedIntent,
      };
    }

    // 4. Not an interruption - user is responding to the flow
    return {
      isInterruption: false,
      interruptionType: 'none',
    };
  }

  /**
   * Check if message is a greeting
   */
  private static isGreeting(message: string): boolean {
    // Check for exact matches or greetings at the start/end of message
    return this.GREETINGS.some(greeting => {
      return message === greeting || 
             message.startsWith(`${greeting} `) || 
             message.endsWith(` ${greeting}`) ||
             message === `${greeting}!` ||
             message === `${greeting}?`;
    });
  }

  /**
   * Check if message is a cancel command
   */
  private static isCancelCommand(message: string): boolean {
    return this.CANCEL_COMMANDS.some(cmd => {
      return message === cmd || 
             message.startsWith(`${cmd} `) || 
             message.endsWith(` ${cmd}`) ||
             message === `${cmd}!`;
    });
  }

  /**
   * Check if the detected intent is different from the current flow's intent
   */
  private static isOutOfContextQuery(intent: Intent, context: ConversationContext): boolean {
    // If the intent is a different type of query (not related to current flow)
    // For example: user is in EMPLOYEE_CREATE flow but asks about AGGREGATION
    const currentFlowIntentType = this.getFlowIntentType(context.flowType);
    
    if (!currentFlowIntentType) return false;
    
    // Check if intent is unrelated to current flow
    return intent.type !== currentFlowIntentType && 
           intent.confidence > 0.5 && // Only consider high-confidence detections
           !this.isFlowProgressionIntent(intent, context);
  }

  /**
   * Get the expected intent type for a flow
   */
  private static getFlowIntentType(flowType: string): string | null {
    const flowToIntentMap: Record<string, string> = {
      'EMPLOYEE_CREATE': 'EMPLOYEE_CREATE',
      'EMPLOYEE_UPDATE': 'EMPLOYEE_UPDATE',
      'EMPLOYEE_DELETE': 'EMPLOYEE_DELETE',
      'VOUCHER_SEND': 'VOUCHER_SEND',
      // Add more mappings as needed
    };
    
    return flowToIntentMap[flowType] || null;
  }

  /**
   * Check if the intent is part of the flow progression
   * (e.g., confirming, providing data, etc.)
   */
  private static isFlowProgressionIntent(intent: Intent, context: ConversationContext): boolean {
    // These intents are part of flow progression
    const progressionIntents = ['CONFIRMATION', 'PROVIDE_DATA', 'CLARIFICATION'];
    return progressionIntents.includes(intent.type);
  }
}
