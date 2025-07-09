
import { PersonalInfoSection } from './PersonalInfoSection';
import { LaborInfoSection } from './LaborInfoSection';
import { BankingInfoSection } from './BankingInfoSection';
import { AffiliationsSection } from './AffiliationsSection';
import { CustomFieldsSection } from './CustomFieldsSection';
import { TimeOffSection } from './TimeOffSection';
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
  setIsTimeOffModalOpen: (isOpen: boolean) => void;
}

export const EmployeeFormContent = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch, 
  arlRiskLevels, 
  register,
  customFields = [],
  setIsTimeOffModalOpen
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

        {/* ✅ KISS: Sección Simple de Tiempo Libre con comunicación directa */}
        <TimeOffSection
          employeeId={watchedValues.id}
          isReadOnly={false}
          onModalStateChange={setIsTimeOffModalOpen}
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
