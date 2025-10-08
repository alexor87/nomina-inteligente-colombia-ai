import { ReportInsight } from '@/maya/types';
import { InsightCard } from './InsightCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InsightsPanelProps {
  insights: ReportInsight[];
  onAction?: (action: string) => void;
}

export const InsightsPanel = ({ insights, onAction }: InsightsPanelProps) => {
  if (!insights || insights.length === 0) {
    return null;
  }

  // Ordenar por severidad: critical > warning > info > success
  const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
  const sortedInsights = [...insights].sort((a, b) => 
    severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">
          🎯 Análisis Automático
        </h3>
        <span className="text-xs text-muted-foreground">
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ScrollArea className="h-auto max-h-[400px]">
        <div className="space-y-3">
          {sortedInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAction={onAction}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
