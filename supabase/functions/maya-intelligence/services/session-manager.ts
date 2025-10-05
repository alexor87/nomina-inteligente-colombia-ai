/**
 * SESSION MANAGER SERVICE - Day 2
 * 
 * Backend session storage - Single source of truth for conversation state.
 * Eliminates frontend state synchronization bugs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { ConversationContext, FlowType } from '../core/conversation-state-manager.ts';

export interface SessionState {
  session_id: string;
  company_id: string;
  user_id?: string;
  flow_type: string;
  current_state: any;
  accumulated_data: any;
  metadata: any;
  checksum: string;
  version: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export class SessionManager {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Load conversation context from backend storage
   */
  async loadContext(sessionId: string): Promise<ConversationContext | null> {
    try {
      const { data, error } = await this.supabase
        .from('session_states')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Session not found - this is OK for new sessions
          console.log(`ℹ️ [SESSION_MANAGER] No existing session: ${sessionId}`);
          return null;
        }
        throw new Error(`Failed to load session: ${error.message}`);
      }

      // Validate checksum
      const calculatedChecksum = await this.calculateChecksum(data.current_state, data.accumulated_data);
      if (calculatedChecksum !== data.checksum) {
        console.warn(`⚠️ [SESSION_MANAGER] Checksum mismatch for session ${sessionId}`);
      }

      const context: ConversationContext = {
        flowType: data.flow_type as FlowType,
        currentState: data.current_state.state,
        accumulatedData: data.accumulated_data,
        metadata: {
          ...data.metadata,
          sessionId: data.session_id,
          companyId: data.company_id,
          userId: data.user_id,
        },
        transitionHistory: data.metadata.transitionHistory || [],
      };

      console.log(`✅ [SESSION_MANAGER] Loaded context for session ${sessionId} (version ${data.version})`);
      return context;
    } catch (error) {
      console.error(`❌ [SESSION_MANAGER] Failed to load context:`, error);
      return null;
    }
  }

  /**
   * Save conversation context to backend storage
   */
  async saveContext(context: ConversationContext): Promise<void> {
    try {
      const sessionId = context.metadata.sessionId;
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const currentState = {
        state: context.currentState,
        flowType: context.flowType,
      };

      const checksum = await this.calculateChecksum(currentState, context.accumulatedData);

      // Check if session exists
      const existing = await this.loadContext(sessionId);
      const version = existing ? (existing.metadata.version || 1) + 1 : 1;

      const sessionState: Partial<SessionState> = {
        session_id: sessionId,
        company_id: context.metadata.companyId || '',
        user_id: context.metadata.userId,
        flow_type: context.flowType,
        current_state: currentState,
        accumulated_data: context.accumulatedData,
        metadata: {
          ...context.metadata,
          version,
          transitionHistory: context.transitionHistory,
        },
        checksum,
        version,
      };

      const { error } = await this.supabase
        .from('session_states')
        .upsert(sessionState, { onConflict: 'session_id' });

      if (error) {
        throw new Error(`Failed to save session: ${error.message}`);
      }

      console.log(`✅ [SESSION_MANAGER] Saved context for session ${sessionId} (version ${version})`);
    } catch (error) {
      console.error(`❌ [SESSION_MANAGER] Failed to save context:`, error);
      throw error;
    }
  }

  /**
   * Delete session state (for cleanup or reset)
   */
  async deleteContext(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('session_states')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        throw new Error(`Failed to delete session: ${error.message}`);
      }

      console.log(`✅ [SESSION_MANAGER] Deleted session ${sessionId}`);
    } catch (error) {
      console.error(`❌ [SESSION_MANAGER] Failed to delete session:`, error);
      throw error;
    }
  }

  /**
   * Calculate checksum for state validation using Web Crypto API
   * Uses SHA-256 (Deno-compatible algorithm)
   */
  private async calculateChecksum(currentState: any, accumulatedData: any): Promise<string> {
    const payload = JSON.stringify({ currentState, accumulatedData });
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get all active sessions for a company (for debugging)
   */
  async getCompanySessions(companyId: string, limit = 20): Promise<SessionState[]> {
    try {
      const { data, error } = await this.supabase
        .from('session_states')
        .select('*')
        .eq('company_id', companyId)
        .order('last_activity_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get company sessions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`❌ [SESSION_MANAGER] Failed to get company sessions:`, error);
      return [];
    }
  }

  /**
   * Cleanup old sessions (inactive for > 24 hours)
   */
  async cleanupOldSessions(hoursInactive = 24): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursInactive);

      const { data, error } = await this.supabase
        .from('session_states')
        .delete()
        .lt('last_activity_at', cutoffDate.toISOString())
        .select('session_id');

      if (error) {
        throw new Error(`Failed to cleanup old sessions: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      console.log(`✅ [SESSION_MANAGER] Cleaned up ${deletedCount} old sessions`);
      return deletedCount;
    } catch (error) {
      console.error(`❌ [SESSION_MANAGER] Failed to cleanup old sessions:`, error);
      return 0;
    }
  }
}
