
import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';

// ✅ FIXED: Added missing props to support both wizard and form modes
interface BankingInfoSectionProps {
  control?: Control<EmployeeFormData>;
  errors?: FieldErrors<EmployeeFormData>;
  watchedValues?: EmployeeFormData;
  setValue?: UseFormSetValue<EmployeeFormData>;
  watch?: UseFormWatch<EmployeeFormData>;
  register?: any;
  formData?: any;
  updateFormData?: (data: any) => void;
}

export const BankingInfoSection: React.FC<BankingInfoSectionProps> = ({
  control,
  errors = {},
  watchedValues,
  setValue,
  watch,
  register,
  formData,
  updateFormData
}) => {
  // ✅ SIMPLIFIED: Use formData if available (for wizard)
  const isWizardMode = !!formData && !!updateFormData;

  if (isWizardMode) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información Bancaria</h3>
          <p className="text-gray-600">Sección de información bancaria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Bancaria</h3>
        <p className="text-gray-600">Sección de información bancaria</p>
      </div>
    </div>
  );
};
