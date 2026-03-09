import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanService, PlanFormData } from '../PlanService';

// Mock supabase client
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const samplePlan = {
  id: '1',
  plan_id: 'basico',
  nombre: 'Básico',
  precio: 99000,
  max_employees: 5,
  max_payrolls_per_month: 1,
  caracteristicas: ['Nómina básica'],
  is_active: true,
  sort_order: 1,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('PlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlans', () => {
    it('should fetch all plans ordered by sort_order', async () => {
      mockEq.mockResolvedValue({ data: [samplePlan], error: null });
      mockOrder.mockReturnValue({ eq: mockEq, then: undefined, data: [samplePlan], error: null });
      // Without activeOnly, no .eq call — resolve directly from order
      mockOrder.mockResolvedValue({ data: [samplePlan], error: null });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const plans = await PlanService.getPlans();

      expect(mockFrom).toHaveBeenCalledWith('subscription_plans');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('sort_order', { ascending: true });
      expect(plans).toEqual([samplePlan]);
    });

    it('should filter active plans when activeOnly=true', async () => {
      mockEq.mockResolvedValue({ data: [samplePlan], error: null });
      mockOrder.mockReturnValue({ eq: mockEq });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const plans = await PlanService.getPlans(true);

      expect(mockEq).toHaveBeenCalledWith('is_active', true);
      expect(plans).toEqual([samplePlan]);
    });

    it('should throw on error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      await expect(PlanService.getPlans()).rejects.toEqual({ message: 'DB error' });
    });

    it('should return empty array when data is null', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      mockSelect.mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const plans = await PlanService.getPlans();
      expect(plans).toEqual([]);
    });
  });

  describe('createPlan', () => {
    it('should insert a plan with correct data', async () => {
      mockInsert.mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const formData: PlanFormData = {
        plan_id: 'premium',
        nombre: 'Premium',
        precio: 199000,
        max_employees: 50,
        max_payrolls_per_month: 4,
        caracteristicas: ['Feature A', 'Feature B'],
        sort_order: 2,
      };

      await PlanService.createPlan(formData);

      expect(mockFrom).toHaveBeenCalledWith('subscription_plans');
      expect(mockInsert).toHaveBeenCalledWith({
        plan_id: 'premium',
        nombre: 'Premium',
        precio: 199000,
        max_employees: 50,
        max_payrolls_per_month: 4,
        caracteristicas: ['Feature A', 'Feature B'],
        sort_order: 2,
      });
    });

    it('should throw on insert error', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'Duplicate' } });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const formData: PlanFormData = {
        plan_id: 'dup',
        nombre: 'Dup',
        precio: 0,
        max_employees: 1,
        max_payrolls_per_month: 1,
        caracteristicas: [],
        sort_order: 1,
      };

      await expect(PlanService.createPlan(formData)).rejects.toEqual({ message: 'Duplicate' });
    });
  });

  describe('updatePlan', () => {
    it('should update plan with provided fields and updated_at', async () => {
      mockEq.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await PlanService.updatePlan('abc-123', { nombre: 'Nuevo nombre', precio: 150000 });

      expect(mockFrom).toHaveBeenCalledWith('subscription_plans');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Nuevo nombre',
          precio: 150000,
          updated_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'abc-123');
    });

    it('should throw on update error', async () => {
      mockEq.mockResolvedValue({ error: { message: 'Not found' } });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await expect(PlanService.updatePlan('x', { nombre: 'test' })).rejects.toEqual({ message: 'Not found' });
    });
  });

  describe('togglePlanStatus', () => {
    it('should update is_active and updated_at', async () => {
      mockEq.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await PlanService.togglePlanStatus('plan-id', false);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          updated_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'plan-id');
    });

    it('should throw on toggle error', async () => {
      mockEq.mockResolvedValue({ error: { message: 'RLS denied' } });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await expect(PlanService.togglePlanStatus('x', true)).rejects.toEqual({ message: 'RLS denied' });
    });
  });
});
