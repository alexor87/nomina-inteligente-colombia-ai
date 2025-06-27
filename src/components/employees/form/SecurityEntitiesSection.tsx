
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeFormData } from './types';

interface SecurityEntitiesSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  epsEntities: any[];
  afpEntities: any[];
  arlEntities: any[];
  compensationFunds: any[];
}

export const SecurityEntitiesSection = ({
  setValue,
  watchedValues,
  epsEntities,
  afpEntities,
  arlEntities,
  compensationFunds
}: SecurityEntitiesSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label className="text-sm text-gray-600">EPS</Label>
        <Select onValueChange={(value) => setValue('eps', value)} value={watchedValues.eps}>
          <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
            <SelectValue placeholder="Seleccionar EPS" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            {epsEntities.map((eps) => (
              <SelectItem key={eps.id} value={eps.name} className="text-sm">
                {eps.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-sm text-gray-600">AFP</Label>
        <Select onValueChange={(value) => setValue('afp', value)} value={watchedValues.afp}>
          <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
            <SelectValue placeholder="Seleccionar AFP" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            {afpEntities.map((afp) => (
              <SelectItem key={afp.id} value={afp.name} className="text-sm">
                {afp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-sm text-gray-600">ARL</Label>
        <Select onValueChange={(value) => setValue('arl', value)} value={watchedValues.arl}>
          <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
            <SelectValue placeholder="Seleccionar ARL" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            {arlEntities.map((arl) => (
              <SelectItem key={arl.id} value={arl.name} className="text-sm">
                {arl.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-sm text-gray-600">Caja de Compensación</Label>
        <Select onValueChange={(value) => setValue('cajaCompensacion', value)} value={watchedValues.cajaCompensacion}>
          <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
            <SelectValue placeholder="Seleccionar Caja de Compensación" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            {compensationFunds.map((fund) => (
              <SelectItem key={fund.id} value={fund.name} className="text-sm">
                {fund.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
