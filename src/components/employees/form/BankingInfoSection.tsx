
import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch, UseFormRegister } from 'react-hook-form';
import { EmployeeFormData } from './types';

// ✅ FIXED: Simplified error type
interface BankingInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: Record<string, any>; // ✅ SIMPLIFIED: Generic error type
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  register: UseFormRegister<EmployeeFormData>;
  formData?: any; // For wizard compatibility
  updateFormData?: (data: any) => void; // For wizard compatibility
}

export const BankingInfoSection: React.FC<BankingInfoSectionProps> = ({
  control,
  errors,
  watchedValues,
  setValue,
  watch,
  register,
  formData,
  updateFormData
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Bancaria</h3>
        <p className="text-gray-600">Sección de información bancaria</p>
      </div>
    </div>
  );
};
