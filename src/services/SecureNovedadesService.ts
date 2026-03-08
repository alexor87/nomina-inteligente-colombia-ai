import { SecureBaseService } from './SecureBaseService';
import { PayrollNovedad, CreateNovedadData } from '@/types/novedades';
import { logger } from '@/lib/logger';

/**
 * 🔒 SECURE VERSION: NovedadesService with built-in company isolation
 */
export class SecureNovedadesService extends SecureBaseService {
  
  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('🔒 [SECURITY] No company context');

      // Validate period belongs to user's company
      const { data: periodExists, error: periodError } = await this.secureQuery(
        'payroll_periods_real', companyId, 'id', { id: novedadData.periodo_id }
      );
      if (periodError || !periodExists?.length) {
        throw new Error(`Invalid period ID: ${novedadData.periodo_id}`);
      }

      // Validate employee belongs to user's company
      const { data: employeeExists, error: employeeError } = await this.secureQuery(
        'employees', companyId, 'id', { id: novedadData.empleado_id }
      );
      if (employeeError || !employeeExists?.length) {
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

      if (error) throw error;
      if (!data?.[0]) throw new Error('No data returned from insert');

      const novedad = data[0];
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
      logger.error('❌ Error creating novedad:', error);
      await this.logSecurityViolation('payroll_novedades', 'create', 'create_attempt_failed', { error: (error as Error).message });
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

      const { data, error } = await this.secureQuery(
        'payroll_novedades', companyId,
        'id,company_id,empleado_id,periodo_id,tipo_novedad,valor,horas,dias,observacion,fecha_inicio,fecha_fin,base_calculo,created_at,updated_at',
        { empleado_id: empleadoId, periodo_id: periodId }
      );

      if (error) throw error;

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
      logger.error('❌ Error loading novedades:', error);
      await this.logSecurityViolation('payroll_novedades', 'read', 'read_attempt_failed', { empleadoId, periodId, error: (error as Error).message });
      throw error;
    }
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('🔒 [SECURITY] No company context');

      const dbUpdates: any = { ...updates };
      if (updates.base_calculo) {
        dbUpdates.base_calculo = JSON.stringify(updates.base_calculo);
      }

      const { data, error } = await this.secureUpdate('payroll_novedades', dbUpdates, { id });

      if (error) throw error;
      if (!data?.[0]) throw new Error('Novedad not found or access denied');

      const novedad = data[0];
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
      logger.error('❌ Error updating novedad:', error);
      await this.logSecurityViolation('payroll_novedades', 'update', 'update_attempt_failed', { id, error: (error as Error).message });
      throw error;
    }
  }

  static async deleteNovedad(id: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('🔒 [SECURITY] No company context');

      const { error } = await this.secureDelete('payroll_novedades', { id });
      if (error) throw error;
    } catch (error) {
      logger.error('❌ Error deleting novedad:', error);
      await this.logSecurityViolation('payroll_novedades', 'delete', 'delete_attempt_failed', { id, error: (error as Error).message });
      throw error;
    }
  }
}
