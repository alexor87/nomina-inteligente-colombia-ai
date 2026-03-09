import { supabase } from '@/integrations/supabase/client';

export interface CompanyWithSubscription {
  id: string;
  razon_social: string;
  nit: string;
  email: string;
  plan: string | null;
  estado: string | null;
  created_at: string;
  employee_count: number;
  subscription: {
    plan_type: string | null;
    status: string | null;
    trial_ends_at: string | null;
    max_employees: number | null;
    max_payrolls_per_month: number | null;
  } | null;
}

export interface SaaSMetrics {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  suspendedCompanies: number;
  totalEmployees: number;
  mrr: number;
  expiringTrials: number;
  planDistribution: { name: string; value: number }[];
  growthData: { month: string; companies: number }[];
}

export interface SubscriptionEvent {
  id: string;
  company_id: string;
  previous_plan: string | null;
  new_plan: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string;
  metadata: any;
  created_at: string;
  company_name?: string;
}

// Cache for dynamic plans from DB
let plansCache: { plan_id: string; nombre: string; precio: number; max_employees: number; max_payrolls_per_month: number }[] | null = null;
let plansCacheTime = 0;
const PLANS_CACHE_TTL = 60000; // 1 minute

const fetchPlans = async () => {
  if (plansCache && Date.now() - plansCacheTime < PLANS_CACHE_TTL) return plansCache;
  const { data } = await supabase
    .from('subscription_plans')
    .select('plan_id, nombre, precio, max_employees, max_payrolls_per_month')
    .eq('is_active', true)
    .order('sort_order');
  plansCache = (data as any[]) || [];
  plansCacheTime = Date.now();
  return plansCache;
};

const getPlanPrice = async (planType: string | null): Promise<number> => {
  const plans = await fetchPlans();
  const plan = plans.find(p => p.plan_id === planType);
  return plan?.precio || 0;
};

