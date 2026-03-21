import React, { useState, useMemo } from 'react';
import { ChevronLeft, CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { formatCurrency } from '@/lib/utils';
import {
  SalaryIncreaseProposal,
  SalaryChangeReason,
} from '@/services/employees/SalaryIncreaseService';

interface Props {
  proposals: SalaryIncreaseProposal[];
  smlmv: number;
  effectiveDate: Date;
  onEffectiveDateChange: (d: Date) => void;
  onUpdateProposal: (employeeId: string, updates: Partial<SalaryIncreaseProposal>) => void;
  onConfirm: () => void;
  onBack: () => void;
  isApplying: boolean;
}

export function Step3ReviewConfirm({
  proposals,
  smlmv,
  effectiveDate,
  onEffectiveDateChange,
  onUpdateProposal,
  onConfirm,
  onBack,
  isApplying,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const currentMonthlyCost = useMemo(
    () => proposals.reduce((s, p) => s + p.currentSalary, 0),
    [proposals]
  );
  const newMonthlyCost = useMemo(
    () => proposals.reduce((s, p) => s + p.proposedSalary, 0),
    [proposals]
  );
  const costDelta = newMonthlyCost - currentMonthlyCost;
  const affectedCount = proposals.filter(p => p.proposedSalary !== p.currentSalary).length;

  const startEdit = (proposal: SalaryIncreaseProposal) => {
    setEditingId(proposal.employeeId);
    setEditValue(String(proposal.proposedSalary));
  };

  const commitEdit = (proposal: SalaryIncreaseProposal) => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val) && val >= smlmv && val >= proposal.currentSalary) {
      const pct =
        proposal.currentSalary > 0
          ? Math.round(((val - proposal.currentSalary) / proposal.currentSalary) * 10000) / 100
          : 0;
      onUpdateProposal(proposal.employeeId, {
        proposedSalary: val,
        percentage: pct,
        reason: 'merito' as SalaryChangeReason,
      });
    }
    setEditingId(null);
  };

  const REASON_LABEL: Record<string, string> = {
    ajuste_minimo_legal: 'Mínimo legal',
    incremento_anual: 'Incremento anual',
    merito: 'Mérito',
    promocion: 'Promoción',
    correccion: 'Corrección',
    ingreso: 'Ingreso',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Revisión y confirmación</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa los incrementos. Puedes editar salarios individuales haciendo click en el valor.
        </p>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Vigencia desde:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(effectiveDate, 'dd/MM/yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={effectiveDate}
              onSelect={(d) => d && onEffectiveDateChange(d)}
              locale={es}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Salario actual</TableHead>
              <TableHead className="text-right">Salario nuevo</TableHead>
              <TableHead className="text-right">Δ%</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.map(p => {
              const isEditing = editingId === p.employeeId;
              const deltaPositive = p.proposedSalary >= p.currentSalary;
              return (
                <TableRow key={p.employeeId}>
                  <TableCell className="font-medium">{p.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{p.cargo ?? '—'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.currentSalary)}</TableCell>
                  <TableCell className="text-right">
                    {p.isLegallyRequired ? (
                      <span className="font-semibold text-red-700">{formatCurrency(p.proposedSalary)}</span>
                    ) : isEditing ? (
                      <Input
                        type="number"
                        className="w-32 text-right ml-auto"
                        value={editValue}
                        autoFocus
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(p)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit(p);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <button
                        className="text-right w-full hover:underline cursor-pointer"
                        onClick={() => startEdit(p)}
                      >
                        {formatCurrency(p.proposedSalary)}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${deltaPositive ? 'text-green-700' : 'text-red-700'}`}>
                    {deltaPositive ? '+' : ''}{p.percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {REASON_LABEL[p.reason] ?? p.reason}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumen del impacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Costo nómina actual (mes)</p>
              <p className="font-semibold">{formatCurrency(currentMonthlyCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Costo nómina nuevo (mes)</p>
              <p className="font-semibold">{formatCurrency(newMonthlyCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Diferencia mensual</p>
              <p className={`font-semibold ${costDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {costDelta >= 0 ? '+' : ''}{formatCurrency(costDelta)}
              </p>
            </div>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            {affectedCount} empleado{affectedCount !== 1 ? 's' : ''} serán actualizados con vigencia desde el{' '}
            <strong>{format(effectiveDate, "d 'de' MMMM 'de' yyyy", { locale: es })}</strong>.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isApplying}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={() => setConfirmOpen(true)} disabled={isApplying}>
          {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Aplicar incrementos desde el {format(effectiveDate, 'dd/MM/yyyy')}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar incrementos salariales</DialogTitle>
            <DialogDescription>
              Se actualizarán los salarios de <strong>{affectedCount} empleados</strong> con
              vigencia desde el <strong>{format(effectiveDate, "d 'de' MMMM 'de' yyyy", { locale: es })}</strong>.
              Esta acción queda registrada en el historial salarial y no se puede deshacer automáticamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                onConfirm();
              }}
              disabled={isApplying}
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar y aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
