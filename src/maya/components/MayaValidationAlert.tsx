import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import type { MayaValidationResults, MayaValidationIssue } from '../services/MayaIntelligentValidationService';

interface MayaValidationAlertProps {
  validationResults: MayaValidationResults;
  onFixIssue?: (issueId: string) => void;
  onViewDetails?: (issue: MayaValidationIssue) => void;
}

export const MayaValidationAlert: React.FC<MayaValidationAlertProps> = ({
  validationResults,
  onFixIssue,
  onViewDetails
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const getBadgeVariant = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'outline';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  if (!validationResults.hasIssues) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">
          ✅ Validación Exitosa (Score: {validationResults.overallScore}/100)
        </AlertTitle>
        <AlertDescription className="text-green-700">
          {validationResults.validationSummary}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Alert */}
      <Alert variant={validationResults.criticalIssuesCount > 0 ? 'destructive' : 'default'}>
        {validationResults.criticalIssuesCount > 0 ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <AlertTitle>
          🤖 MAYA - Validación Inteligente (Score: {validationResults.overallScore}/100)
        </AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{validationResults.validationSummary}</p>
            <div className="flex items-center gap-2 text-sm">
              {validationResults.criticalIssuesCount > 0 && (
                <Badge variant="destructive">
                  {validationResults.criticalIssuesCount} Críticos
                </Badge>
              )}
              {validationResults.warningsCount > 0 && (
                <Badge variant="secondary">
                  {validationResults.warningsCount} Advertencias
                </Badge>
              )}
              {validationResults.infoCount > 0 && (
                <Badge variant="outline">
                  {validationResults.infoCount} Informativos
                </Badge>
              )}
              <span className="text-muted-foreground">
                • Tiempo estimado: {validationResults.estimatedFixTime}
              </span>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Individual Issues */}
      <div className="space-y-3">
        {validationResults.issues.slice(0, 5).map((issue) => (
          <Alert key={issue.id} variant={getVariant(issue.type)}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getIcon(issue.type)}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTitle className="text-sm font-medium">
                      {issue.title}
                    </AlertTitle>
                    <Badge variant={getBadgeVariant(issue.impact)} className="text-xs">
                      {issue.impact}
                    </Badge>
                  </div>

                  <AlertDescription className="text-sm">
                    {issue.description}
                  </AlertDescription>

                  {/* Suggested Actions */}
                  {issue.suggestedActions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Acciones sugeridas:
                      </p>
                      <ul className="text-xs space-y-1">
                        {issue.suggestedActions.slice(0, 2).map((action, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-current rounded-full" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4">
                {issue.autoFixable && onFixIssue && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onFixIssue(issue.id)}
                    className="text-xs"
                  >
                    Auto-Fix
                  </Button>
                )}
                {onViewDetails && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewDetails(issue)}
                    className="text-xs"
                  >
                    Ver Más
                  </Button>
                )}
              </div>
            </div>
          </Alert>
        ))}

        {validationResults.issues.length > 5 && (
          <div className="text-center">
            <Badge variant="outline">
              +{validationResults.issues.length - 5} problemas adicionales
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};