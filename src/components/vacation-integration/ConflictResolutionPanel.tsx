
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle,
  FileText,
  Clock
} from 'lucide-react';
import { ConflictReport, ConflictGroup, ConflictRecord } from '@/services/vacation-integration/VacationNovedadConflictDetector';
import { formatCurrency } from '@/lib/utils';

interface ConflictResolutionPanelProps {
  conflictReport: ConflictReport;
  onResolveConflicts: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
  isResolving?: boolean;
}

export interface ConflictResolution {
  employeeId: string;
  action: 'prioritize_vacation' | 'prioritize_novedad' | 'merge' | 'skip';
  selectedRecords: string[]; // IDs de registros a mantener
  notes?: string;
}

export const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  conflictReport,
  onResolveConflicts,
  onCancel,
  isResolving = false
}) => {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [autoResolveMode, setAutoResolveMode] = useState<'vacation_priority' | 'manual'>('vacation_priority');

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeColor = (type: 'duplicate' | 'overlap' | 'type_mismatch') => {
    switch (type) {
      case 'duplicate': return 'bg-red-100 text-red-800';
      case 'overlap': return 'bg-orange-100 text-orange-800';
      case 'type_mismatch': return 'bg-purple-100 text-purple-800';
    }
  };

  const getSourceBadge = (source: 'vacation_module' | 'novedad_module') => (
    <Badge variant={source === 'vacation_module' ? 'default' : 'secondary'} className="text-xs">
      {source === 'vacation_module' ? 'Módulo Vacaciones' : 'Módulo Novedades'}
    </Badge>
  );

  const handleResolutionChange = (employeeId: string, resolution: ConflictResolution) => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(employeeId, resolution);
    setResolutions(newResolutions);
  };

  const handleAutoResolve = () => {
    const autoResolutions = new Map<string, ConflictResolution>();

    conflictReport.conflictGroups.forEach(group => {
      const vacationRecords = group.conflicts.filter(c => c.source === 'vacation_module');
      const novedadRecords = group.conflicts.filter(c => c.source === 'novedad_module');

      if (autoResolveMode === 'vacation_priority') {
        // Priorizar módulo de vacaciones
        autoResolutions.set(group.employeeId, {
          employeeId: group.employeeId,
          action: 'prioritize_vacation',
          selectedRecords: vacationRecords.map(r => r.id),
          notes: 'Resolución automática: prioridad a módulo de vacaciones'
        });
      }
    });

    setResolutions(autoResolutions);
  };

  const handleSubmit = () => {
    const resolutionArray = Array.from(resolutions.values());
    onResolveConflicts(resolutionArray);
  };

  const isAllResolved = conflictReport.conflictGroups.every(group => 
    resolutions.has(group.employeeId)
  );

  if (!conflictReport.hasConflicts) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">
              ✅ No se detectaron conflictos entre ausencias y novedades
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de alerta */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Conflictos detectados:</strong> Se encontraron {conflictReport.totalConflicts} grupos de conflictos 
          entre el módulo de vacaciones y novedades. Debes resolverlos antes de continuar con la liquidación.
        </AlertDescription>
      </Alert>

      {/* Resumen de conflictos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Duplicados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {conflictReport.summary.duplicates}
            </div>
            <p className="text-xs text-red-600">Registros idénticos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Solapamientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {conflictReport.summary.overlaps}
            </div>
            <p className="text-xs text-orange-600">Fechas superpuestas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Inconsistencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {conflictReport.summary.typeMismatches}
            </div>
            <p className="text-xs text-purple-600">Tipos diferentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Controles de resolución automática */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resolución Automática</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleAutoResolve}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Priorizar Módulo Vacaciones</span>
            </Button>
            <span className="text-sm text-muted-foreground">
              (Recomendado: usa los registros del módulo de vacaciones como fuente principal)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Lista de conflictos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Conflictos Detectados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {conflictReport.conflictGroups.map((group) => (
              <ConflictGroupCard
                key={group.employeeId}
                group={group}
                resolution={resolutions.get(group.employeeId)}
                onResolutionChange={(resolution) => handleResolutionChange(group.employeeId, resolution)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Controles finales */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {resolutions.size} de {conflictReport.conflictGroups.length} conflictos resueltos
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isAllResolved || isResolving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isResolving ? 'Resolviendo...' : 'Resolver Conflictos'}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ConflictGroupCardProps {
  group: ConflictGroup;
  resolution?: ConflictResolution;
  onResolutionChange: (resolution: ConflictResolution) => void;
}

const ConflictGroupCard: React.FC<ConflictGroupCardProps> = ({
  group,
  resolution,
  onResolutionChange
}) => {
  const vacationRecords = group.conflicts.filter(c => c.source === 'vacation_module');
  const novedadRecords = group.conflicts.filter(c => c.source === 'novedad_module');

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-orange-200 bg-orange-50';
      case 'low': return 'border-blue-200 bg-blue-50';
    }
  };

  const getTypeLabel = (type: 'duplicate' | 'overlap' | 'type_mismatch') => {
    switch (type) {
      case 'duplicate': return 'Duplicado';
      case 'overlap': return 'Solapamiento';
      case 'type_mismatch': return 'Inconsistencia de Tipo';
    }
  };

  const handleActionSelect = (action: ConflictResolution['action']) => {
    let selectedRecords: string[] = [];
    
    switch (action) {
      case 'prioritize_vacation':
        selectedRecords = vacationRecords.map(r => r.id);
        break;
      case 'prioritize_novedad':
        selectedRecords = novedadRecords.map(r => r.id);
        break;
      case 'merge':
        selectedRecords = group.conflicts.map(r => r.id);
        break;
      case 'skip':
        selectedRecords = [];
        break;
    }

    onResolutionChange({
      employeeId: group.employeeId,
      action,
      selectedRecords
    });
  };

  return (
    <Card className={`${getSeverityColor(group.severity)} border`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-medium">{group.employeeName}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getTypeColor(group.type)}>
                  {getTypeLabel(group.type)}
                </Badge>
                <Badge variant="outline" className={getSeverityColor(group.severity)}>
                  {group.severity.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Registros en conflicto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Módulo Vacaciones */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-blue-700">Módulo Vacaciones</h4>
            {vacationRecords.map(record => (
              <div key={record.id} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default" className="text-xs">
                    {record.type}
                  </Badge>
                  <span className="text-xs text-blue-600">
                    {record.status}
                  </span>
                </div>
                <div className="text-sm">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>{record.startDate} - {record.endDate}</span>
                  </div>
                  {record.observations && (
                    <p className="text-xs text-gray-500 mt-1">{record.observations}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Módulo Novedades */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Módulo Novedades</h4>
            {novedadRecords.map(record => (
              <div key={record.id} className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {record.type}
                  </Badge>
                </div>
                <div className="text-sm">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>{record.startDate} - {record.endDate}</span>
                  </div>
                  {record.observations && (
                    <p className="text-xs text-gray-500 mt-1">{record.observations}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opciones de resolución */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-3">Resolución:</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={resolution?.action === 'prioritize_vacation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleActionSelect('prioritize_vacation')}
              className="flex items-center space-x-1"
            >
              <CheckCircle className="h-3 w-3" />
              <span>Usar Vacaciones</span>
            </Button>
            
            <Button
              variant={resolution?.action === 'prioritize_novedad' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleActionSelect('prioritize_novedad')}
              className="flex items-center space-x-1"
            >
              <FileText className="h-3 w-3" />
              <span>Usar Novedades</span>
            </Button>
            
            <Button
              variant={resolution?.action === 'skip' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleActionSelect('skip')}
              className="flex items-center space-x-1"
            >
              <XCircle className="h-3 w-3" />
              <span>Omitir</span>
            </Button>
          </div>
          
          {resolution && (
            <div className="mt-2 text-sm text-green-600 flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>
                {resolution.action === 'prioritize_vacation' && 'Se usarán los registros del módulo de vacaciones'}
                {resolution.action === 'prioritize_novedad' && 'Se usarán los registros del módulo de novedades'}
                {resolution.action === 'skip' && 'Se omitirá este conflicto'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const getTypeColor = (type: 'duplicate' | 'overlap' | 'type_mismatch') => {
  switch (type) {
    case 'duplicate': return 'bg-red-100 text-red-800';
    case 'overlap': return 'bg-orange-100 text-orange-800';
    case 'type_mismatch': return 'bg-purple-100 text-purple-800';
  }
};
