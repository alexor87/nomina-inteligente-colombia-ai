
import { supabase } from '@/integrations/supabase/client';
import { parsePeriodToDateRange } from '@/utils/periodDateUtils';

export interface PayrollHistoryRecord {
  id: string;
  periodo: string;
  fechaCreacion: string;
  empleados: number;
  totalNomina: number;
  estado: 'borrador' | 'procesada' | 'pagada' | 'cerrada';
  companyId: string;
  editable?: boolean;
  reabierto_por?: string;
  fecha_reapertura?: string;
  reportado_dian?: boolean;
  // Add actual period dates
  fecha_inicio?: string;
  fecha_fin?: string;
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

  // Obtener resumen de períodos de nómina reales con fechas correctas
  static async getPayrollPeriods(): Promise<PayrollHistoryRecord[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      console.log('Loading payroll history for company:', companyId);

      // First try to get data from payroll_periods table if it exists and has data
      const { data: periodsData, error: periodsError } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      // Get payroll summary data
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (payrollError) {
        console.error('Error loading payroll history:', payrollError);
        throw payrollError;
      }

      console.log('Raw payroll history data:', payrollData?.length || 0);
      console.log('Period data available:', periodsData?.length || 0);

      if (!payrollData || payrollData.length === 0) {
        console.log('No payroll records found');
        return [];
      }

      // Group payroll data by period
      const grouped: { [key: string]: any[] } = {};
      payrollData.forEach(record => {
        if (!grouped[record.periodo]) {
          grouped[record.periodo] = [];
        }
        grouped[record.periodo].push(record);
      });

      // Create period summaries with correct dates
      const periods = Object.entries(grouped).map(([periodo, records]) => {
        console.log(`Processing period: "${periodo}"`);
        
        // Try to find matching period data from payroll_periods table
        const periodData = periodsData?.find(p => {
          // Try exact match first
          if (periodo === p.fecha_inicio + ' - ' + p.fecha_fin) return true;
          
          // Try month-year matching
          const periodLower = periodo.toLowerCase();
          const startDate = new Date(p.fecha_inicio);
          const monthYear = `${startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`.toLowerCase();
          
          return periodLower.includes(monthYear) || monthYear.includes(periodLower);
        });

        let startDate: string;
        let endDate: string;

        if (periodData) {
          // Use actual period dates from payroll_periods table
          startDate = periodData.fecha_inicio;
          endDate = periodData.fecha_fin;
          console.log(`Using period data for ${periodo}:`, { startDate, endDate });
        } else {
          // Parse period name to get date range
          const dateRange = parsePeriodToDateRange(periodo);
          startDate = dateRange.startDate;
          endDate = dateRange.endDate;
          console.log(`Parsed period "${periodo}" to date range:`, { startDate, endDate });
        }

        // Check if the period matches any reopened periods (with reabierto_por field)
        const reopenedRecord = records.find(r => r.reabierto_por);
        
        return {
          id: `${periodo}-${records[0].created_at}`,
          periodo,
          fechaCreacion: records[0].created_at,
          empleados: records.length,
          totalNomina: records.reduce((sum, r) => sum + Number(r.neto_pagado || 0), 0),
          estado: records[0].estado,
          companyId,
          editable: records[0].editable,
          reabierto_por: reopenedRecord?.reabierto_por,
          fecha_reapertura: reopenedRecord?.fecha_reapertura,
          reportado_dian: records[0].reportado_dian,
          fecha_inicio: startDate,
          fecha_fin: endDate
        };
      });

      console.log('Processed payroll periods with correct dates:', periods.length);
      periods.forEach(p => {
        console.log(`Period: ${p.periodo} -> ${p.fecha_inicio} to ${p.fecha_fin}`);
      });
      
      return periods;
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
