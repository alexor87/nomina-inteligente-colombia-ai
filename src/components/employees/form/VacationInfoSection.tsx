
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Control, FieldErrors } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { Calendar } from 'lucide-react';

interface VacationInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
}

export const VacationInfoSection = ({ control, errors }: VacationInfoSectionProps) => {
  return (
    <Card id="vacaciones" className="scroll-mt-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span>Información de Vacaciones</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="initialVacationBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Balance Inicial de Vacaciones (días)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="365"
                    placeholder="15"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="lastVacationCalculation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Último Cálculo (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
