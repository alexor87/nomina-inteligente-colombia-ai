import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  SalaryIncreaseService,
  SalaryIncreaseProposal,
  YearTransitionAnalysis,
} from '@/services/employees/SalaryIncreaseService';

export type WizardStep = 'risk-analysis' | 'policy' | 'review-confirm';
export type PolicyType = 'uniform' | 'by-role' | 'individual';

export function useSalaryIncreaseWizard(year: number, companyId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<WizardStep>('risk-analysis');
  const [proposals, setProposals] = useState<SalaryIncreaseProposal[]>([]);
  const [policyType, setPolicyType] = useState<PolicyType>('uniform');
  const [uniformPercentage, setUniformPercentage] = useState<number>(0);
  const [rolePercentages, setRolePercentages] = useState<Record<string, number>>({});
  const [effectiveDate, setEffectiveDate] = useState<Date>(
    new Date(year, 0, 1) // Jan 1 of the target year
  );

  // ── Load analysis ─────────────────────────────────────────────────────────
  const { data: analysis, isLoading, error } = useQuery<YearTransitionAnalysis>({
    queryKey: ['salary-increase-analysis', year, companyId],
    queryFn: () => SalaryIncreaseService.analyzeYearTransition(year, companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Apply mutation ─────────────────────────────────────────────────────────
  const applyMutation = useMutation({
    mutationFn: () =>
      SalaryIncreaseService.applyIncrements(proposals, effectiveDate, companyId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-increase-analysis', year, companyId] });
      toast({
        title: 'Incrementos aplicados',
        description: `${result.applied} empleados actualizados${result.errors.length > 0 ? `, ${result.errors.length} con errores` : ''}.`,
      });
      navigate('/modules/settings');
    },
    onError: (err: Error) => {
      toast({ title: 'Error aplicando incrementos', description: err.message, variant: 'destructive' });
    },
  });

  // ── Step navigation ────────────────────────────────────────────────────────
  const goToStep = useCallback((step: WizardStep) => setCurrentStep(step), []);

  const handleStep1Next = useCallback(() => {
    if (!analysis) return;
    // Initialize proposals from analysis
    setProposals(analysis.proposals);
    setCurrentStep('policy');
  }, [analysis]);

  const handleStep2Next = useCallback(() => {
    if (!analysis) return;
    let updated = [...proposals];
    if (policyType === 'uniform') {
      updated = SalaryIncreaseService.applyUniformPercentage(updated, uniformPercentage, analysis.smlmv);
    } else if (policyType === 'by-role') {
      updated = SalaryIncreaseService.applyRolePercentages(updated, rolePercentages, analysis.smlmv);
    }
    setProposals(updated);
    setCurrentStep('review-confirm');
  }, [analysis, proposals, policyType, uniformPercentage, rolePercentages]);

  const handleStep3Confirm = useCallback(() => {
    applyMutation.mutate();
  }, [applyMutation]);

  const updateProposal = useCallback((employeeId: string, updates: Partial<SalaryIncreaseProposal>) => {
    setProposals(prev =>
      prev.map(p => (p.employeeId === employeeId ? { ...p, ...updates } : p))
    );
  }, []);

  return {
    currentStep,
    goToStep,
    analysis,
    isLoading,
    error,
    proposals,
    setProposals,
    updateProposal,
    policyType,
    setPolicyType,
    uniformPercentage,
    setUniformPercentage,
    rolePercentages,
    setRolePercentages,
    effectiveDate,
    setEffectiveDate,
    handleStep1Next,
    handleStep2Next,
    handleStep3Confirm,
    isApplying: applyMutation.isPending,
  };
}
