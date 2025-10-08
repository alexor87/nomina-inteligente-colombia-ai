import React from 'react';
import { ProactiveAlert, AlertSeverity, AlertCategory } from '@/types/proactive-detection';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  Users,
  Calendar,
  FileText,
  Shield,
  Clock,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProactiveAlertCardProps {
  alert: ProactiveAlert;
  onAction?: (alert: ProactiveAlert) => void;
  onDismiss?: (alert: ProactiveAlert) => void;
}

export const ProactiveAlertCard: React.FC<ProactiveAlertCardProps> = ({
  alert,
  onAction,
  onDismiss
}) => {
  const getSeverityConfig = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return {
          icon: XCircle,
          color: 'from-red-500 to-rose-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-900',
          badge: 'destructive' as const
        };
      case AlertSeverity.HIGH:
        return {
          icon: AlertTriangle,
          color: 'from-orange-500 to-amber-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-900',
          badge: 'default' as const
        };
      case AlertSeverity.MEDIUM:
        return {
          icon: AlertCircle,
          color: 'from-yellow-500 to-orange-400',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-900',
          badge: 'secondary' as const
        };
      case AlertSeverity.LOW:
        return {
          icon: Info,
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-900',
          badge: 'outline' as const
        };
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case AlertCategory.EMPLOYEE_DATA:
        return Users;
      case AlertCategory.PAYROLL:
        return FileText;
      case AlertCategory.DEADLINES:
        return Calendar;
      case AlertCategory.COMPLIANCE:
        return Shield;
      case AlertCategory.AFFILIATIONS:
        return Shield;
      case AlertCategory.BENEFITS:
        return TrendingUp;
    }
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;
  const CategoryIcon = getCategoryIcon(alert.category);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 space-y-3`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-semibold ${config.textColor}`}>
              {alert.title}
            </h3>
            <Badge variant={config.badge} className="text-xs">
              {alert.severity.toUpperCase()}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 leading-snug">
            {alert.description}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <CategoryIcon className="h-3 w-3" />
          <span className="capitalize">{alert.category.replace('_', ' ')}</span>
        </div>
        
        {alert.dueDate && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Fecha límite: {formatDate(alert.dueDate)}</span>
          </div>
        )}
        
        {alert.affectedEntities.count > 0 && (
          <div className="flex items-center gap-1">
            <span>Afectados: {alert.affectedEntities.count}</span>
          </div>
        )}
      </div>

      {/* Recommendation */}
      <div className={`text-xs ${config.textColor} bg-white/50 rounded-lg p-2`}>
        <span className="font-medium">💡 Recomendación:</span> {alert.recommendation}
      </div>

      {/* Actions */}
      {(alert.actionRequired || onDismiss) && (
        <div className="flex items-center gap-2 pt-1">
          {alert.actionRequired && onAction && (
            <Button
              size="sm"
              onClick={() => onAction(alert)}
              className="text-xs h-8"
            >
              Resolver ahora
            </Button>
          )}
          
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(alert)}
              className="text-xs h-8"
            >
              Descartar
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};
