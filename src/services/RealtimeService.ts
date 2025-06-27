
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeEvent {
  eventType: RealtimeEventType;
  table: string;
  new?: any;
  old?: any;
}

export class RealtimeService {
  private static channels: Map<string, RealtimeChannel> = new Map();

  static subscribeToTable(
    tableName: string,
    callback: (event: RealtimeEvent) => void,
    companyId?: string
  ): RealtimeChannel {
    const channelName = `${tableName}_${companyId || 'global'}`;
    
    // Si ya existe un canal, lo removemos primero
    if (this.channels.has(channelName)) {
      this.unsubscribeFromTable(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(companyId && { filter: `company_id=eq.${companyId}` })
        },
        (payload) => {
          console.log(`🔔 Realtime event on ${tableName}:`, payload);
          
          callback({
            eventType: payload.eventType as RealtimeEventType,
            table: tableName,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  static unsubscribeFromTable(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`🔕 Unsubscribed from ${channelName}`);
    }
  }

  static unsubscribeAll(): void {
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
      console.log(`🔕 Unsubscribed from ${channelName}`);
    });
    this.channels.clear();
  }

  // Método específico para empleados
  static subscribeToEmployees(
    callback: (event: RealtimeEvent) => void,
    companyId?: string
  ): RealtimeChannel {
    return this.subscribeToTable('employees', callback, companyId);
  }

  // Método específico para períodos de nómina
  static subscribeToPayrollPeriods(
    callback: (event: RealtimeEvent) => void,
    companyId?: string
  ): RealtimeChannel {
    return this.subscribeToTable('payroll_periods', callback, companyId);
  }

  // Método específico para configuraciones
  static subscribeToCompanySettings(
    callback: (event: RealtimeEvent) => void,
    companyId?: string
  ): RealtimeChannel {
    return this.subscribeToTable('company_settings', callback, companyId);
  }

  // Método específico para novedades
  static subscribeToNovedades(
    callback: (event: RealtimeEvent) => void,
    companyId?: string
  ): RealtimeChannel {
    return this.subscribeToTable('payroll_novedades', callback, companyId);
  }
}
