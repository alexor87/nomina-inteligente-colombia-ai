import { VacationAbsenceFormData, requiresSubtype, getSubtypesForType } from '@/types/vacations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, AlertTriangle, CheckCircle, Loader2, Zap } from 'lucide-react';
import { useEffect } from 'react';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
}

interface PeriodInfo {
  periodId: string | null;
  periodName: string | null;
  isExact: boolean;
  isAutoCreated: boolean;
  message: string;
  crossesMultiplePeriods?: boolean;
  periodSegments?: any[];
}

interface VacationFormFieldsProps {
  formData: VacationAbsenceFormData;
  setFormData: (data: VacationAbsenceFormData) => void;
  employees: Employee[];
  calculatedDays: number;
  isSubmitting: boolean;
  periodInfo: PeriodInfo | null;
  isDetectingPeriod: boolean;
  hideEmployeeSelection?: boolean;
}

export const VacationFormFields = ({
  formData,
  setFormData,
  employees,
  calculatedDays,
  isSubmitting,
  periodInfo,
  isDetectingPeriod,
  hideEmployeeSelection = false
}: VacationFormFieldsProps) => {
  const selectedEmployee = employees.find(emp => emp.id === formData.employee_id);
  const showSubtypeField = requiresSubtype(formData.type);
  const availableSubtypes = getSubtypesForType(formData.type);

  // 🎯 DEBUG: Verificar estado del dropdown
  useEffect(() => {
    console.log('🔍 VacationFormFields - Estado del dropdown:', {
      employeesCount: employees.length,
      selectedEmployeeId: formData.employee_id,
      selectedEmployeeFound: !!selectedEmployee,
      selectedEmployeeName: selectedEmployee ? `${selectedEmployee.nombre} ${selectedEmployee.apellido}` : 'N/A',
      allEmployeeIds: employees.map(emp => emp.id),
      hideEmployeeSelection
    });
  }, [employees, formData.employee_id, selectedEmployee, hideEmployeeSelection]);

  const getPeriodStatusIcon = () => {
    if (isDetectingPeriod) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!periodInfo) return <Clock className="h-4 w-4 text-gray-400" />;
    if (periodInfo.crossesMultiplePeriods) return <Zap className="h-4 w-4 text-purple-500" />;
    if (periodInfo.isExact) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (periodInfo.isAutoCreated) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    return <CheckCircle className="h-4 w-4 text-blue-500" />;
  };

  const getPeriodStatusColor = () => {
    if (periodInfo?.crossesMultiplePeriods) return 'border-purple-200 bg-purple-50';
    if (periodInfo?.isExact) return 'border-green-200 bg-green-50';
    if (periodInfo?.isAutoCreated) return 'border-orange-200 bg-orange-50';
    if (periodInfo) return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* Employee Selection - Solo mostrar si hideEmployeeSelection es false */}
      {!hideEmployeeSelection && (
        <div className="space-y-2">
          <Label htmlFor="employee">Empleado *</Label>
          <Select 
            value={formData.employee_id} 
            onValueChange={(value) => {
              console.log('🎯 Empleado seleccionado:', value);
              setFormData({ ...formData, employee_id: value });
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar empleado" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.nombre} {employee.apellido} - {employee.cedula}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEmployee && (
            <p className="text-sm text-muted-foreground">
              {selectedEmployee.nombre} {selectedEmployee.apellido}
            </p>
          )}
        </div>
      )}

      {/* Mostrar empleado seleccionado cuando el dropdown está oculto */}
      {hideEmployeeSelection && selectedEmployee && (
        <div className="space-y-2">
          <Label>Empleado Seleccionado</Label>
          <div className="bg-muted px-3 py-2 rounded-md text-sm">
            <span className="font-medium">
              {selectedEmployee.nombre} {selectedEmployee.apellido}
            </span>
            <span className="text-muted-foreground"> - {selectedEmployee.cedula}</span>
          </div>
        </div>
      )}

      {/* Absence Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Ausencia *</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => {
            // Limpiar subtipo al cambiar tipo
            setFormData({ 
              ...formData, 
              type: value as any, 
              subtipo: undefined 
            });
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vacaciones">Vacaciones</SelectItem>
            <SelectItem value="licencia_remunerada">Licencia Remunerada</SelectItem>
            <SelectItem value="licencia_no_remunerada">Licencia No Remunerada</SelectItem>
            <SelectItem value="incapacidad">Incapacidad</SelectItem>
            <SelectItem value="ausencia">Ausencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subtipo Field - Solo mostrar si es requerido */}
      {showSubtypeField && (
        <div className="space-y-2">
          <Label htmlFor="subtipo">Subtipo *</Label>
          <Select 
            value={formData.subtipo || ''} 
            onValueChange={(value) => setFormData({ ...formData, subtipo: value })}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar subtipo" />
            </SelectTrigger>
            <SelectContent>
              {availableSubtypes.map((subtipo) => (
                <SelectItem key={subtipo.value} value={subtipo.value}>
                  {subtipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Fecha Inicio *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha Fin *</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Days Calculation */}
      {calculatedDays > 0 && (
        <div className="flex items-center space-x-2">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">
            Total días: <Badge variant="outline">{calculatedDays}</Badge>
          </span>
        </div>
      )}

      {/* Información de período(s) detectado(s) */}
      {(formData.start_date && formData.end_date) && (
        <Card className={`${getPeriodStatusColor()}`}>
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              {getPeriodStatusIcon()}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {isDetectingPeriod ? 'Detectando período...' : 'Análisis de Período(s)'}
                  </span>
                </div>
                
                {periodInfo && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      {periodInfo.message}
                    </p>
                    
                    {/* Multi-período: Mostrar información detallada */}
                    {periodInfo.crossesMultiplePeriods && periodInfo.periodSegments && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-purple-700">
                          📋 División por períodos:
                        </p>
                        <div className="space-y-1">
                          {periodInfo.periodSegments.map((segment, index) => (
                            <div key={segment.periodId} className="flex items-center justify-between text-xs bg-white/50 rounded px-2 py-1">
                              <span className="font-medium">{segment.periodName}</span>
                              <div className="flex items-center space-x-2">
                                <span>{segment.startDate} - {segment.endDate}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {segment.days} días
                                </Badge>
                                {segment.isPartial && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700">
                                    Parcial
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-purple-600 bg-purple-100/50 rounded px-2 py-1">
                          💡 <strong>Al liquidar cada período</strong>, se generarán automáticamente las novedades correspondientes a los días que aplican para ese período específico.
                        </div>
                      </div>
                    )}
                    
                    {periodInfo.isAutoCreated && (
                      <p className="text-xs text-orange-600">
                        🔧 Se creó automáticamente un nuevo período para estas fechas.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      <div className="space-y-2">
        <Label htmlFor="observations">Observaciones</Label>
        <Textarea
          id="observations"
          placeholder="Observaciones adicionales (opcional)"
          value={formData.observations}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
          disabled={isSubmitting}
          rows={3}
        />
      </div>
    </div>
  );
};
