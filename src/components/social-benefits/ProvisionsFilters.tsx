
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import type { BenefitType } from '@/types/social-benefits';
import type { PeriodOption } from '@/hooks/useSocialBenefitProvisions';

type Props = {
  periods: PeriodOption[];
  selectedPeriodId: string | null;
  onChangePeriod: (id: string) => void;

  benefitType: BenefitType | 'all';
  onChangeBenefitType: (t: BenefitType | 'all') => void;

  search: string;
  onSearchChange: (s: string) => void;

  onRecalculate: () => void;
  recalculating: boolean;

  onExport: () => void;
};

export const ProvisionsFilters: React.FC<Props> = ({
  periods,
  selectedPeriodId,
  onChangePeriod,
  benefitType,
  onChangeBenefitType,
  search,
  onSearchChange,
  onRecalculate,
  recalculating,
  onExport,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="md:col-span-2">
        <label className="text-sm text-muted-foreground mb-1 block">Período</label>
        <Select value={selectedPeriodId || undefined} onValueChange={onChangePeriod}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona un período" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.periodo} ({p.tipo_periodo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Tipo de prestación</label>
        <Select value={benefitType} onValueChange={(v) => onChangeBenefitType(v as BenefitType | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="cesantias">Cesantías</SelectItem>
            <SelectItem value="intereses_cesantias">Intereses Cesantías</SelectItem>
            <SelectItem value="prima">Prima</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Buscar empleado</label>
        <Input
          placeholder="Nombre o cédula"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-end gap-2">
        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        <Button onClick={onRecalculate} disabled={recalculating || !selectedPeriodId}>
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
          {recalculating ? 'Recalculando...' : 'Recalcular'}
        </Button>
      </div>
    </div>
  );
};
