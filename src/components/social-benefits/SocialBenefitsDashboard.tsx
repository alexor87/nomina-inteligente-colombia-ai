
import React from 'react';
import { ProvisionsTable } from './ProvisionsTable';
import { SummaryCards } from './SummaryCards';
import { ProvisionModeIndicator } from './ProvisionModeIndicator';
import { useSocialBenefitProvisions } from '@/hooks/useSocialBenefitProvisions';
import { useProvisionMode } from '@/hooks/useProvisionMode';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

const DASHBOARD_CONTENT = {
  title: 'Provisiones de Prestaciones Sociales',
  description: 'Gestiona y consulta las provisiones de cesantías, prima de servicios e intereses',
};

export const SocialBenefitsDashboard = () => {
  const { companyId } = useCurrentCompany();
  const { provisionMode, loadingSettings } = useProvisionMode(companyId);

  const {
    periods,
    loadingPeriods,
    provisions,
    loadingProvisions,
    filters,
    setPeriodId,
    setBenefitType,
    setSearch,
    totals,
    page,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    paginated,
    recalculateCurrentPeriod,
    recalculating,
    exportCSV,
    refetch,
  } = useSocialBenefitProvisions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{DASHBOARD_CONTENT.title}</h2>
        <p className="text-muted-foreground">{DASHBOARD_CONTENT.description}</p>
      </div>
      
      {/* Provision Mode Indicator */}
      <ProvisionModeIndicator
        provisionMode={provisionMode}
        loadingSettings={loadingSettings}
        onConsolidated={refetch}
      />

      {/* Summary Cards */}
      <SummaryCards totals={totals} />

      {/* Provisions Table */}
      <ProvisionsTable
        periods={periods}
        loadingPeriods={loadingPeriods}
        provisions={paginated}
        loadingProvisions={loadingProvisions}
        filters={filters}
        setPeriodId={setPeriodId}
        setBenefitType={setBenefitType}
        setSearch={setSearch}
        totals={totals}
        page={page}
        pageSize={pageSize}
        setPage={setPage}
        setPageSize={setPageSize}
        totalPages={totalPages}
        recalculateCurrentPeriod={recalculateCurrentPeriod}
        recalculating={recalculating}
        exportCSV={exportCSV}
        showConsolidateButton={provisionMode === 'monthly_consolidation'}
      />
    </div>
  );
};
