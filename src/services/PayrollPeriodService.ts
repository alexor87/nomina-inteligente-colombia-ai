import { supabase } from '@/integrations/supabase/client';

export interface CompanySettings {
  id: string;
  company_id: string;
  periodicity: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriod {
  id: string;
  company_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'borrador' | 'en_proceso' | 'cerrado' | 'aprobado';
  tipo_periodo: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  modificado_por?: string;
  modificado_en?: string;
  created_at: string;
  updated_at: string;
}

export class PayrollPeriodService {
  // Obtener el company_id del usuario actual
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      console.log('Getting company ID for user:', user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (!profile?.company_id) {
        console.warn('User profile found but no company_id assigned');
        return null;
      }

      console.log('Company ID found:', profile.company_id);
      return profile.company_id;
    } catch (error) {
      console.error('Error getting user company ID:', error);
      return null;
    }
  }

  // Obtener configuración de periodicidad de la empresa
  static async getCompanySettings(): Promise<CompanySettings | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.log('No company ID available for settings');
        return null;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.log('No company settings found, will use defaults');
        return null;
      }
      
      return data as CompanySettings;
    } catch (error) {
      console.error('Error getting company settings:', error);
      return null;
    }
  }

  // Generar rango de fechas según periodicidad
  static generatePeriodDates(periodicity: string, referenceDate: Date = new Date()): { startDate: string; endDate: string } {
    console.log('📅 Generando fechas para periodicidad:', periodicity);
    const today = new Date(referenceDate);
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    switch (periodicity) {
      case 'mensual':
        console.log('📅 Generando periodo mensual');
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };

      case 'quincenal':
        console.log('📅 Generando periodo quincenal');
        if (day <= 15) {
          // Primera quincena del mes
          return {
            startDate: new Date(year, month, 1).toISOString().split('T')[0],
            endDate: new Date(year, month, 15).toISOString().split('T')[0]
          };
        } else {
          // Segunda quincena del mes
          return {
            startDate: new Date(year, month, 16).toISOString().split('T')[0],
            endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
          };
        }

      case 'semanal':
        console.log('📅 Generando periodo semanal');
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Lunes = 1
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return {
          startDate: monday.toISOString().split('T')[0],
          endDate: sunday.toISOString().split('T')[0]
        };

      case 'personalizado':
      default:
        console.log('📅 Periodicidad personalizada o no reconocida, usando mensual como fallback');
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };
    }
  }

  // Crear un nuevo período de nómina
  static async createPayrollPeriod(startDate: string, endDate: string, periodType: string): Promise<PayrollPeriod | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.error('Cannot create payroll period: No company ID found');
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payroll_periods')
        .insert({
          company_id: companyId,
          fecha_inicio: startDate,
          fecha_fin: endDate,
          tipo_periodo: periodType,
          estado: 'borrador',
          modificado_por: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting payroll period:', error);
        return null;
      }
      
      console.log('Payroll period created successfully:', data);
      return data as PayrollPeriod;
    } catch (error) {
      console.error('Error creating payroll period:', error);
      return null;
    }
  }

  // Actualizar período de nómina
  static async updatePayrollPeriod(periodId: string, updates: Partial<PayrollPeriod>): Promise<PayrollPeriod | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payroll_periods')
        .update({
          ...updates,
          modificado_por: user?.id,
          modificado_en: new Date().toISOString()
        })
        .eq('id', periodId)
        .select()
        .single();

      if (error) throw error;
      return data as PayrollPeriod;
    } catch (error) {
      console.error('Error updating payroll period:', error);
      return null;
    }
  }

  // Obtener período actual activo (borrador)
  static async getCurrentActivePeriod(): Promise<PayrollPeriod | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'borrador')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PayrollPeriod | null;
    } catch (error) {
      console.error('Error getting current active period:', error);
      return null;
    }
  }

  // Formatear período para mostrar
  static formatPeriodText(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startFormatted = start.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long'
    });
    
    const endFormatted = end.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `del ${startFormatted} al ${endFormatted}`;
  }

  // Validar si el período es válido
  static validatePeriod(startDate: string, endDate: string): { isValid: boolean; warnings: string[] } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const warnings: string[] = [];
    
    if (diffDays > 31) {
      warnings.push('El período supera 31 días');
    }
    
    if (diffDays < 1) {
      warnings.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
}
