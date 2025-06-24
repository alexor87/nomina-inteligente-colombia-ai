
import { supabase } from '@/integrations/supabase/client';

export interface PayrollHistoryRecord {
  id: string;
  periodo: string;
  fechaCreacion: string;
  empleados: number;
  totalNomina: number;
  estado: 'borrador' | 'procesada' | 'pagada' | 'cerrada';
  companyId: string;
}

export class PayrollHistoryService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  // Obtener resumen de períodos de nómina reales
  static async getPayrollPeriods(): Promise<PayrollHistoryRecord[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payrolls')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar por período
      const grouped: { [key: string]: any[] } = {};
      (data || []).forEach(record => {
        if (!grouped[record.periodo]) {
          grouped[record.periodo] = [];
        }
        grouped[record.periodo].push(record);
      });

      return Object.entries(grouped).map(([periodo, records]) => ({
        id: `${periodo}-${records[0].created_at}`,
        periodo,
        fechaCreacion: records[0].created_at,
        empleados: records.length,
        totalNomina: records.reduce((sum, r) => sum + Number(r.neto_pagado || 0), 0),
        estado: records[0].estado,
        companyId
      }));
    } catch (error) {
      console.error('Error loading payroll periods:', error);
      return [];
    }
  }

  // Reabrir un período de nómina
  static async reopenPeriod(periodo: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No se encontró la empresa del usuario');

      const { error } = await supabase
        .from('payrolls')
        .update({ estado: 'borrador' })
        .eq('company_id', companyId)
        .eq('periodo', periodo);

      if (error) throw error;

      // También actualizar comprobantes asociados
      await supabase
        .from('payroll_vouchers')
        .update({ voucher_status: 'pendiente' })
        .eq('company_id', companyId)
        .eq('periodo', periodo);

    } catch (error) {
      console.error('Error reopening period:', error);
      throw new Error('Error al reabrir el período');
    }
  }

  // Generar dispersión bancaria para un período
  static async generateBankDispersion(periodo: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No se encontró la empresa del usuario');

      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (
            nombre,
            apellido,
            cedula
          )
        `)
        .eq('company_id', companyId)
        .eq('periodo', periodo)
        .eq('estado', 'procesada');

      if (error) throw error;

      // Aquí se generaría el archivo de dispersión bancaria
      console.log('Generating bank dispersion for:', data);
      
      // Simular generación de archivo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error generating bank dispersion:', error);
      throw new Error('Error al generar la dispersión bancaria');
    }
  }
}
