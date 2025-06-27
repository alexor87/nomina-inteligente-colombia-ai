
import { Control, FieldErrors } from 'react-hook-form';
import { FormField } from './FormField';
import { EmployeeFormData } from './types';

interface SecurityEntitiesSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  epsEntities: any[];
  afpEntities: any[];
  arlEntities: any[];
  compensationFunds: any[];
}

export const SecurityEntitiesSection = ({
  control,
  errors,
  epsEntities,
  afpEntities,
  arlEntities,
  compensationFunds
}: SecurityEntitiesSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        name="eps"
        label="EPS"
        type="select"
        control={control}
        errors={errors}
        options={epsEntities.map(eps => ({
          value: eps.name,
          label: eps.name
        }))}
      />

      <FormField
        name="afp"
        label="AFP"
        type="select"
        control={control}
        errors={errors}
        options={afpEntities.map(afp => ({
          value: afp.name,
          label: afp.name
        }))}
      />

      <FormField
        name="arl"
        label="ARL"
        type="select"
        control={control}
        errors={errors}
        options={arlEntities.map(arl => ({
          value: arl.name,
          label: arl.name
        }))}
      />

      <FormField
        name="cajaCompensacion"
        label="Caja de Compensación"
        type="select"
        control={control}
        errors={errors}
        options={compensationFunds.map(fund => ({
          value: fund.name,
          label: fund.name
        }))}
      />
    </div>
  );
};
