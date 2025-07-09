
import React from 'react';
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { EmployeeFormData } from './types';

// ✅ FIXED: Simplified error type
interface AffiliationsSectionProps {
  control: Control<EmployeeFormData>;
  errors: Record<string, any>; // ✅ SIMPLIFIED: Generic error type
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  formData?: any; // For wizard compatibility
  updateFormData?: (data: any) => void; // For wizard compatibility
}

export const AffiliationsSection: React.FC<AffiliationsSectionProps> = ({
  control,
  errors,
  watchedValues,
  setValue,
  formData,
  updateFormData
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Afiliaciones</h3>
        <p className="text-gray-600">Sección de afiliaciones</p>
      </div>
    </div>
  );
};
