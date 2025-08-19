
import React from 'react';
import { useSocialBenefitProvisions } from '@/hooks/useSocialBenefitProvisions';
import { ProvisionsTable } from './ProvisionsTable';
import { ProvisionsSummary } from './ProvisionsSummary';

export const SocialBenefitsDashboard: React.FC = () => {
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
    exportExcel, // Changed from exportCSV to exportExcel
    refetch,
  } = useSocialBenefitProvisions();

  return (
    <div className="space-y-6">
      <ProvisionsSummary totals={totals} />
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
        exportExcel={exportExcel} // Changed from exportCSV to exportExcel
      />
    </div>
  );
};
