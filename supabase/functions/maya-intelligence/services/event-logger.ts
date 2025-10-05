/**
 * EVENT LOGGER SERVICE - Day 1
 * 
 * Logs all conversation state transitions to the Event Store
 * for complete audit trail and debugging capabilities.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { ConversationContext } from '../core/conversation-state-manager.ts';

export interface ConversationEvent {
  session_id: string;
  company_id: string;
  user_id?: string;
  event_type: 'state_transition' | 'error' | 'flow_start' | 'flow_complete' | 'user_message' | 'assistant_response';
  flow_type?: string;
  state_before?: any;
  state_after?: any;
  transition_reason?: string;
  error_data?: any;
  metadata?: Record<string, any>;
}

export class EventLogger {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Log a state transition event
   */
  async logStateTransition(
    context: ConversationContext,
    fromState: string,
    toState: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: ConversationEvent = {
        session_id: context.metadata.sessionId || 'unknown',
        company_id: context.metadata.companyId || 'unknown',
        user_id: context.metadata.userId,
        event_type: 'state_transition',
        flow_type: context.flowType,
        state_before: { state: fromState, data: context.accumulatedData },
        state_after: { state: toState, data: context.accumulatedData },
        transition_reason: reason,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      await this.insertEvent(event);
      console.log(`✅ [EVENT_LOGGER] Logged transition: ${fromState} → ${toState}`);
    } catch (error) {
      console.error('❌ [EVENT_LOGGER] Failed to log state transition:', error);
      // Don't throw - logging failures shouldn't break the flow
    }
  }

  /**
   * Log an error event
   */
  async logError(
    sessionId: string,
    companyId: string,
    error: Error | any,
    context?: Partial<ConversationContext>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: ConversationEvent = {
        session_id: sessionId,
        company_id: companyId,
        user_id: context?.metadata?.userId,
        event_type: 'error',
        flow_type: context?.flowType,
        error_data: {
          message: error?.message || String(error),
          stack: error?.stack,
          name: error?.name,
          currentState: context?.currentState,
        },
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      await this.insertEvent(event);
      console.log(`✅ [EVENT_LOGGER] Logged error: ${error?.message || 'Unknown'}`);
    } catch (logError) {
      console.error('❌ [EVENT_LOGGER] Failed to log error:', logError);
    }
  }

  /**
   * Log flow start event
   */
  async logFlowStart(
    context: ConversationContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: ConversationEvent = {
        session_id: context.metadata.sessionId || 'unknown',
        company_id: context.metadata.companyId || 'unknown',
        user_id: context.metadata.userId,
        event_type: 'flow_start',
        flow_type: context.flowType,
        state_after: { state: context.currentState, data: context.accumulatedData },
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      await this.insertEvent(event);
      console.log(`✅ [EVENT_LOGGER] Logged flow start: ${context.flowType}`);
    } catch (error) {
      console.error('❌ [EVENT_LOGGER] Failed to log flow start:', error);
    }
  }

  /**
   * Log flow completion event
   */
  async logFlowComplete(
    context: ConversationContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: ConversationEvent = {
        session_id: context.metadata.sessionId || 'unknown',
        company_id: context.metadata.companyId || 'unknown',
        user_id: context.metadata.userId,
        event_type: 'flow_complete',
        flow_type: context.flowType,
        state_after: { state: context.currentState, data: context.accumulatedData },
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      await this.insertEvent(event);
      console.log(`✅ [EVENT_LOGGER] Logged flow complete: ${context.flowType}`);
    } catch (error) {
      console.error('❌ [EVENT_LOGGER] Failed to log flow complete:', error);
    }
  }

  /**
   * Log user message event
   */
  async logUserMessage(
    sessionId: string,
    companyId: string,
    userId: string | undefined,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: ConversationEvent = {
        session_id: sessionId,
        company_id: companyId,
        user_id: userId,
        event_type: 'user_message',
        metadata: {
          message,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      await this.insertEvent(event);
    } catch (error) {
      console.error('❌ [EVENT_LOGGER] Failed to log user message:', error);
    }
  }

  /**
   * Log assistant response event
   */
  async logAssistantResponse(
    sessionId: string,
    companyId: string,
    userId: string | undefined,
    response: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: ConversationEvent = {
        session_id: sessionId,
        company_id: companyId,
        user_id: userId,
        event_type: 'assistant_response',
        metadata: {
          hasActions: !!response.executableActions?.length,
          hasQuickReplies: !!response.quickReplies?.length,
          messageLength: response.message?.length || 0,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      await this.insertEvent(event);
    } catch (error) {
      console.error('❌ [EVENT_LOGGER] Failed to log assistant response:', error);
    }
  }

  /**
   * Insert event into database
   */
  private async insertEvent(event: ConversationEvent): Promise<void> {
    const { error } = await this.supabase
      .from('conversation_events')
      .insert(event);

    if (error) {
      throw new Error(`Failed to insert event: ${error.message}`);
    }
  }

  /**
   * Query events for debugging (useful for developers)
   */
  async getSessionEvents(sessionId: string, limit = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('conversation_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ [EVENT_LOGGER] Failed to query session events:', error);
      return [];
    }

    return data || [];
  }
}
