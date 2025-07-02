import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad, CreateNovedadData } from '@/types/novedades-enhanced';
import { calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';
import { PayrollPeriodService } from './PayrollPeriodService';

export class NovedadesEnhancedService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile?.company_id) return null;
      return profile.company_id;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  static async createNovedad(data: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Enhanced validation with debugging
      if (!data.empleado_id) {
        console.error('❌ Missing empleado_id in createNovedad');
        throw new Error('empleado_id is required');
      }
      
      if (!data.periodo_id) {
        console.error('❌ Missing periodo_id in createNovedad');
        throw new Error('periodo_id is required');
      }

      if (!data.tipo_novedad) {
        console.error('❌ Missing tipo_novedad in createNovedad');
        throw new Error('tipo_novedad is required');
      }

      console.log('📝 Creating novedad with enhanced debugging:', {
        empleado_id: data.empleado_id,
        periodo_id: data.periodo_id,
        tipo_novedad: data.tipo_novedad,
        valor: data.valor,
        company_id: companyId
      });

      // Validate the provided period exists and belongs to the company
      console.log('🔍 Validating provided period:', data.periodo_id);
      
      const { data: periodExists, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('id, estado, periodo, fecha_inicio')
        .eq('id', data.periodo_id)
        .eq('company_id', companyId)
        .single();

      if (periodError || !periodExists) {
        console.error('❌ Invalid period provided:', { periodError, periodo_id: data.periodo_id });
        throw new Error('Invalid period ID provided');
      }

      // Allow editing only if period is in 'borrador' or 'reabierto' state
      if (!['borrador', 'reabierto'].includes(periodExists.estado)) {
        console.error('❌ Period is not editable. Current state:', periodExists.estado);
        throw new Error('This period cannot be edited. Only draft or reopened periods can be modified.');
      }

      console.log('✅ Period validated successfully:', periodExists);

      // Enhanced employee validation
      const { data: employeeExists, error: employeeError } = await supabase
        .from('employees')
        .select('id, salario_base, nombre, apellido')
        .eq('id', data.empleado_id)
        .eq('company_id', companyId)
        .single();

      if (employeeError || !employeeExists) {
        console.error('❌ Employee validation failed:', { employeeError, data: data.empleado_id });
        throw new Error(`Invalid employee ID: ${data.empleado_id}`);
      }

      console.log('✅ Employee validated successfully:', employeeExists);
      
      // Use period date for enhanced calculations - default to current date if no period date
      const fechaPeriodoReal = new Date();

      // Enhanced auto-calculation with period-specific legal workday
      let valorFinal = data.valor || 0;
      let baseCalculoMejorada = data.base_calculo;

      if ((data.horas || data.dias) && employeeExists.salario_base) {
        try {
          console.log('🧮 Performing auto-calculation with period date:', fechaPeriodoReal.toISOString().split('T')[0]);
          
          const resultadoCalculo = calcularValorNovedadEnhanced(
            data.tipo_novedad,
            data.subtipo,
            Number(employeeExists.salario_base),
            data.dias,
            data.horas,
            fechaPeriodoReal
          );

          if (resultadoCalculo.valor > 0) {
            valorFinal = resultadoCalculo.valor;
            baseCalculoMejorada = resultadoCalculo.baseCalculo;
            console.log('💰 Auto-calculated value with period-specific legal workday:', valorFinal);
          }
        } catch (calcError) {
          console.warn('⚠️ Could not auto-calculate, using provided value:', calcError);
        }
      }

      // Final value validation
      if (!valorFinal || valorFinal <= 0) {
        console.error('❌ Invalid final value:', valorFinal);
        throw new Error('Valor must be greater than 0');
      }

      const insertData = {
        company_id: companyId,
        empleado_id: data.empleado_id,
        periodo_id: data.periodo_id,
        tipo_novedad: data.tipo_novedad as any,
        valor: Number(valorFinal),
        horas: data.horas ? Number(data.horas) : null,
        dias: data.dias ? Number(data.dias) : null,
        observacion: data.observacion || null,
        fecha_inicio: data.fecha_inicio || null,
        fecha_fin: data.fecha_fin || null,
        base_calculo: baseCalculoMejorada ? JSON.stringify(baseCalculoMejorada) : null,
        creado_por: user.id
      };

      console.log('📤 Inserting enhanced novedad with validated period from payroll_periods_real:', insertData);
      
      const { data: result, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData)
        .select(`
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
        `)
        .single();

      if (error) {
        console.error('❌ Error inserting enhanced novedad:', error);
        console.error('Insert data that failed:', insertData);
        
        // Provide more specific error messages
        if (error.code === '23503') {
          throw new Error('The selected period is no longer valid. Please refresh the page and try again.');
        } else if (error.code === '23505') {
          throw new Error('A similar novedad already exists for this employee and period.');
        }
        
        throw error;
      }

      console.log('✅ Enhanced novedad created successfully with proper period association:', result);
      
      return {
        id: result.id,
        company_id: result.company_id,
        empleado_id: result.empleado_id,
        periodo_id: result.periodo_id,
        tipo_novedad: result.tipo_novedad as any,
        valor: Number(result.valor || 0),
        horas: result.horas ? Number(result.horas) : 0,
        dias: result.dias || 0,
        observacion: result.observacion || '',
        fecha_inicio: result.fecha_inicio || '',
        fecha_fin: result.fecha_fin || '',
        base_calculo: result.base_calculo ? JSON.parse(result.base_calculo) : undefined,
        created_at: result.created_at,
        updated_at: result.updated_at
      };
    } catch (error) {
      console.error('❌ Error creating enhanced novedad:', error);
      throw error;
    }
  }

  static async getNovedadesByEmployee(empleadoId: string, periodId: string): Promise<PayrollNovedad[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.error('❌ No company ID found for getNovedadesByEmployee');
        return [];
      }

      console.log('🔍 Enhanced loading novedades for employee:', empleadoId, 'period:', periodId, 'company:', companyId);

      // Enhanced query with better error handling
      const { data, error } = await supabase
        .from('payroll_novedades')
        .select(`
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
        `)
        .eq('company_id', companyId)
        .eq('empleado_id', empleadoId)
        .eq('periodo_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading novedades with enhanced service:', error);
        throw error;
      }

      console.log('📊 Enhanced novedades query result:', {
        query_params: { companyId, empleadoId, periodId },
        result_count: data?.length || 0,
        data: data
      });

      if (!data || data.length === 0) {
        console.log('⚠️ No novedades found, running additional diagnostic queries...');
        
        // Diagnostic query 1: Check all novedades for this employee
        const { data: allForEmployee } = await supabase
          .from('payroll_novedades')
          .select('periodo_id, tipo_novedad, valor')
          .eq('company_id', companyId)
          .eq('empleado_id', empleadoId);
        
        console.log('🔍 All novedades for this employee:', allForEmployee);
        
        // Diagnostic query 2: Check all novedades for this period
        const { data: allForPeriod } = await supabase
          .from('payroll_novedades')
          .select('empleado_id, tipo_novedad, valor')
          .eq('company_id', companyId)
          .eq('periodo_id', periodId);
        
        console.log('🔍 All novedades for this period:', allForPeriod);
      }

      return (data || []).map(novedad => ({
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad as any,
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
      console.error('❌ Error in enhanced getNovedadesByEmployee:', error);
      throw error;
    }
  }

  static async getNovedadesByPeriod(periodId: string): Promise<PayrollNovedad[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      console.log('🔍 Loading novedades for period:', periodId);

      const { data, error } = await supabase
        .from('payroll_novedades')
        .select(`
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
        `)
        .eq('company_id', companyId)
        .eq('periodo_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading novedades:', error);
        throw error;
      }

      console.log('📊 Loaded novedades for period:', data);

      return (data || []).map(novedad => ({
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad as any,
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
      console.error('Error loading novedades:', error);
      throw error;
    }
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      console.log('📝 Updating novedad:', id, 'with updates:', updates);

      // Transform updates to match database schema
      const dbUpdates: any = { ...updates };
      if (updates.base_calculo) {
        dbUpdates.base_calculo = JSON.stringify(updates.base_calculo);
      }
      
      // Add type assertion for tipo_novedad if present
      if (updates.tipo_novedad) {
        dbUpdates.tipo_novedad = updates.tipo_novedad as any;
      }

      const { data, error } = await supabase
        .from('payroll_novedades')
        .update(dbUpdates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select(`
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
        `)
        .single();

      if (error) {
        console.error('Error updating novedad:', error);
        throw error;
      }

      console.log('✅ Novedad updated successfully:', data);

      return {
        id: data.id,
        company_id: data.company_id,
        empleado_id: data.empleado_id,
        periodo_id: data.periodo_id,
        tipo_novedad: data.tipo_novedad as any,
        valor: Number(data.valor || 0),
        horas: Number(data.horas || 0),
        dias: data.dias || 0,
        observacion: data.observacion || '',
        fecha_inicio: data.fecha_inicio || '',
        fecha_fin: data.fecha_fin || '',
        base_calculo: data.base_calculo ? JSON.parse(data.base_calculo) : undefined,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error updating novedad:', error);
      throw error;
    }
  }

  static async deleteNovedad(id: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      console.log('🗑️ Deleting novedad:', id);

      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting novedad:', error);
        throw error;
      }

      console.log('✅ Novedad deleted successfully');
    } catch (error) {
      console.error('Error deleting novedad:', error);
      throw error;
    }
  }
}
