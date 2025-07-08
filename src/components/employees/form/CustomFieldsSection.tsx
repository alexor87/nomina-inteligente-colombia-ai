
import React from 'react';
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { CustomField } from '@/types/employee-config';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import { EmployeeFormData } from './types';

interface CustomFieldsSectionProps {
  customFields: CustomField[];
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  setValue: UseFormSetValue<EmployeeFormData>;
}

export const CustomFieldsSection = ({ 
  customFields, 
  control, 
  errors, 
  setValue 
}: CustomFieldsSectionProps) => {
  if (!customFields || customFields.length === 0) {
    return null;
  }

  return (
    <div id="section-personalizados" className="border-t border-gray-100 pt-8">
      <h2 className="text-lg font-medium text-gray-900 mb-6">
        Campos Personalizados
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customFields
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((field) => (
            <DynamicFieldRenderer
              key={field.id}
              field={field}
              control={control}
              errors={errors}
              setValue={setValue}
            />
          ))}
      </div>
    </div>
  );
};
