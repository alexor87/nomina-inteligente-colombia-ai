import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, FileDown, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import type { BenefitType } from '@/types/social-benefits';
import type { ProvisionRecord, PeriodOption } from '@/services/ProvisionsService';

interface ProvisionsTableProps {
  periods: PeriodOption[];
  loadingPeriods: boolean;
  provisions: ProvisionRecord[];
  loadingProvisions: boolean;
  filters: {
    periodId: string | null;
    benefitType: BenefitType | 'all';
    search: string;
  };
  setPeriodId: (periodId: string) => void;
  setBenefitType: (benefitType: BenefitType | 'all') => void;
  setSearch: (search: string) => void;
  totals: {
    count: number;
    total: number;
    byType: {
      cesantias: number;
      intereses_cesantias: number;
      prima: number;
      vacaciones: number;
    };
  };
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  totalPages: number;
  recalculateCurrentPeriod: () => Promise<void>;
  recalculating: boolean;
  exportExcel: () => void;
  showConsolidateButton?: boolean;
}

export const ProvisionsTable: React.FC<ProvisionsTableProps> = ({
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
  recalculateCurrentPeriod,
  recalculating,
  exportExcel,
  showConsolidateButton = false
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Provisiones por Período
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {showConsolidateButton 
                ? 'Consulta las provisiones calculadas mediante consolidado mensual'
                : 'Consulta y recalcula las provisiones por período cerrado'
              }
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!showConsolidateButton && (
              <Button
                onClick={recalculateCurrentPeriod}
                disabled={!filters.periodId || recalculating || loadingProvisions}
                variant="outline"
                size="sm"
              >
                {recalculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recalculando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recalcular Período
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={exportExcel}
              disabled={provisions.length === 0}
              variant="outline"
              size="sm"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="period">Período</Label>
            <Select
              onValueChange={setPeriodId}
              defaultValue={filters.periodId || ''}
              disabled={loadingPeriods}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un período" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.periodo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="benefitType">Tipo de Beneficio</Label>
            <Select
              onValueChange={setBenefitType}
              defaultValue={filters.benefitType}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="cesantias">Cesantías</SelectItem>
                <SelectItem value="intereses_cesantias">Intereses Cesantías</SelectItem>
                <SelectItem value="prima">Prima de Servicios</SelectItem>
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="search">Buscar</Label>
            <Input
              type="search"
              id="search"
              placeholder="Buscar por nombre o cédula"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableCaption>
            Total de registros: {totals.count}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Beneficio</TableHead>
              <TableHead className="text-right">Valor Provisionado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingProvisions ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando provisiones...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : provisions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No hay provisiones registradas para este período.
                </TableCell>
              </TableRow>
            ) : (
              provisions.map((provision) => {
                const rowKey = `${provision.period_name}-${provision.employee_cedula}-${provision.benefit_type}`;
                return (
                  <TableRow key={rowKey}>
                    <TableCell>{provision.period_name}</TableCell>
                    <TableCell>{provision.employee_name}</TableCell>
                    <TableCell>{provision.employee_cedula}</TableCell>
                    <TableCell>{provision.benefit_type}</TableCell>
                    <TableCell className="text-right">
                      ${provision.provision_amount?.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Siguiente
            </Button>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Tamaño" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
