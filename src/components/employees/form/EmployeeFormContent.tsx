
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

// ✅ FIXED: Convert FieldErrors to simple error record for compatibility
const convertFieldErrorsToRecord = (errors: FieldErrors<EmployeeFormData>): Record<string, string> => {
  const errorRecord: Record<string, string> = {};
  
  Object.keys(errors).forEach(key => {
    const error = errors[key as keyof EmployeeFormData];
    if (error && typeof error === 'object' && 'message' in error) {
      errorRecord[key] = error.message || 'Error de validación';
    } else if (typeof error === 'string') {
      errorRecord[key] = error;
    }
  });
  
  return errorRecord;
};

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
  // Convert field errors to simple record for legacy components
  const simpleErrors = convertFieldErrorsToRecord(errors);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Personal Information Section */}
        <PersonalInfoSection 
          control={control}
          errors={simpleErrors}
          watchedValues={watchedValues}
          watch={watch}
        />

        {/* Labor Information Section */}
        <LaborInfoSection
          control={control}
          errors={simpleErrors}
          watchedValues={watchedValues}
          setValue={setValue}
          watch={watch}
          arlRiskLevels={arlRiskLevels}
          register={register}
        />

        {/* Banking Information Section */}
        <BankingInfoSection
          control={control}
          errors={simpleErrors}
          watchedValues={watchedValues}
          setValue={setValue}
          watch={watch}
          register={register}
        />

        {/* Affiliations Section */}
        <AffiliationsSection
          control={control}
          errors={simpleErrors}
          watchedValues={watchedValues}
          setValue={setValue}
        />

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <CustomFieldsSection
            customFields={customFields}
            control={control}
            errors={simpleErrors}
            setValue={setValue}
          />
        )}
      </div>
    </div>
  );
};
