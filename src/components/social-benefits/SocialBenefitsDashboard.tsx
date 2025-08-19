
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProvisionsTable } from './ProvisionsTable';
// Eliminado: import { BenefitCalculatorBase } from './BenefitCalculatorBase';
import { useSocialBenefitProvisions } from '@/hooks/useSocialBenefitProvisions';
import { MonthlyConsolidationButton } from './MonthlyConsolidationButton';
import { CompanySettingsService } from '@/services/CompanySettingsService';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { /* Calculator, FileSpreadsheet, */ AlertCircle, Settings } from 'lucide-react';

export const SocialBenefitsDashboard = () => {
  const { companyId } = useCurrentCompany();
  const [provisionMode, setProvisionMode] = useState<'on_liquidation' | 'monthly_consolidation'>('on_liquidation');
  const [loadingSettings, setLoadingSettings] = useState(true);

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

  // Load company provision mode setting
  useEffect(() => {
    const loadProvisionMode = async () => {
      if (!companyId) return;
      
      try {
        const settings = await CompanySettingsService.getCompanySettings(companyId);
        setProvisionMode(settings?.provision_mode || 'on_liquidation');
      } catch (error) {
        console.error('Error loading provision mode:', error);
        setProvisionMode('on_liquidation'); // fallback
      } finally {
        setLoadingSettings(false);
      }
    };

    loadProvisionMode();
  }, [companyId]);

  return (
    <div className="space-y-6">
      {/* Header with provision mode info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Provisiones de Prestaciones Sociales</h2>
          <p className="text-muted-foreground">
            Gestiona y consulta las provisiones de cesantías, prima de servicios e intereses
          </p>
        </div>
        
        {!loadingSettings && provisionMode === 'monthly_consolidation' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-md border border-blue-200">
              <Settings className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Modo: Consolidado Mensual</span>
            </div>
            <MonthlyConsolidationButton onConsolidated={refetch} />
          </div>
        )}
      </div>

      {/* Mode explanation banner */}
      {!loadingSettings && provisionMode === 'monthly_consolidation' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800">Modo de Consolidado Mensual Activo</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Las provisiones no se calculan automáticamente al liquidar períodos. 
                  Use el botón "Consolidar Mes" para procesar todos los períodos cerrados del mes actual.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cesantías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.byType.cesantias.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prima de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.byType.prima.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Provisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

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
        paginated={paginated}
        recalculateCurrentPeriod={recalculateCurrentPeriod}
        recalculating={recalculating}
        exportCSV={exportCSV}
        showConsolidateButton={provisionMode === 'monthly_consolidation'}
      />

      {/* Eliminado: Calculadora Individual (no se permiten simulaciones) */}
      {/* 
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <CardTitle>Calculadora Individual</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <BenefitCalculatorBase
            benefitType="cesantias"
            title="Cálculo individual de prestaciones"
            description="Calcula una prestación social para un empleado en el período seleccionado."
          />
        </CardContent>
      </Card>
      */}
    </div>
  );
};