export const SuperAdminService = {
  invalidatePlansCache() {
    plansCache = null;
    plansCacheTime = 0;
  },

  async getActivePlans() {
    return fetchPlans();
  },

  async getDashboardMetrics(): Promise<SaaSMetrics> {
    // Fetch companies with subscriptions
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('id, estado, plan, created_at');

    if (compError) throw compError;

    const { data: subscriptions, error: subError } = await supabase
      .from('company_subscriptions')
      .select('company_id, plan_type, status, trial_ends_at');

    if (subError) throw subError;

    // Employee count per company
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('company_id');

    if (empError) throw empError;

    const subMap = new Map(subscriptions?.map(s => [s.company_id, s]) || []);
    const empCountMap = new Map<string, number>();
    employees?.forEach(e => {
      empCountMap.set(e.company_id, (empCountMap.get(e.company_id) || 0) + 1);
    });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let activeCompanies = 0;
    let trialCompanies = 0;
    let suspendedCompanies = 0;
    let mrr = 0;
    let expiringTrials = 0;
    const planCounts: Record<string, number> = {};

    companies?.forEach(company => {
      const sub = subMap.get(company.id);
      const status = sub?.status || company.estado;
      const planType = sub?.plan_type || company.plan;

      if (status === 'activa') {
        activeCompanies++;
        // mrr calculated below after async plan price lookup
      }
      if (status === 'trial') {
        trialCompanies++;
        if (sub?.trial_ends_at) {
          const trialEnd = new Date(sub.trial_ends_at);
          if (trialEnd <= sevenDaysFromNow && trialEnd >= now) {
            expiringTrials++;
          }
        }
      }
      if (status === 'suspendida') suspendedCompanies++;

      const planName = planType || 'sin_plan';
      planCounts[planName] = (planCounts[planName] || 0) + 1;
    });

    // Growth data (last 6 months)
    const growthData: { month: string; companies: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = companies?.filter(c => c.created_at <= new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()).length || 0;
      growthData.push({ month: monthKey, companies: count });
    }

    return {
      totalCompanies: companies?.length || 0,
      activeCompanies,
      trialCompanies,
      suspendedCompanies,
      totalEmployees: employees?.length || 0,
      mrr,
      expiringTrials,
      planDistribution: Object.entries(planCounts).map(([name, value]) => ({ name, value })),
      growthData
    };
  },

  async getAllCompaniesWithSubscriptions(): Promise<CompanyWithSubscription[]> {
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('id, razon_social, nit, email, plan, estado, created_at')
      .order('created_at', { ascending: false });

    if (compError) throw compError;

    const { data: subscriptions, error: subError } = await supabase
      .from('company_subscriptions')
      .select('company_id, plan_type, status, trial_ends_at, max_employees, max_payrolls_per_month');

    if (subError) throw subError;

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('company_id');

    if (empError) throw empError;

    const subMap = new Map(subscriptions?.map(s => [s.company_id, s]) || []);
    const empCountMap = new Map<string, number>();
    employees?.forEach(e => {
      empCountMap.set(e.company_id, (empCountMap.get(e.company_id) || 0) + 1);
    });

    return (companies || []).map(company => ({
      ...company,
      employee_count: empCountMap.get(company.id) || 0,
      subscription: subMap.get(company.id) || null
    }));
  },

  async changeCompanyPlan(
    companyId: string,
    newPlan: string,
    reason: string,
    changedBy: string
  ): Promise<void> {
    // Get current subscription
    const { data: currentSub } = await supabase
      .from('company_subscriptions')
      .select('plan_type, status')
      .eq('company_id', companyId)
      .maybeSingle();

    const planConfig = PLANES_SAAS.find(p => p.id === newPlan);
    const maxEmployees = planConfig?.empleados === -1 ? 9999 : (planConfig?.empleados || 10);

    // Update subscription
    const { error: updateError } = await supabase
      .from('company_subscriptions')
      .update({
        plan_type: newPlan,
        max_employees: maxEmployees,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId);

    if (updateError) throw updateError;

    // Update company plan
    await supabase
      .from('companies')
      .update({ plan: newPlan, updated_at: new Date().toISOString() })
      .eq('id', companyId);

    // Insert audit event
    const { error: eventError } = await supabase
      .from('subscription_events')
      .insert({
        company_id: companyId,
        previous_plan: currentSub?.plan_type || null,
        new_plan: newPlan,
        previous_status: currentSub?.status || 'activa',
        new_status: currentSub?.status || 'activa',
        changed_by: changedBy,
        reason
      });

    if (eventError) throw eventError;
  },

  async toggleCompanyStatus(
    companyId: string,
    newStatus: 'activa' | 'suspendida',
    reason: string,
    changedBy: string
  ): Promise<void> {
    const { data: currentSub } = await supabase
      .from('company_subscriptions')
      .select('plan_type, status')
      .eq('company_id', companyId)
      .maybeSingle();

    // Update subscription status
    await supabase
      .from('company_subscriptions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('company_id', companyId);

    // Update company estado
    await supabase
      .from('companies')
      .update({ estado: newStatus, updated_at: new Date().toISOString() })
      .eq('id', companyId);

    // Audit event
    await supabase.from('subscription_events').insert({
      company_id: companyId,
      previous_plan: currentSub?.plan_type || 'basico',
      new_plan: currentSub?.plan_type || 'basico',
      previous_status: currentSub?.status || 'activa',
      new_status: newStatus,
      changed_by: changedBy,
      reason
    });
  },

  async getSubscriptionEvents(companyId?: string): Promise<SubscriptionEvent[]> {
    let query = supabase
      .from('subscription_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with company names
    if (data && data.length > 0) {
      const companyIds = [...new Set(data.map(e => e.company_id))];
      const { data: companies } = await supabase
        .from('companies')
        .select('id, razon_social')
        .in('id', companyIds);

      const companyMap = new Map(companies?.map(c => [c.id, c.razon_social]) || []);
      return data.map(event => ({
        ...event,
        company_name: companyMap.get(event.company_id) || 'Desconocida'
      }));
    }

    return data || [];
  },

  async updateCompanyLimits(
    companyId: string,
    maxEmployees: number,
    maxPayrolls: number,
    reason: string,
    changedBy: string
  ): Promise<void> {
    const { data: currentSub } = await supabase
      .from('company_subscriptions')
      .select('plan_type, status, max_employees, max_payrolls_per_month')
      .eq('company_id', companyId)
      .maybeSingle();

    const { error: updateError } = await supabase
      .from('company_subscriptions')
      .update({
        max_employees: maxEmployees,
        max_payrolls_per_month: maxPayrolls,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId);

    if (updateError) throw updateError;

    await supabase.from('subscription_events').insert({
      company_id: companyId,
      previous_plan: currentSub?.plan_type || 'basico',
      new_plan: currentSub?.plan_type || 'basico',
      previous_status: currentSub?.status || 'activa',
      new_status: currentSub?.status || 'activa',
      changed_by: changedBy,
      reason: `Límites ajustados: empleados ${currentSub?.max_employees ?? '?'} → ${maxEmployees}, nóminas ${currentSub?.max_payrolls_per_month ?? '?'} → ${maxPayrolls}. Razón: ${reason}`
    });
  },

  async getCompanyDetail(companyId: string) {
    const [companyRes, subRes, employeesRes, usersRes, eventsRes] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('company_subscriptions').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('employees').select('id, nombre, apellido, cargo, estado').eq('company_id', companyId),
      supabase.from('profiles').select('id, user_id, first_name, last_name, company_id').eq('company_id', companyId),
      supabase.from('subscription_events').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
    ]);

    // Get user roles for this company's users
    const userIds = usersRes.data?.map(u => u.user_id) || [];
    let userRoles: any[] = [];
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, role, company_id')
        .in('user_id', userIds);
      userRoles = data || [];
    }

    return {
      company: companyRes.data,
      subscription: subRes.data,
      employees: employeesRes.data || [],
      users: (usersRes.data || []).map(u => ({
        ...u,
        roles: userRoles.filter(r => r.user_id === u.user_id)
      })),
      events: eventsRes.data || []
    };
  }
};
