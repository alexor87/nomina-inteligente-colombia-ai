
import React from 'react';
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { EmployeeFormData } from './types';

// ✅ SIMPLIFIED: Support both wizard and form modes
interface AffiliationsSectionProps {
  control?: Control<EmployeeFormData>;
  errors?: FieldErrors<EmployeeFormData>;
  watchedValues?: EmployeeFormData;
  setValue?: UseFormSetValue<EmployeeFormData>;
  formData?: any;
  updateFormData?: (data: any) => void;
}

export const AffiliationsSection: React.FC<AffiliationsSectionProps> = ({
  control,
  errors = {},
  watchedValues,
  setValue,
  formData,
  updateFormData
}) => {
  // ✅ SIMPLIFIED: Use formData if available (for wizard)
  const isWizardMode = !!formData && !!updateFormData;

  if (isWizardMode) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Afiliaciones</h3>
          <p className="text-gray-600">Sección de afiliaciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Afiliaciones</h3>
        <p className="text-gray-600">Sección de afiliaciones</p>
      </div>
    </div>
  );
};
