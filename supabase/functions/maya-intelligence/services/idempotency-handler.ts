/**
 * IDEMPOTENCY HANDLER SERVICE - Day 4
 * 
 * Prevents duplicate command execution by tracking processed requests
 * with a 24-hour TTL window.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface ProcessedCommand {
  idempotency_key: string;
  company_id: string;
  session_id: string;
  request_data: any;
  response_data: any;
  processed_at: string;
  expires_at: string;
}

export interface IdempotencyResult {
  isDuplicate: boolean;
  previousResponse?: any;
}

export class IdempotencyHandler {
  private supabase: ReturnType<typeof createClient>;
  private ttlHours: number;

  constructor(supabaseUrl: string, supabaseKey: string, ttlHours = 24) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.ttlHours = ttlHours;
  }

  /**
   * Check if request was already processed and store new requests
   */
  async checkAndStore(
    idempotencyKey: string,
    companyId: string,
    sessionId: string,
    requestData: any,
    responseData?: any
  ): Promise<IdempotencyResult> {
    try {
      // First, check if this key already exists
      const { data: existing, error: checkError } = await this.supabase
        .from('processed_commands')
        .select('response_data, expires_at')
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check idempotency: ${checkError.message}`);
      }

      // If exists and not expired, return previous response
      if (existing) {
        const expiresAt = new Date(existing.expires_at);
        if (expiresAt > new Date()) {
          console.log(`⚠️ [IDEMPOTENCY] Duplicate request detected: ${idempotencyKey}`);
          return {
            isDuplicate: true,
            previousResponse: existing.response_data,
          };
        } else {
          // Expired, delete it
          await this.deleteCommand(idempotencyKey);
        }
      }

      // Not a duplicate or expired - store new command if response provided
      if (responseData) {
        await this.storeCommand(idempotencyKey, companyId, sessionId, requestData, responseData);
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error(`❌ [IDEMPOTENCY] Error in checkAndStore:`, error);
      // In case of error, proceed anyway (fail-open for availability)
      return { isDuplicate: false };
    }
  }

  /**
   * Store a processed command
   */
  private async storeCommand(
    idempotencyKey: string,
    companyId: string,
    sessionId: string,
    requestData: any,
    responseData: any
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.ttlHours);

    const command: Partial<ProcessedCommand> = {
      idempotency_key: idempotencyKey,
      company_id: companyId,
      session_id: sessionId,
      request_data: requestData,
      response_data: responseData,
      expires_at: expiresAt.toISOString(),
    };

    const { error } = await this.supabase
      .from('processed_commands')
      .upsert(command, { onConflict: 'idempotency_key' });

    if (error) {
      console.error(`❌ [IDEMPOTENCY] Failed to store command:`, error);
      // Don't throw - storage failure shouldn't break the request
    } else {
      console.log(`✅ [IDEMPOTENCY] Stored command: ${idempotencyKey}`);
    }
  }

  /**
   * Delete a command (for expired entries)
   */
  private async deleteCommand(idempotencyKey: string): Promise<void> {
    const { error } = await this.supabase
      .from('processed_commands')
      .delete()
      .eq('idempotency_key', idempotencyKey);

    if (error) {
      console.error(`❌ [IDEMPOTENCY] Failed to delete expired command:`, error);
    }
  }

  /**
   * Cleanup expired commands (manual trigger or cron job)
   */
  async cleanupExpired(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('processed_commands')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('idempotency_key');

      if (error) {
        throw new Error(`Failed to cleanup expired commands: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      console.log(`✅ [IDEMPOTENCY] Cleaned up ${deletedCount} expired commands`);
      return deletedCount;
    } catch (error) {
      console.error(`❌ [IDEMPOTENCY] Failed to cleanup:`, error);
      return 0;
    }
  }

  /**
   * Get session commands (for debugging)
   */
  async getSessionCommands(sessionId: string, limit = 20): Promise<ProcessedCommand[]> {
    try {
      const { data, error } = await this.supabase
        .from('processed_commands')
        .select('*')
        .eq('session_id', sessionId)
        .order('processed_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get session commands: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`❌ [IDEMPOTENCY] Failed to get session commands:`, error);
      return [];
    }
  }
}
