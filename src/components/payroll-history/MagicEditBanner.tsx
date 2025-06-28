
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save, Clock, Check, AlertCircle } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { formatPeriodDateRange } from '@/utils/periodDateUtils';

interface MagicEditBannerProps {
  period: PayrollHistoryPeriod;
  onBackToHistory: () => void;
  onFinishEditing: () => void;
  hasUnsavedChanges?: boolean;
  isAutoSaving?: boolean;
  lastSaved?: Date;
}

export const MagicEditBanner = ({
  period,
  onBackToHistory,
  onFinishEditing,
  hasUnsavedChanges = false,
  isAutoSaving = false,
  lastSaved
}: MagicEditBannerProps) => {
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  useEffect(() => {
    if (isAutoSaving) {
      setShowSaveIndicator(true);
      const timer = setTimeout(() => setShowSaveIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAutoSaving]);

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Guardado hace unos segundos';
    if (diffMinutes === 1) return 'Guardado hace 1 minuto';
    if (diffMinutes < 60) return `Guardado hace ${diffMinutes} minutos`;
    
    return `Guardado a las ${date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg animate-fade-in">
      <Card className="mx-4 mt-4 mb-2 bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBackToHistory}
              className="hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Historial
            </Button>
            
            <div className="flex items-center space-x-3">
              <Badge className="bg-amber-100 text-amber-800 animate-pulse">
                ✏️ Editando
              </Badge>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {formatPeriodDateRange(period.startDate, period.endDate)}
                </h3>
                <p className="text-sm text-gray-600">
                  {period.employeesCount} empleados • Período {period.type}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Auto-save indicator */}
            <div className="flex items-center space-x-2">
              {isAutoSaving && (
                <div className="flex items-center text-blue-600 animate-fade-in">
                  <Clock className="h-4 w-4 mr-1 animate-spin" />
                  <span className="text-sm">Guardando...</span>
                </div>
              )}
              
              {showSaveIndicator && !isAutoSaving && (
                <div className="flex items-center text-green-600 animate-scale-in">
                  <Check className="h-4 w-4 mr-1" />
                  <span className="text-sm">Guardado</span>
                </div>
              )}
              
              {hasUnsavedChanges && !isAutoSaving && (
                <div className="flex items-center text-amber-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Cambios pendientes</span>
                </div>
              )}
              
              {lastSaved && !hasUnsavedChanges && !isAutoSaving && (
                <span className="text-xs text-gray-500">
                  {formatLastSaved(lastSaved)}
                </span>
              )}
            </div>

            <Button 
              onClick={onFinishEditing}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Save className="h-4 w-4 mr-2" />
              Finalizar Edición
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
