import { SecureBaseService } from './SecureBaseService';
import { PayrollNovedad, CreateNovedadData } from '@/types/novedades';

/**
 * 🔒 SECURE VERSION: NovedadesService with built-in company isolation
 * Replaces the original NovedadesService with automatic security filtering
 */
export class SecureNovedadesService extends SecureBaseService {
  
  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('🔒 [SECURITY] No company context');

      console.log('🔒 [SECURITY] Creating novedad with secure validation for company:', companyId);

      // Validate period belongs to user's company
      const { data: periodExists, error: periodError } = await this.secureQuery(
        'payroll_periods_real',
        'id',
        { id: novedadData.periodo_id }
      );

      if (periodError || !periodExists?.length) {
        console.error('🔒 [SECURITY] Period validation failed:', periodError);
        throw new Error(`Invalid period ID: ${novedadData.periodo_id}`);
      }

      // Validate employee belongs to user's company
      const { data: employeeExists, error: employeeError } = await this.secureQuery(
        'employees',
        'id',
        { id: novedadData.empleado_id }
      );

      if (employeeError || !employeeExists?.length) {
        console.error('🔒 [SECURITY] Employee validation failed:', employeeError);
        throw new Error(`Invalid employee ID: ${novedadData.empleado_id}`);
      }

      const insertData = {
        empleado_id: novedadData.empleado_id,
        periodo_id: novedadData.periodo_id,
        tipo_novedad: novedadData.tipo_novedad,
        valor: novedadData.valor,
        horas: novedadData.horas,
        dias: novedadData.dias,
        observacion: novedadData.observacion,
        fecha_inicio: novedadData.fecha_inicio,
        fecha_fin: novedadData.fecha_fin,
        base_calculo: novedadData.base_calculo ? JSON.stringify(novedadData.base_calculo) : undefined,
      };

      const { data, error } = await this.secureInsert('payroll_novedades', insertData);

      if (error) {
        console.error('🔒 [SECURITY] Error inserting novedad:', error);
        throw error;
      }

      if (!data?.[0]) {
        throw new Error('No data returned from insert');
      }

      const novedad = data[0];
      console.log('✅ [SECURITY] Novedad created successfully:', novedad.id);
      
      return {
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        valor: Number(novedad.valor || 0),
        horas: Number(novedad.horas || 0),
        dias: novedad.dias || 0,
        observacion: novedad.observacion || '',
        fecha_inicio: novedad.fecha_inicio || '',
        fecha_fin: novedad.fecha_fin || '',
        base_calculo: novedad.base_calculo ? JSON.parse(novedad.base_calculo) : undefined,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      };
    } catch (error) {
      console.error('🔒 [SECURITY] Error creating novedad:', error);
      await this.logSecurityViolation('payroll_novedades', 'create', 'create_attempt_failed', { error: error.message });
      throw error;
    }
  }

  static async getNovedadesByEmployee(empleadoId: string, periodId: string): Promise<PayrollNovedad[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        await this.logSecurityViolation('payroll_novedades', 'read', 'no_company_context');
        return [];
      }

      console.log('🔒 [SECURITY] Loading novedades for employee:', empleadoId, 'period:', periodId, 'company:', companyId);

      const { data, error } = await this.secureQuery(
        'payroll_novedades',
        `
          id,
          company_id,
          empleado_id,
          periodo_id,
          tipo_novedad,
          valor,
          horas,
          dias,
          observacion,
          fecha_inicio,
          fecha_fin,
          base_calculo,
          created_at,
          updated_at
        `,
        {
          empleado_id: empleadoId,
          periodo_id: periodId
        }
      );

      if (error) {
        console.error('🔒 [SECURITY] Error loading novedades:', error);
        throw error;
      }

      console.log('✅ [SECURITY] Loaded novedades:', data?.length || 0);

      return (data || []).map(novedad => ({
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        valor: Number(novedad.valor || 0),
        horas: Number(novedad.horas || 0),
        dias: novedad.dias || 0,
        observacion: novedad.observacion || '',
        fecha_inicio: novedad.fecha_inicio || '',
        fecha_fin: novedad.fecha_fin || '',
        base_calculo: novedad.base_calculo ? JSON.parse(novedad.base_calculo) : undefined,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      }));
    } catch (error) {
      console.error('🔒 [SECURITY] Error loading novedades:', error);
      await this.logSecurityViolation('payroll_novedades', 'read', 'read_attempt_failed', { empleadoId, periodId, error: error.message });
      throw error;
    }
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('🔒 [SECURITY] No company context');

      console.log('🔒 [SECURITY] Updating novedad:', id, 'for company:', companyId);

      // Transform updates to match database schema
      const dbUpdates: any = { ...updates };
      if (updates.base_calculo) {
        dbUpdates.base_calculo = JSON.stringify(updates.base_calculo);
      }

      const { data, error } = await this.secureUpdate(
        'payroll_novedades',
        dbUpdates,
        { id }
      );

      if (error) {
        console.error('🔒 [SECURITY] Error updating novedad:', error);
        throw error;
      }

      if (!data?.[0]) {
        throw new Error('Novedad not found or access denied');
      }

      const novedad = data[0];
      console.log('✅ [SECURITY] Novedad updated successfully:', novedad.id);

      return {
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        valor: Number(novedad.valor || 0),
        horas: Number(novedad.horas || 0),
        dias: novedad.dias || 0,
        observacion: novedad.observacion || '',
        fecha_inicio: novedad.fecha_inicio || '',
        fecha_fin: novedad.fecha_fin || '',
        base_calculo: novedad.base_calculo ? JSON.parse(novedad.base_calculo) : undefined,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      };
    } catch (error) {
      console.error('🔒 [SECURITY] Error updating novedad:', error);
      await this.logSecurityViolation('payroll_novedades', 'update', 'update_attempt_failed', { id, error: error.message });
      throw error;
    }
  }

  static async deleteNovedad(id: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('🔒 [SECURITY] No company context');

      console.log('🔒 [SECURITY] Deleting novedad:', id, 'for company:', companyId);

      const { error } = await this.secureDelete('payroll_novedades', { id });

      if (error) {
        console.error('🔒 [SECURITY] Error deleting novedad:', error);
        throw error;
      }

      console.log('✅ [SECURITY] Novedad deleted successfully');
    } catch (error) {
      console.error('🔒 [SECURITY] Error deleting novedad:', error);
      await this.logSecurityViolation('payroll_novedades', 'delete', 'delete_attempt_failed', { id, error: error.message });
      throw error;
    }
  }
}