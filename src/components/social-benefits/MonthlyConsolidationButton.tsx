
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { Calendar, Loader2 } from 'lucide-react';

interface MonthlyConsolidationButtonProps {
  onConsolidated?: () => void;
}

export const MonthlyConsolidationButton: React.FC<MonthlyConsolidationButtonProps> = ({
  onConsolidated
}) => {
  const [isConsolidating, setIsConsolidating] = useState(false);
  const { companyId } = useCurrentCompany();
  const { toast } = useToast();

  const handleMonthlyConsolidation = async () => {
    if (!companyId) return;

    try {
      setIsConsolidating(true);
      
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      console.log(`🗓️ Iniciando consolidado mensual para ${currentMonth}/${currentYear}`);
      
      // Get all closed periods for the current month
      const { data: closedPeriods, error: periodsError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .gte('fecha_inicio', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('fecha_inicio', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)
        .order('fecha_inicio');

      if (periodsError) {
        throw new Error(`Error obteniendo períodos: ${periodsError.message}`);
      }

      if (!closedPeriods || closedPeriods.length === 0) {
        toast({
          title: "Sin períodos para consolidar",
          description: `No hay períodos cerrados para ${currentMonth}/${currentYear}`,
          variant: "destructive"
        });
        return;
      }

      let consolidatedCount = 0;
      const results = [];

      for (const period of closedPeriods) {
        try {
          console.log(`📊 Procesando período: ${period.periodo}`);
          
          const { data: result, error } = await supabase.functions.invoke('provision-social-benefits', {
            body: { 
              period_id: period.id,
              consolidation_mode: 'monthly'
            }
          });

          if (error) {
            console.error(`❌ Error en período ${period.periodo}:`, error);
            results.push({ period: period.periodo, success: false, error: error.message });
          } else {
            console.log(`✅ Período ${period.periodo} procesado:`, result);
            results.push({ period: period.periodo, success: true, count: result.count });
            consolidatedCount += result.count || 0;
          }
        } catch (periodError) {
          console.error(`❌ Error procesando ${period.periodo}:`, periodError);
          results.push({ 
            period: period.periodo, 
            success: false, 
            error: periodError instanceof Error ? periodError.message : 'Error desconocido'
          });
        }
      }

      const successfulPeriods = results.filter(r => r.success).length;
      const failedPeriods = results.filter(r => !r.success).length;

      if (successfulPeriods > 0) {
        toast({
          title: "Consolidado mensual completado",
          description: `✅ ${successfulPeriods} períodos procesados, ${consolidatedCount} provisiones calculadas` +
                      (failedPeriods > 0 ? ` (${failedPeriods} errores)` : ''),
        });
      } else {
        toast({
          title: "Error en consolidado mensual",
          description: `No se pudo procesar ningún período (${failedPeriods} errores)`,
          variant: "destructive"
        });
      }

      // Log results for debugging
      console.log('📋 Resultado consolidado mensual:', {
        month: `${currentMonth}/${currentYear}`,
        periodsProcessed: closedPeriods.length,
        successful: successfulPeriods,
        failed: failedPeriods,
        totalProvisions: consolidatedCount,
        details: results
      });

      if (onConsolidated) {
        onConsolidated();
      }

    } catch (error) {
      console.error('❌ Error en consolidado mensual:', error);
      toast({
        title: "Error en consolidado mensual",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      });
    } finally {
      setIsConsolidating(false);
    }
  };

  return (
    <Button
      onClick={handleMonthlyConsolidation}
      disabled={isConsolidating}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isConsolidating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Calendar className="h-4 w-4" />
      )}
      {isConsolidating ? 'Consolidando...' : 'Consolidar Mes'}
    </Button>
  );
};
