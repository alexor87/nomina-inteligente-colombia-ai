
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, 
  Settings, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle,
  Clock
} from "lucide-react";
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';

interface IntelligentStatusBarProps {
  periodStatus: PeriodStatus | null;
  isProcessing: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}

export const IntelligentStatusBar: React.FC<IntelligentStatusBarProps> = ({
  periodStatus,
  isProcessing,
  errorMessage,
  onRetry
}) => {
  if (isProcessing) {
    return (
      <Card className="mx-6 mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-full bg-white shadow-sm">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">
                🎯 Configurando período inteligente
              </h3>
              <p className="text-sm text-blue-700">
                Analizando configuración y detectando el mejor período automáticamente...
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card className="mx-6 mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-full bg-white shadow-sm">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">
                Error en configuración
              </h3>
              <p className="text-sm text-red-700">
                {errorMessage}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="border-red-200 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  if (!periodStatus) {
    return null;
  }

  const getPeriodInfo = () => {
    if (periodStatus.currentPeriod) {
      return PayrollPeriodService.formatPeriodText(
        periodStatus.currentPeriod.fecha_inicio,
        periodStatus.currentPeriod.fecha_fin
      );
    }
    if (periodStatus.nextPeriod) {
      return PayrollPeriodService.formatPeriodText(
        periodStatus.nextPeriod.startDate,
        periodStatus.nextPeriod.endDate
      );
    }
    return 'Período no definido';
  };

  const getPeriodicityText = () => {
    if (periodStatus.currentPeriod) {
      return periodStatus.currentPeriod.tipo_periodo;
    }
    if (periodStatus.nextPeriod) {
      return periodStatus.nextPeriod.type;
    }
    return 'mensual';
  };

  const getStatusIcon = () => {
    switch (periodStatus.action) {
      case 'resume':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'create':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (periodStatus.action) {
      case 'resume':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            Período activo
          </Badge>
        );
      case 'create':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            Período creado
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="mx-6 mb-4 p-4 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 border-green-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-2 rounded-full bg-white shadow-sm">
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              🎯 Estás liquidando el período {getPeriodInfo()}
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </h3>
            <p className="text-sm text-gray-700">
              Configuración: nómina {getPeriodicityText()} • 
              Sistema inteligente activo • 
              Cálculos automáticos habilitados
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <Settings className="h-3 w-3 mr-1" />
            Inteligente
          </Badge>
        </div>
      </div>
    </Card>
  );
};
