import { MonthlyProjection } from '@/types/simulation';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface SimulationTimelineProps {
  timeline: MonthlyProjection[];
}

export const SimulationTimeline = ({ timeline }: SimulationTimelineProps) => {
  const maxCost = Math.max(...timeline.map(m => m.totalCost));

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Proyección Mensual</h3>
      </div>

      <div className="space-y-3">
        {timeline.map((month, index) => {
          const barWidth = (month.totalCost / maxCost) * 100;
          const isFirst = index === 0;
          const isLast = index === timeline.length - 1;

          return (
            <div key={month.month} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{month.monthName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {month.employeeCount} empleados
                  </span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      maximumFractionDigits: 0,
                      notation: 'compact'
                    }).format(month.totalCost)}
                  </span>
                </div>
              </div>
              
              <div className="relative h-8 bg-muted rounded-md overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isFirst
                      ? 'bg-secondary'
                      : isLast
                      ? 'bg-primary'
                      : 'bg-primary/70'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Costo total acumulado:</span>
          <span className="font-bold">
            {new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              maximumFractionDigits: 0
            }).format(timeline[timeline.length - 1]?.cumulativeCost || 0)}
          </span>
        </div>
      </div>
    </Card>
  );
};
