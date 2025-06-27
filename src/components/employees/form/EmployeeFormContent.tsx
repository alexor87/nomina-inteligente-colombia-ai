
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { PersonalInfoSection } from './PersonalInfoSection';
import { LaborInfoSection } from './LaborInfoSection';
import { BankingInfoSection } from './BankingInfoSection';
import { AffiliationsSection } from './AffiliationsSection';
import { EmployeeFormData } from './types';

interface EmployeeFormContentProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  arlRiskLevels: { value: string; label: string; percentage: string }[];
  register: any;
  configuration: any;
}

export const EmployeeFormContent = ({
  control,
  errors,
  watchedValues,
  setValue,
  watch,
  arlRiskLevels,
  register,
  configuration
}: EmployeeFormContentProps) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="space-y-0">
        {/* Personal Information Section */}
        <div id="section-personal">
          <PersonalInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            watch={watch}
          />
        </div>

        {/* Labor Information Section */}
        <div id="section-laboral">
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

        {/* Affiliations Section */}
        <div id="section-afiliaciones">
          <AffiliationsSection
            control={control}
            errors={errors}
          />
        </div>

        {/* Banking Information Section */}
        <div id="section-bancaria">
          <BankingInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            register={register}
          />
        </div>

        {/* Custom Fields Section - Only if configured */}
        {configuration.customFields.length > 0 && (
          <div id="section-personalizados" className="border-t border-gray-100 pt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Campos Personalizados</h2>
            {/* Custom fields implementation would go here */}
          </div>
        )}
      </div>
    </div>
  );
};
