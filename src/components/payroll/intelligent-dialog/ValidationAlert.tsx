
import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ValidationItem {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
  count?: number;
}

interface ValidationAlertProps {
  validations: ValidationItem[];
  isVisible: boolean;
}

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
  validations,
  isVisible
}) => {
  if (!isVisible || validations.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'success':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-2 max-h-32 overflow-y-auto">
      {validations.map((validation, index) => (
        <Alert key={index} className="py-2 px-3">
          <div className="flex items-start gap-2">
            {getIcon(validation.type)}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <AlertDescription className="text-sm font-medium">
                  {validation.message}
                </AlertDescription>
                {validation.count && (
                  <Badge variant={getBadgeVariant(validation.type)} className="text-xs">
                    {validation.count}
                  </Badge>
                )}
              </div>
              {validation.details && (
                <AlertDescription className="text-xs text-gray-500">
                  {validation.details}
                </AlertDescription>
              )}
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
};
