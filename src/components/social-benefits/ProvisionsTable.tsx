
import React from 'react';
import type { ProvisionRecord } from '@/hooks/useSocialBenefitProvisions';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  rows: ProvisionRecord[];
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  totalPages: number;
  loading: boolean;
};

const formatCurrency = (v: number) =>
  v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const ProvisionsTable: React.FC<Props> = ({
  rows,
  page,
  pageSize,
  setPage,
  setPageSize,
  totalPages,
  loading,
}) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">Empleado</th>
              <th className="text-left px-4 py-2">Cédula</th>
              <th className="text-left px-4 py-2">Prestación</th>
              <th className="text-right px-4 py-2">Días</th>
              <th className="text-right px-4 py-2">Base</th>
              <th className="text-right px-4 py-2">Valor</th>
              <th className="text-left px-4 py-2">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={7}>
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={7}>
                  No hay registros para mostrar.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const baseTotal = (r.base_salary || 0) + (r.variable_average || 0) + (r.transport_allowance || 0) + (r.other_included || 0);
                const label =
                  r.benefit_type === 'cesantias' ? 'Cesantías' :
                  r.benefit_type === 'intereses_cesantias' ? 'Intereses' :
                  'Prima';
                return (
                  <tr key={`${r.period_id}-${r.employee_id}-${r.benefit_type}`} className="border-t">
                    <td className="px-4 py-2">{r.employee_name}</td>
                    <td className="px-4 py-2">{r.employee_cedula || '-'}</td>
                    <td className="px-4 py-2">{label}</td>
                    <td className="px-4 py-2 text-right">{r.days_count}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(baseTotal)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(r.provision_amount || 0)}</td>
                    <td className="px-4 py-2">{r.source || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t bg-background">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filas por página:</span>
          <select
            className="border rounded px-2 py-1 bg-background"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
