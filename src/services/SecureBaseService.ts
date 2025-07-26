import { supabase } from '@/integrations/supabase/client';

/**
 * SecureBaseService - Base class for all services with built-in security
 * Ensures all queries are automatically filtered by company_id
 */
export abstract class SecureBaseService {
  
  /**
   * Get current user's company ID securely
   */
  protected static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('🔒 [SECURITY] No authenticated user found');
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile?.company_id) {
        console.warn('🔒 [SECURITY] No company_id found for user:', user.id);
        return null;
      }

      return profile.company_id;
    } catch (error) {
      console.error('🔒 [SECURITY] Error getting company ID:', error);
      return null;
    }
  }

  /**
   * Secure query builder - automatically adds company_id filter
   */
  protected static async secureQuery<T = any>(
    tableName: string,
    select: string = '*',
    additionalFilters?: Record<string, any>
  ) {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('🔒 [SECURITY] Access denied: No company context');
    }

    let query = (supabase as any)
      .from(tableName)
      .select(select)
      .eq('company_id', companyId);

    // Add additional filters if provided
    if (additionalFilters) {
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && 'neq' in value) {
          query = query.neq(key, value.neq);
        } else {
          query = query.eq(key, value);
        }
      });
    }

    console.log(`🔒 [SECURITY] Secure query to ${tableName} for company ${companyId}`);
    return query;
  }

  /**
   * Secure insert - automatically adds company_id
   */
  protected static async secureInsert<T = any>(
    tableName: string,
    data: Record<string, any>
  ) {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('🔒 [SECURITY] Access denied: No company context');
    }

    const insertData = {
      ...data,
      company_id: companyId
    };

    console.log(`🔒 [SECURITY] Secure insert to ${tableName} for company ${companyId}`);
    return (supabase as any).from(tableName).insert(insertData);
  }

  /**
   * Secure update - ensures company_id match
   */
  protected static async secureUpdate<T = any>(
    tableName: string,
    data: Record<string, any>,
    conditions: Record<string, any>
  ) {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('🔒 [SECURITY] Access denied: No company context');
    }

    let query = (supabase as any)
      .from(tableName)
      .update(data)
      .eq('company_id', companyId);

    // Add conditions
    Object.entries(conditions).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'neq' in value) {
        query = query.neq(key, value.neq);
      } else {
        query = query.eq(key, value);
      }
    });

    console.log(`🔒 [SECURITY] Secure update to ${tableName} for company ${companyId}`);
    return query;
  }

  /**
   * Secure delete - ensures company_id match
   */
  protected static async secureDelete(
    tableName: string,
    conditions: Record<string, any>
  ) {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('🔒 [SECURITY] Access denied: No company context');
    }

    let query = (supabase as any)
      .from(tableName)
      .delete()
      .eq('company_id', companyId);

    // Add conditions
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    console.log(`🔒 [SECURITY] Secure delete from ${tableName} for company ${companyId}`);
    return query;
  }

  /**
   * Log security violation
   */
  protected static async logSecurityViolation(
    tableName: string,
    action: string,
    violationType: string,
    additionalData?: Record<string, any>
  ) {
    try {
      await supabase.rpc('log_security_violation', {
        p_table_name: tableName,
        p_action: action,
        p_violation_type: violationType,
        p_additional_data: additionalData ? JSON.stringify(additionalData) : null
      });
    } catch (error) {
      console.error('🔒 [SECURITY] Failed to log security violation:', error);
    }
  }

  /**
   * Validate company access for given resource
   */
  protected static async validateCompanyAccess(
    resourceCompanyId: string,
    resourceType: string = 'resource'
  ): Promise<boolean> {
    const userCompanyId = await this.getCurrentUserCompanyId();
    
    if (!userCompanyId) {
      await this.logSecurityViolation(
        resourceType,
        'access_check',
        'no_user_company',
        { resourceCompanyId }
      );
      return false;
    }

    if (userCompanyId !== resourceCompanyId) {
      await this.logSecurityViolation(
        resourceType,
        'access_check',
        'company_mismatch',
        { userCompanyId, resourceCompanyId }
      );
      return false;
    }

    return true;
  }
}