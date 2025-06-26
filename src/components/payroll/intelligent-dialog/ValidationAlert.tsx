
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ValidationItem {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
  count?: number;
  employeeIds?: string[];
}

interface ValidationAlertProps {
  validations: ValidationItem[];
  isVisible: boolean;
}

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
  validations,
  isVisible
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  if (!isVisible || validations.length === 0) return null;

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

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

  const getAlertVariant = (type: string) => {
    return type === 'error' ? 'destructive' : 'default';
  };

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {validations.map((validation, index) => {
        const isExpanded = expandedItems.has(index);
        const hasDetails = validation.details || validation.employeeIds?.length;
        
        return (
          <Alert key={index} variant={getAlertVariant(validation.type)} className="py-2 px-3">
            <div className="flex items-start gap-2">
              {getIcon(validation.type)}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertDescription className="text-sm font-medium">
                      {validation.message}
                    </AlertDescription>
                    {validation.count && (
                      <Badge variant={getBadgeVariant(validation.type)} className="text-xs px-1.5 py-0">
                        {validation.count}
                      </Badge>
                    )}
                  </div>
                  {hasDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(index)}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                
                {isExpanded && (
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    {validation.details && (
                      <div className="bg-gray-50 rounded-md p-2">
                        <AlertDescription className="text-xs text-gray-600">
                          <strong>Razón:</strong> {validation.details}
                        </AlertDescription>
                      </div>
                    )}
                    
                    {validation.employeeIds && validation.employeeIds.length > 0 && (
                      <div className="bg-gray-50 rounded-md p-2">
                        <AlertDescription className="text-xs text-gray-600">
                          <strong>Empleados afectados:</strong> {validation.employeeIds.length} empleados
                        </AlertDescription>
                        <div className="mt-1 text-xs text-gray-500">
                          {validation.employeeIds.slice(0, 3).map(id => (
                            <span key={id} className="inline-block bg-gray-200 rounded px-1 mr-1 mb-1">
                              ID: {id.slice(0, 8)}...
                            </span>
                          ))}
                          {validation.employeeIds.length > 3 && (
                            <span className="text-gray-400">
                              +{validation.employeeIds.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Alert>
        );
      })}
    </div>
  );
};
