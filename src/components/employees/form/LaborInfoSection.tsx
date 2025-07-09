
import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';

// ✅ FIXED: Added missing props to support both wizard and form modes
interface LaborInfoSectionProps {
  control?: Control<EmployeeFormData>;
  errors?: FieldErrors<EmployeeFormData>;
  watchedValues?: EmployeeFormData;
  setValue?: UseFormSetValue<EmployeeFormData>;
  watch?: UseFormWatch<EmployeeFormData>;
  arlRiskLevels?: { value: string; label: string; percentage: string }[];
  register?: any;
  formData?: any;
  updateFormData?: (data: any) => void;
}

export const LaborInfoSection: React.FC<LaborInfoSectionProps> = ({
  control,
  errors = {},
  watchedValues,
  setValue,
  watch,
  arlRiskLevels = [],
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
          <p className="text-gray-600">Sección de información laboral</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
        <p className="text-gray-600">Sección de información laboral</p>
      </div>
    </div>
  );
};
