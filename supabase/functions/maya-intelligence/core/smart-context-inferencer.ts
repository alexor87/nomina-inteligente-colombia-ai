// ============================================================================
// MAYA Smart Context Inferencer
// ============================================================================
// Intelligently maps conversational context to specific intents
// Uses fast pattern matching first, falls back to AI only when needed

import { 
  CONTEXT_TO_INTENT_MAP, 
  FOLLOW_UP_PATTERNS,
  type ContextMapping 
} from '../config/context-patterns.ts';
import type { ConversationContext } from './conversation-context-analyzer.ts';
import type { Intent, IntentType } from './types.ts';

export class SmartContextInferencer {
  
  /**
   * Infers the intent from conversational context and follow-up message
   */
  static infer(
    followUpMessage: string,
    context: ConversationContext,
    extractedName: string
  ): Intent | null {
    
    // If no valid context, cannot infer
    if (!context.contextType || context.confidence < 0.70) {
      console.log('[SmartInferencer] No valid context for inference');
      return null;
    }

    // Map context type to intent type
    const mapping = CONTEXT_TO_INTENT_MAP[context.contextType];
    
    if (!mapping) {
      console.log(`[SmartInferencer] No mapping found for context: ${context.contextType}`);
      return null;
    }

    console.log(`[SmartInferencer] Mapping ${context.contextType} -> ${mapping.intentType} (confidence: ${mapping.confidence})`);

    // Build intent based on mapping
    const intent: Intent = {
      type: mapping.intentType as IntentType,
      confidence: Math.min(mapping.confidence, context.confidence),
      parameters: {
        employeeName: extractedName,
        contextInferred: true,
        originalContext: context.contextType,
        responseStructure: context.responseStructure
      },
      requiresConfirmation: false,
      entities: [
        {
          type: 'employee',
          value: extractedName,
          confidence: mapping.confidence,
          resolved: null
        }
      ]
    };

    return intent;
  }

  /**
   * Validates if the follow-up message matches expected patterns
   */
  static isValidFollowUp(message: string): boolean {
    const trimmed = message.trim();
    
    // Check against follow-up patterns
    for (const patterns of Object.values(FOLLOW_UP_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(trimmed)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Extracts the name from a follow-up message
   */
  static extractFollowUpName(message: string): string | null {
    const trimmed = message.trim();
    
    // Try name follow-up patterns
    for (const pattern of FOLLOW_UP_PATTERNS.NAME_FOLLOW_UP) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Determines if AI should be used for inference (low confidence scenarios)
   */
  static shouldUseAI(context: ConversationContext, followUpMessage: string): boolean {
    // Use AI if:
    // 1. Context confidence is low (<0.75)
    // 2. Follow-up doesn't match known patterns
    // 3. Context type is ambiguous (multiple patterns matched)
    
    const lowConfidence = context.confidence < 0.75;
    const unknownPattern = !this.isValidFollowUp(followUpMessage);
    const ambiguousContext = context.detectedPatterns.length > 2;

    return lowConfidence || unknownPattern || ambiguousContext;
  }

  /**
   * Logs inference details for debugging
   */
  static logInference(
    context: ConversationContext,
    followUpMessage: string,
    inferredIntent: Intent | null
  ): void {
    console.log('[SmartInferencer] Inference Details:');
    console.log(`  Context Type: ${context.contextType}`);
    console.log(`  Context Confidence: ${context.confidence}`);
    console.log(`  Follow-up: "${followUpMessage}"`);
    console.log(`  Inferred Intent: ${inferredIntent?.type || 'NONE'}`);
    console.log(`  Intent Confidence: ${inferredIntent?.confidence || 0}`);
    console.log(`  Entities: ${JSON.stringify(context.entities)}`);
  }
}
