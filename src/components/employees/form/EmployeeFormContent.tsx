
import { PersonalInfoSection } from './PersonalInfoSection';
import { LaborInfoSection } from './LaborInfoSection';
import { BankingInfoSection } from './BankingInfoSection';
import { AffiliationsSection } from './AffiliationsSection';
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
        <div id="section-personal" className="scroll-mt-8">
          <PersonalInfoSection 
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            watch={watch}
          />
        </div>

        {/* Labor Information Section */}
        <div id="section-laboral" className="scroll-mt-8">
          <LaborInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            arlRiskLevels={arlRiskLevels}
            register={register}
          />
        </div>

        {/* Banking Information Section */}
        <div id="section-bancaria" className="scroll-mt-8">
          <BankingInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            register={register}
          />
        </div>

        {/* Affiliations Section */}
        <div id="section-afiliaciones" className="scroll-mt-8">
          <AffiliationsSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
          />
        </div>

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <div id="section-personalizados" className="scroll-mt-8">
            <CustomFieldsSection
              customFields={customFields}
              control={control}
              errors={errors}
              setValue={setValue}
            />
          </div>
        )}
      </div>
    </div>
  );
};
