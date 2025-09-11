import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { PeriodEditState } from '@/types/period-editing';

interface PeriodEditingUIValidatorProps {
  editState: PeriodEditState;
  hasChanges: boolean;
  totalChangesCount: number;
  isValid: boolean;
  validationErrors: string[];
  editingSession: any;
}

export const PeriodEditingUIValidator: React.FC<PeriodEditingUIValidatorProps> = ({
  editState,
  hasChanges,
  totalChangesCount,
  isValid,
  validationErrors,
  editingSession
}) => {
  const getStateIcon = () => {
    switch (editState) {
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'editing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'saving':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'discarding':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStateColor = () => {
    switch (editState) {
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'editing':
        return 'bg-blue-100 text-blue-800';
      case 'saving':
        return 'bg-green-100 text-green-800';
      case 'discarding':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getStateMessage = () => {
    switch (editState) {
      case 'closed':
        return 'Período cerrado - Solo lectura';
      case 'editing':
        return 'Modo edición activo - Realizando cambios';
      case 'saving':
        return 'Guardando cambios...';
      case 'discarding':
        return 'Descartando cambios...';
      default:
        return 'Estado desconocido';
    }
  };

  const uiValidations = [
    {
      name: 'Estado visible',
      isValid: editState !== undefined,
      message: editState ? `Estado actual: ${editState}` : 'Estado no visible'
    },
    {
      name: 'Contador de cambios',
      isValid: hasChanges ? totalChangesCount > 0 : totalChangesCount === 0,
      message: `Cambios: ${totalChangesCount} (hasChanges: ${hasChanges})`
    },
    {
      name: 'Indicador de validación',
      isValid: validationErrors.length === 0 ? isValid : !isValid,
      message: `Válido: ${isValid} (${validationErrors.length} errores)`
    },
    {
      name: 'Sesión de edición',
      isValid: editState === 'editing' ? !!editingSession : !editingSession,
      message: `Sesión: ${editingSession ? 'Activa' : 'Inactiva'}`
    },
    {
      name: 'Estados coherentes',
      isValid: editState === 'closed' ? !hasChanges && !editingSession : true,
      message: editState === 'closed' && (hasChanges || editingSession) ? 'Estado inconsistente' : 'Estados coherentes'
    }
  ];

  const validCount = uiValidations.filter(v => v.isValid).length;
  const totalCount = uiValidations.length;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Validador de UI - Estados del Sistema</span>
          <Badge variant={validCount === totalCount ? "default" : "destructive"}>
            {validCount}/{totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado Visual */}
        <div className={`p-4 rounded-lg flex items-center gap-3 ${getStateColor()}`}>
          {getStateIcon()}
          <div>
            <div className="font-semibold capitalize">{editState}</div>
            <div className="text-sm opacity-90">{getStateMessage()}</div>
          </div>
        </div>

        {/* Métricas Clave */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{totalChangesCount}</div>
            <div className="text-sm text-muted-foreground">Cambios</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{validationErrors.length}</div>
            <div className="text-sm text-muted-foreground">Errores</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{isValid ? '✓' : '✗'}</div>
            <div className="text-sm text-muted-foreground">Válido</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{editingSession ? '●' : '○'}</div>
            <div className="text-sm text-muted-foreground">Sesión</div>
          </div>
        </div>

        {/* Validaciones de UI */}
        <div className="space-y-2">
          <h4 className="font-semibold">Validaciones de Coherencia UI</h4>
          {uiValidations.map((validation, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {validation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">{validation.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {validation.message}
              </span>
            </div>
          ))}
        </div>

        {/* Errores de Validación */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-1">Errores de Validación</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Estado de Sesión */}
        {editingSession && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-1">Información de Sesión</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>ID: {editingSession.id}</div>
              <div>Estado: {editingSession.status}</div>
              <div>Iniciada: {new Date(editingSession.startedAt).toLocaleString()}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};