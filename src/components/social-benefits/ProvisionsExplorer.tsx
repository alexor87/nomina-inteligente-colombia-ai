
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProvisionsFilters } from './ProvisionsFilters';
import { ProvisionsSummary } from './ProvisionsSummary';
import { ProvisionsTable } from './ProvisionsTable';
import { useSocialBenefitProvisions } from '@/hooks/useSocialBenefitProvisions';
import { PiggyBank } from 'lucide-react';

export const ProvisionsExplorer: React.FC = () => {
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
  } = useSocialBenefitProvisions();

  if (loadingPeriods) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Provisiones de Prestaciones Sociales
          </CardTitle>
          <CardDescription>Cargando períodos disponibles...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Provisiones de Prestaciones Sociales
          </CardTitle>
          <CardDescription>
            Consulta y exporta las provisiones calculadas por período, con filtros por tipo y búsqueda por empleado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProvisionsFilters
            periods={periods}
            selectedPeriodId={filters.periodId}
            onChangePeriod={setPeriodId}
            benefitType={filters.benefitType}
            onChangeBenefitType={setBenefitType}
            search={filters.search}
            onSearchChange={setSearch}
            onRecalculate={recalculateCurrentPeriod}
            recalculating={recalculating}
            onExport={exportCSV}
          />

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
            exportCSV={exportCSV}
          />
        </CardContent>
      </Card>
    </div>
  );
};
