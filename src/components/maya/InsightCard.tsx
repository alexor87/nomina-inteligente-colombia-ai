import { AlertCircle, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, BarChart3, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportInsight } from '@/maya/types';

interface InsightCardProps {
  insight: ReportInsight;
  onAction?: (action: string) => void;
}

export const InsightCard = ({ insight, onAction }: InsightCardProps) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'comparison':
        return insight.change && insight.change > 0 ? TrendingUp : TrendingDown;
      case 'composition':
        return BarChart3;
      case 'alert':
        return AlertTriangle;
      case 'recommendation':
        return Lightbulb;
      case 'anomaly':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getVariant = () => {
    switch (insight.severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'success':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getBgColor = () => {
    switch (insight.severity) {
      case 'critical':
        return 'bg-destructive/5 border-destructive/20';
      case 'warning':
        return 'bg-primary/5 border-primary/20';
      case 'success':
        return 'bg-secondary/5 border-secondary/20';
      default:
        return 'bg-muted/30 border-border/50';
    }
  };

  const Icon = getIcon();

  return (
    <Card className={`p-4 transition-all hover:shadow-md ${getBgColor()}`}>
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${insight.severity === 'critical' ? 'bg-destructive/10 text-destructive' : ''}
          ${insight.severity === 'warning' ? 'bg-primary/10 text-primary' : ''}
          ${insight.severity === 'success' ? 'bg-secondary/10 text-secondary' : ''}
          ${insight.severity === 'info' ? 'bg-muted text-muted-foreground' : ''}
        `}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm leading-tight">{insight.title}</h4>
            <Badge variant={getVariant()} className="text-xs">
              {insight.type === 'comparison' && '📊'}
              {insight.type === 'composition' && '🏢'}
              {insight.type === 'alert' && '⚠️'}
              {insight.type === 'recommendation' && '💡'}
              {insight.type === 'anomaly' && '🔍'}
              {insight.type === 'trend' && '📈'}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.description}
          </p>

          {insight.actions && insight.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {insight.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => onAction?.(action)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {action} →
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
