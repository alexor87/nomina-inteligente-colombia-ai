import { VacationAbsenceFormData, requiresSubtype, getSubtypesForType } from '@/types/vacations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, AlertTriangle, CheckCircle, Loader2, Zap, Sun, PartyPopper, Info } from 'lucide-react';
import { VacationBreakdown } from '@/utils/businessDayCalculator';
import { PeriodDetectionResult } from '@/hooks/usePeriodDetection';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
}

const DAY_LABELS: Record<string, string> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mie',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sab',
  domingo: 'Dom',
};

interface AbsenceFormFieldsProps {
  formData: VacationAbsenceFormData;
  setFormData: (data: VacationAbsenceFormData) => void;
  employees: Employee[];
  calculatedDays: number;
  isSubmitting: boolean;
  periodInfo: PeriodDetectionResult | null;
  isDetectingPeriod: boolean;
  hideEmployeeSelection?: boolean;
  // Vacation business days props
  diasHabiles?: number;
  setDiasHabiles?: (days: number) => void;
  employeeRestDays?: string[];
  vacationBreakdown?: VacationBreakdown | null;
  isLoadingRestDays?: boolean;
}

export const AbsenceFormFields = ({
  formData,
  setFormData,
  employees,
  calculatedDays,
  isSubmitting,
  periodInfo,
  isDetectingPeriod,
  hideEmployeeSelection = false,
  diasHabiles = 0,
  setDiasHabiles,
  employeeRestDays = ['sabado', 'domingo'],
  vacationBreakdown = null,
  isLoadingRestDays = false,
}: AbsenceFormFieldsProps) => {
  const selectedEmployee = employees.find(emp => emp.id === formData.employee_id);
  const showSubtypeField = requiresSubtype(formData.type);
  const availableSubtypes = getSubtypesForType(formData.type);
  const isVacaciones = formData.type === 'vacaciones';

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

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
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

      {/* Mostrar empleado seleccionado cuando el dropdown esta oculto */}
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
            // Limpiar subtipo y campos de incapacidad al cambiar tipo
            setFormData({
              ...formData,
              type: value as any,
              subtipo: undefined,
              // Reset end_date when switching to vacaciones (will be auto-calculated)
              ...(value === 'vacaciones' ? { end_date: '' } : {}),
              ...( value !== 'incapacidad' ? { payer_type: undefined, diagnosis: undefined, medical_certificate_url: undefined } : {})
            });
            // Reset business days when switching type
            if (value === 'vacaciones' && setDiasHabiles) {
              setDiasHabiles(0);
            }
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

      {/* Campos condicionales para Incapacidad */}
      {formData.type === 'incapacidad' && (
        <div className="space-y-4 p-4 border border-blue-200 bg-blue-50/50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800">Datos de Incapacidad</h4>

          {/* Responsable de pago */}
          <div className="space-y-2">
            <Label htmlFor="payer_type">Responsable de Pago *</Label>
            <Select
              value={(formData as any).payer_type || ''}
              onValueChange={(value) => setFormData({ ...formData, payer_type: value } as any)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employer">Empleador</SelectItem>
                <SelectItem value="eps">EPS</SelectItem>
                <SelectItem value="arl">ARL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Diagnostico */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnostico</Label>
            <Textarea
              id="diagnosis"
              placeholder="Descripcion del diagnostico medico..."
              value={(formData as any).diagnosis || ''}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value } as any)}
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          {/* URL del certificado medico */}
          <div className="space-y-2">
            <Label htmlFor="medical_certificate_url">URL del Certificado Medico</Label>
            <Input
              id="medical_certificate_url"
              type="url"
              placeholder="https://..."
              value={(formData as any).medical_certificate_url || ''}
              onChange={(e) => setFormData({ ...formData, medical_certificate_url: e.target.value } as any)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* ====== VACACIONES: Fecha Inicio + Dias Habiles ====== */}
      {isVacaciones ? (
        <>
          {/* Dias de descanso del empleado (info) */}
          {formData.employee_id && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>
                Dias de descanso:{' '}
                {isLoadingRestDays ? (
                  'Cargando...'
                ) : (
                  employeeRestDays.map(d => DAY_LABELS[d] || d).join(', ')
                )}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha Inicio */}
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

            {/* Dias Habiles */}
            <div className="space-y-2">
              <Label htmlFor="dias_habiles">Dias habiles de vacaciones *</Label>
              <Input
                id="dias_habiles"
                type="number"
                min={1}
                max={30}
                placeholder="Ej: 15"
                value={diasHabiles > 0 ? diasHabiles : ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (setDiasHabiles) {
                    setDiasHabiles(isNaN(val) ? 0 : Math.max(0, Math.min(30, val)));
                  }
                }}
                disabled={isSubmitting || isLoadingRestDays}
              />
            </div>
          </div>

          {/* Fecha Fin calculada + Desglose */}
          {vacationBreakdown && diasHabiles > 0 && formData.start_date && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="space-y-3">
                  {/* Fecha fin calculada */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-800">
                      Fecha de regreso
                    </span>
                    <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-300 text-sm px-3 py-1">
                      {formatDate(vacationBreakdown.endDate)}
                    </Badge>
                  </div>

                  {/* Desglose */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-700">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{vacationBreakdown.calendarDays} dias calendario</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{vacationBreakdown.businessDays} dias habiles</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sun className="h-3.5 w-3.5" />
                      <span>{vacationBreakdown.restDaysCount} dias descanso</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PartyPopper className="h-3.5 w-3.5" />
                      <span>{vacationBreakdown.holidaysCount} festivo(s)</span>
                    </div>
                  </div>

                  {/* Nombres de festivos */}
                  {vacationBreakdown.holidayNames.length > 0 && (
                    <div className="text-xs text-emerald-600 bg-emerald-100/50 rounded px-3 py-2">
                      Festivos: {vacationBreakdown.holidayNames.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* ====== OTROS TIPOS: Fecha Inicio + Fecha Fin (manual) ====== */
        <>
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

          {/* Days Calculation (only for non-vacation types) */}
          {calculatedDays > 0 && (
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                Total dias: <Badge variant="outline">{calculatedDays}</Badge>
              </span>
            </div>
          )}
        </>
      )}

      {/* Informacion de periodo(s) detectado(s) */}
      {(formData.start_date && formData.end_date) && (
        <Card className={`${getPeriodStatusColor()}`}>
          <CardContent className="pt-6 pb-5 px-5">
            <div className="flex items-start space-x-3">
              {getPeriodStatusIcon()}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {isDetectingPeriod ? 'Detectando periodo...' : 'Analisis de Periodo(s)'}
                  </span>
                </div>

                {periodInfo && (
                  <div className="space-y-3">
                    {/* Solo mostrar periodInfo.message cuando NO es multi-periodo */}
                    {!periodInfo.crossesMultiplePeriods && (
                      <p className="text-sm text-gray-700">
                        {periodInfo.message}
                      </p>
                    )}

                    {/* Multi-periodo: Mensaje simplificado */}
                    {periodInfo.crossesMultiplePeriods && (
                      <div className="text-xs text-purple-600 bg-purple-100/50 rounded px-3 py-2">
                        Esta ausencia afecta multiples periodos de liquidacion
                      </div>
                    )}

                    {periodInfo.isAutoCreated && (
                      <p className="text-xs text-orange-600">
                        Se creo automaticamente un nuevo periodo para estas fechas.
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
