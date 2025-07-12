
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Control, FieldErrors, Controller } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { Calendar } from 'lucide-react';

interface VacationInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
}

export const VacationInfoSection = ({ control, errors }: VacationInfoSectionProps) => {
  return (
    <Card className="scroll-mt-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span>Información de Vacaciones</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal text-gray-600">
              Balance Inicial de Vacaciones (días)
            </Label>
            <Controller
              name="initialVacationBalance"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  min="0"
                  max="365"
                  placeholder="15"
                  className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md"
                  {...field}
                  value={field.value?.toString() || ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              )}
            />
            {errors.initialVacationBalance && (
              <p className="text-red-400 text-xs mt-1">
                {errors.initialVacationBalance.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-normal text-gray-600">
              Fecha Último Cálculo (opcional)
            </Label>
            <Controller
              name="lastVacationCalculation"
              control={control}
              render={({ field }) => (
                <Input
                  type="date"
                  className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md"
                  {...field}
                  value={field.value || ''}
                />
              )}
            />
            {errors.lastVacationCalculation && (
              <p className="text-red-400 text-xs mt-1">
                {errors.lastVacationCalculation.message}
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Información:</strong> El balance inicial representa los días de vacaciones que el empleado 
            tiene disponibles al momento de su registro. Este valor se utilizará como base para calcular 
            las vacaciones acumuladas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
