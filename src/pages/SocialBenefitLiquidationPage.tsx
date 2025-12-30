import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiquidationHero } from '@/components/social-benefits/liquidation/LiquidationHero';
import { LiquidationSidebar } from '@/components/social-benefits/liquidation/LiquidationSidebar';
import { EmployeeLiquidationTable } from '@/components/social-benefits/liquidation/EmployeeLiquidationTable';
import { LiquidationActionBar } from '@/components/social-benefits/liquidation/LiquidationActionBar';
import { useSocialBenefitLiquidation } from '@/hooks/useSocialBenefitLiquidation';

type BenefitTypeParam = 'prima' | 'cesantias' | 'intereses_cesantias';

const BENEFIT_LABELS: Record<BenefitTypeParam, string> = {
  prima: 'Prima de Servicios',
  cesantias: 'Cesantías',
  intereses_cesantias: 'Intereses de Cesantías',
};

const BENEFIT_DESCRIPTIONS: Record<BenefitTypeParam, string> = {
  prima: 'La prima de servicios es una prestación social que corresponde a un salario mensual por cada año trabajado, pagada en dos partes: la primera a más tardar el 30 de junio y la segunda a más tardar el 20 de diciembre.',
  cesantias: 'Las cesantías son una prestación social que equivale a un mes de salario por cada año trabajado. Deben consignarse al fondo de cesantías antes del 14 de febrero del año siguiente.',
  intereses_cesantias: 'Los intereses sobre cesantías corresponden al 12% anual sobre el saldo de cesantías acumuladas. Deben pagarse directamente al trabajador antes del 31 de enero de cada año.',
};

export default function SocialBenefitLiquidationPage() {
  const { benefitType, periodKey } = useParams<{ benefitType: string; periodKey: string }>();
  const navigate = useNavigate();

  const validBenefitType = (benefitType as BenefitTypeParam) || 'prima';
  const decodedPeriodKey = periodKey ? decodeURIComponent(periodKey) : '';

  const {
    employees,
    isLoading,
    error,
    summary,
    periodInfo,
    searchTerm,
    setSearchTerm,
    handleLiquidate,
    isLiquidating,
    isLiquidated,
    handleDownloadSummary,
    refetch,
  } = useSocialBenefitLiquidation(validBenefitType, decodedPeriodKey);

  const handleGoBack = () => {
    navigate('/modules/payroll');
  };

  const benefitLabel = BENEFIT_LABELS[validBenefitType] || 'Prestación Social';
  const benefitDescription = BENEFIT_DESCRIPTIONS[validBenefitType] || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleGoBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Regresar a Nómina
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{benefitLabel}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Hero section */}
            <LiquidationHero
              benefitType={validBenefitType}
              benefitLabel={benefitLabel}
              periodLabel={periodInfo?.periodLabel || decodedPeriodKey}
              description={benefitDescription}
            />

            {/* Action bar */}
            <LiquidationActionBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onDownload={handleDownloadSummary}
              onLiquidate={handleLiquidate}
              isLiquidating={isLiquidating}
              isLiquidated={isLiquidated}
              benefitLabel={benefitLabel}
              employeesCount={employees.length}
              totalAmount={summary?.totalAmount || 0}
            />

            {/* Employees table */}
            <EmployeeLiquidationTable
              employees={employees}
              benefitType={validBenefitType}
              isLoading={isLoading}
              error={error}
              onRetry={refetch}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <LiquidationSidebar
              benefitType={validBenefitType}
              periodStart={periodInfo?.periodStart}
              periodEnd={periodInfo?.periodEnd}
              legalDeadline={periodInfo?.legalDeadline}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
