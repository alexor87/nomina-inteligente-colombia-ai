import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuperAdminService } from '../SuperAdminService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import { supabase } from '@/integrations/supabase/client';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>
};

describe('SuperAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SuperAdminService.invalidatePlansCache();
  });

  describe('getDashboardMetrics()', () => {
    it('calculates MRR correctly from active subscriptions', async () => {
      const mockCompanies = [
        { id: '1', estado: 'activa', plan: 'basico', created_at: '2024-01-01' },
        { id: '2', estado: 'activa', plan: 'profesional', created_at: '2024-02-01' },
        { id: '3', estado: 'trial', plan: 'basico', created_at: '2024-03-01' }
      ];

      const mockSubscriptions = [
        { company_id: '1', plan_type: 'basico', status: 'activa', trial_ends_at: null },
        { company_id: '2', plan_type: 'profesional', status: 'activa', trial_ends_at: null },
        { company_id: '3', plan_type: 'basico', status: 'trial', trial_ends_at: '2099-12-31' }
      ];

      const mockEmployees = [
        { company_id: '1' },
        { company_id: '1' },
        { company_id: '2' }
      ];

      // Setup mock chain for companies
      const selectMock = vi.fn();
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'companies') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockCompanies, error: null })
          };
        }
        if (table === 'company_subscriptions') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null })
          };
        }
        if (table === 'employees') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockEmployees, error: null })
          };
        }
        if (table === 'subscription_plans') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { plan_id: 'basico', nombre: 'Básico', precio: 15000, max_employees: 10, max_payrolls_per_month: 5 },
                    { plan_id: 'profesional', nombre: 'Profesional', precio: 35000, max_employees: 50, max_payrolls_per_month: 20 }
                  ],
                  error: null
                })
              })
            })
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const metrics = await SuperAdminService.getDashboardMetrics();

      // MRR: basico (15000) + profesional (35000) = 50000
      expect(metrics.mrr).toBe(50000);
      expect(metrics.activeCompanies).toBe(2);
      expect(metrics.trialCompanies).toBe(1);
      expect(metrics.totalCompanies).toBe(3);
      expect(metrics.totalEmployees).toBe(3);
    });

    it('identifies trials expiring within 7 days', async () => {
      const now = new Date();
      const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const inTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

      const mockCompanies = [
        { id: '1', estado: 'trial', plan: 'basico', created_at: '2024-01-01' },
        { id: '2', estado: 'trial', plan: 'basico', created_at: '2024-02-01' }
      ];

      const mockSubscriptions = [
        { company_id: '1', plan_type: 'basico', status: 'trial', trial_ends_at: inFiveDays },
        { company_id: '2', plan_type: 'basico', status: 'trial', trial_ends_at: inTenDays }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'companies') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockCompanies, error: null })
          };
        }
        if (table === 'company_subscriptions') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null })
          };
        }
        if (table === 'employees') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        if (table === 'subscription_plans') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const metrics = await SuperAdminService.getDashboardMetrics();

      // Only 1 trial expires within 7 days
      expect(metrics.expiringTrials).toBe(1);
    });

    it('throws error when companies query fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscription_plans') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') })
        };
      });

      await expect(SuperAdminService.getDashboardMetrics()).rejects.toThrow('DB Error');
    });
  });

  describe('changeCompanyPlan()', () => {
    it('updates subscription and creates audit event', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'company_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { plan_type: 'basico', status: 'activa' },
                  error: null
                })
              })
            }),
            update: updateMock
          };
        }
        if (table === 'companies') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'subscription_events') {
          return { insert: insertMock };
        }
        if (table === 'subscription_plans') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          };
        }
        return {};
      });

      await SuperAdminService.changeCompanyPlan(
        'company-123',
        'profesional',
        'Upgrade solicitado',
        'admin-user-id'
      );

      expect(updateMock).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        company_id: 'company-123',
        previous_plan: 'basico',
        new_plan: 'profesional',
        reason: 'Upgrade solicitado',
        changed_by: 'admin-user-id'
      }));
    });
  });

  describe('toggleCompanyStatus()', () => {
    it('changes status and registers audit event', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'company_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { plan_type: 'basico', status: 'activa' },
                  error: null
                })
              })
            }),
            update: updateMock
          };
        }
        if (table === 'companies') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'subscription_events') {
          return { insert: insertMock };
        }
        if (table === 'subscription_plans') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          };
        }
        return {};
      });

      await SuperAdminService.toggleCompanyStatus(
        'company-456',
        'suspendida',
        'Falta de pago',
        'admin-user-id'
      );

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        company_id: 'company-456',
        previous_status: 'activa',
        new_status: 'suspendida',
        reason: 'Falta de pago'
      }));
    });
  });

  describe('getAllCompaniesWithSubscriptions()', () => {
    it('returns companies with employee counts and subscriptions', async () => {
      const mockCompanies = [
        { id: '1', razon_social: 'Empresa A', nit: '123', email: 'a@test.com', plan: 'basico', estado: 'activa', created_at: '2024-01-01' }
      ];

      const mockSubscriptions = [
        { company_id: '1', plan_type: 'basico', status: 'activa', trial_ends_at: null, max_employees: 10, max_payrolls_per_month: 5 }
      ];

      const mockEmployees = [
        { company_id: '1' },
        { company_id: '1' },
        { company_id: '1' }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockCompanies, error: null })
            })
          };
        }
        if (table === 'company_subscriptions') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null })
          };
        }
        if (table === 'employees') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockEmployees, error: null })
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const companies = await SuperAdminService.getAllCompaniesWithSubscriptions();

      expect(companies).toHaveLength(1);
      expect(companies[0].employee_count).toBe(3);
      expect(companies[0].subscription?.plan_type).toBe('basico');
    });
  });

  describe('getSubscriptionEvents()', () => {
    it('retrieves events with company names', async () => {
      const mockEvents = [
        { id: 'evt-1', company_id: 'comp-1', new_plan: 'profesional', new_status: 'activa', reason: 'Upgrade' }
      ];

      const mockCompanies = [
        { id: 'comp-1', razon_social: 'Mi Empresa' }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscription_events') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
              })
            })
          };
        }
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockCompanies, error: null })
            })
          };
        }
        return {};
      });

      const events = await SuperAdminService.getSubscriptionEvents();

      expect(events).toHaveLength(1);
      expect(events[0].company_name).toBe('Mi Empresa');
    });
  });
});
