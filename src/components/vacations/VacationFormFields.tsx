
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  VacationAbsenceFormData, 
  ABSENCE_TYPE_LABELS, 
  VacationAbsenceType,
  requiresSubtype,
  getSubtypesForType
} from '@/types/vacations';

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
}

interface VacationFormFieldsProps {
  formData: VacationAbsenceFormData;
  setFormData: React.Dispatch<React.SetStateAction<VacationAbsenceFormData>>;
  employees: Employee[];
  calculatedDays: number;
  isSubmitting: boolean;
  periodInfo?: PeriodInfo | null;
  isDetectingPeriod?: boolean;
}

export const VacationFormFields = ({
  formData,
  setFormData,
  employees,
  calculatedDays,
  isSubmitting,
  periodInfo,
  isDetectingPeriod = false
}: VacationFormFieldsProps) => {
  const handleTypeChange = (newType: VacationAbsenceType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      subtipo: undefined
    }));
  };

  const subtypesForCurrentType = getSubtypesForType(formData.type);
  const isSubtypeRequired = requiresSubtype(formData.type);

  return (
    <>
      {/* Employee Selection */}
      <div className="space-y-2">
        <Label htmlFor="employee_id">Empleado *</Label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar empleado..." />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={`employee-${employee.id}`} value={employee.id}>
                {employee.nombre} {employee.apellido} - {employee.cedula}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {employees.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay empleados activos disponibles
          </p>
        )}
      </div>

      {/* Tipo de Ausencia */}
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Ausencia *</Label>
        <Select
          value={formData.type}
          onValueChange={handleTypeChange}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo de ausencia..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ABSENCE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subtipo dinámico basado en el tipo seleccionado */}
      {subtypesForCurrentType.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="subtipo">
            Subtipo {isSubtypeRequired ? '*' : ''}
          </Label>
          <Select
            value={formData.subtipo || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, subtipo: value || undefined }))}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue 
                placeholder={`Seleccionar subtipo de ${ABSENCE_TYPE_LABELS[formData.type].toLowerCase()}...`}
              />
            </SelectTrigger>
            <SelectContent>
              {subtypesForCurrentType.map((subtype) => (
                <SelectItem key={subtype.value} value={subtype.value}>
                  {subtype.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSubtypeRequired && !formData.subtipo && (
            <p className="text-sm text-red-600">
              El subtipo es requerido para {ABSENCE_TYPE_LABELS[formData.type].toLowerCase()}
            </p>
          )}
        </div>
      )}

      {/* Date Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Fecha de Inicio *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha de Fin *</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      {/* 🎯 NUEVA FUNCIONALIDAD: Información del período detectado */}
      {(isDetectingPeriod || periodInfo) && (
        <div className="space-y-3">
          {isDetectingPeriod && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="text-sm">Detectando período...</span>
              </div>
            </div>
          )}
          
          {periodInfo && (
            <div className={`p-3 border rounded-lg ${
              periodInfo.periodId 
                ? 'bg-green-50 border-green-200' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-2">
                {periodInfo.periodId ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    periodInfo.periodId ? 'text-green-700' : 'text-amber-700'
                  }`}>
                    {periodInfo.periodId ? 'Período asignado' : 'Período no encontrado'}
                  </div>
                  <div className={`text-sm ${
                    periodInfo.periodId ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {periodInfo.message}
                  </div>
                  {periodInfo.isAutoCreated && (
                    <div className="text-xs text-green-500 mt-1">
                      ✨ Período creado automáticamente
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calculated Days Display */}
      {calculatedDays > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <CalendarDays className="h-4 w-4" />
            <span className="font-medium">Días calculados: {calculatedDays}</span>
          </div>
        </div>
      )}

      {/* Observations */}
      <div className="space-y-2">
        <Label htmlFor="observations">Observaciones</Label>
        <Textarea
          id="observations"
          placeholder="Observaciones adicionales..."
          value={formData.observations}
          onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
          disabled={isSubmitting}
          rows={3}
        />
      </div>
    </>
  );
};
