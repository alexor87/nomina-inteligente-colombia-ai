
import { PersonalInfoSection } from './PersonalInfoSection';
import { LaborInfoSection } from './LaborInfoSection';
import { BankingInfoSection } from './BankingInfoSection';
import { AffiliationsSection } from './AffiliationsSection';
import { VacationInfoSection } from './VacationInfoSection';
import { CustomFieldsSection } from './CustomFieldsSection';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';

interface EmployeeFormContentProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  arlRiskLevels: { value: string; label: string; percentage: string }[];
  register: any;
  customFields: any[];
}

export const EmployeeFormContent = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch, 
  arlRiskLevels, 
  register,
  customFields = []
}: EmployeeFormContentProps) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Personal Information Section */}
        <PersonalInfoSection 
          control={control}
          errors={errors}
          watchedValues={watchedValues}
          watch={watch}
        />

        {/* Labor Information Section */}
        <LaborInfoSection
          control={control}
          errors={errors}
          watchedValues={watchedValues}
          setValue={setValue}
          watch={watch}
          arlRiskLevels={arlRiskLevels}
          register={register}
        />

        {/* Banking Information Section */}
        <BankingInfoSection
          control={control}
          errors={errors}
          watchedValues={watchedValues}
          setValue={setValue}
          watch={watch}
          register={register}
        />

        {/* Affiliations Section */}
        <AffiliationsSection
          control={control}
          errors={errors}
          watchedValues={watchedValues}
          setValue={setValue}
        />

        {/* Vacation Information Section */}
        <VacationInfoSection
          control={control}
          errors={errors}
        />

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <CustomFieldsSection
            customFields={customFields}
            control={control}
            errors={errors}
            setValue={setValue}
          />
        )}
      </div>
    </div>
  );
};
