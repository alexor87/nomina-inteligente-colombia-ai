import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSalaryIncreaseWizard, WizardStep } from './hooks/useSalaryIncreaseWizard';
import { Step1RiskAnalysis } from './steps/Step1RiskAnalysis';
import { Step2Policy } from './steps/Step2Policy';
import { Step3ReviewConfirm } from './steps/Step3ReviewConfirm';

interface Props {
  year: number;
  companyId: string;
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'risk-analysis', label: 'Análisis de riesgo' },
  { id: 'policy', label: 'Política' },
  { id: 'review-confirm', label: 'Revisión y confirmación' },
];

const STEP_INDEX: Record<WizardStep, number> = {
  'risk-analysis': 0,
  'policy': 1,
  'review-confirm': 2,
};

export function SalaryIncreaseWizard({ year, companyId }: Props) {
  const wizard = useSalaryIncreaseWizard(year, companyId);
  const activeIndex = STEP_INDEX[wizard.currentStep];

  if (wizard.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Analizando empleados…
      </div>
    );
  }

  if (wizard.error || !wizard.analysis) {
    return (
      <div className="py-10 text-center text-destructive">
        Error cargando el análisis. Verifica que el SMLMV {year} esté configurado en Parámetros Legales.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <nav aria-label="Progreso del wizard">
        <ol className="flex items-center gap-0">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isActive = idx === activeIndex;
            return (
              <React.Fragment key={step.id}>
                <li className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      isActive && 'border-primary text-primary',
                      !isCompleted && !isActive && 'border-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </li>
                {idx < STEPS.length - 1 && (
                  <div className={cn('mx-3 h-px flex-1 min-w-[40px]', isCompleted ? 'bg-primary' : 'bg-border')} />
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      {wizard.currentStep === 'risk-analysis' && (
        <Step1RiskAnalysis
          analysis={wizard.analysis}
          year={year}
          onNext={wizard.handleStep1Next}
        />
      )}

      {wizard.currentStep === 'policy' && (
        <Step2Policy
          proposals={wizard.proposals}
          smlmv={wizard.analysis.smlmv}
          policyType={wizard.policyType}
          uniformPercentage={wizard.uniformPercentage}
          rolePercentages={wizard.rolePercentages}
          onPolicyTypeChange={wizard.setPolicyType}
          onUniformPercentageChange={wizard.setUniformPercentage}
          onRolePercentageChange={(cargo, pct) =>
            wizard.setRolePercentages(prev => ({ ...prev, [cargo]: pct }))
          }
          onNext={wizard.handleStep2Next}
          onBack={() => wizard.goToStep('risk-analysis')}
        />
      )}

      {wizard.currentStep === 'review-confirm' && (
        <Step3ReviewConfirm
          proposals={wizard.proposals}
          smlmv={wizard.analysis.smlmv}
          effectiveDate={wizard.effectiveDate}
          onEffectiveDateChange={wizard.setEffectiveDate}
          onUpdateProposal={wizard.updateProposal}
          onConfirm={wizard.handleStep3Confirm}
          onBack={() => wizard.goToStep('policy')}
          isApplying={wizard.isApplying}
        />
      )}
    </div>
  );
}
