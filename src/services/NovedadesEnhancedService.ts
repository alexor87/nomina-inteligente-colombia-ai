
import { supabase } from '@/integrations/supabase/client';
import { Database, Tables } from '@/integrations/supabase/types';

type DatabaseNovedadType = Database['public']['Enums']['novedad_type'] | 'deduccion_especial';
type PayrollNovedad = Tables<'payroll_novedades'>;

export interface CreateNovedadData {
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: DatabaseNovedadType;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string; 
  base_calculo?: any;
  subtipo?: string;
  company_id: string;
  constitutivo_salario?: boolean;
}

export class NovedadesEnhancedService {
  
  static async getNovedades(companyId: string, periodId: string): Promise<PayrollNovedad[]> {
    try {
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo_id', periodId);

      if (error) {
        console.error('Error obteniendo novedades:', error);
        return [];
      }

      return (novedades || []);
      
    } catch (error) {
      console.error('Error crítico en getNovedades:', error);
      return [];
    }
  }
  
  static async getNovedadesByEmployee(employeeId: string, periodId: string): Promise<PayrollNovedad[]> {
    try {
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (error) {
        console.error('Error obteniendo novedades:', error);
        return [];
      }

      return (novedades || []) as PayrollNovedad[];
      
    } catch (error) {
      console.error('Error crítico en getNovedadesByEmployee:', error);
      return [];
    }
  }

  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      // Get company_id if not provided
      let companyId = novedadData.company_id;
      
      if (!companyId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          companyId = profile?.company_id;
        }
      }

      if (!companyId) {
        throw new Error('No se pudo determinar la empresa');
      }

      // Simple, direct data insertion
      const insertData = {
        empleado_id: novedadData.empleado_id,
        periodo_id: novedadData.periodo_id,
        tipo_novedad: novedadData.tipo_novedad,
        valor: novedadData.valor,
        dias: novedadData.dias,
        horas: novedadData.horas,
        observacion: novedadData.observacion,
        company_id: companyId,
        creado_por: (await supabase.auth.getUser()).data.user?.id,
        fecha_inicio: novedadData.fecha_inicio,
        fecha_fin: novedadData.fecha_fin,
        base_calculo: novedadData.base_calculo,
        subtipo: novedadData.subtipo,
        constitutivo_salario: Boolean(novedadData.constitutivo_salario)
      };

      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error('Error insertando novedad:', error);
        throw error;
      }

      // Log audit action
      try {
        const { PayrollAuditEnhancedService } = await import('@/services/PayrollAuditEnhancedService');
        await PayrollAuditEnhancedService.logManualAction(novedad.id, 'ADJUSTMENT', {
          reason: 'Novedad creada desde interfaz de ajustes',
          source: 'adjustment',
          metadata: {
            original_data: insertData,
            user_context: 'PayrollHistoryDetailPage',
            timestamp: new Date().toISOString()
          }
        });
      } catch (auditError) {
        console.warn('No se pudo registrar acción de auditoría:', auditError);
      }

      return novedad as PayrollNovedad;
      
    } catch (error) {
      console.error('Error crítico creando novedad:', error);
      throw error;
    }
  }

  static async updateNovedad(novedadId: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    try {
      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .update(updates as any)
        .eq('id', novedadId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando novedad:', error);
        throw error;
      }

      return novedad as PayrollNovedad;
      
    } catch (error) {
      console.error('Error crítico actualizando novedad:', error);
      throw error;
    }
  }

  static async deleteNovedad(novedadId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId);

      if (error) {
        console.error('Error eliminando novedad:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('Error crítico eliminando novedad:', error);
      throw error;
    }
  }
}
