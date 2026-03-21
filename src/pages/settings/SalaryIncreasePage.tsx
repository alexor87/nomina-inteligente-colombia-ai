import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { SalaryIncreaseWizard } from '@/components/settings/salary-increase/SalaryIncreaseWizard';

export default function SalaryIncreasePage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const { companyId, loading } = useCurrentCompany();

  const year = parseInt(yearParam ?? '', 10);

  if (!yearParam || isNaN(year)) {
    return (
      <div className="p-8 text-center text-destructive">
        Año inválido. Accede desde Configuración → Parámetros Legales.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/modules/settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Incremento salarial {year}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona el ajuste anual de salarios para cumplir con el SMLMV vigente y definir incrementos por mérito.
          </p>
        </div>
      </div>

      {loading || !companyId ? (
        <div className="py-20 text-center text-muted-foreground">Cargando…</div>
      ) : (
        <SalaryIncreaseWizard year={year} companyId={companyId} />
      )}
    </div>
  );
}
