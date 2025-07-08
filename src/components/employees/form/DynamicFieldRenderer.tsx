
import React from 'react';
import { Control, FieldValues, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Controller } from 'react-hook-form';
import { CustomField } from '@/types/employee-config';

interface DynamicFieldRendererProps {
  field: CustomField;
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
}

export const DynamicFieldRenderer = ({ field, control, setValue, errors }: DynamicFieldRendererProps) => {
  const fieldName = `custom_fields.${field.field_key}`;
  const hasError = errors.custom_fields?.[field.field_key];

  const renderFieldByType = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <Controller
            name={fieldName}
            control={control}
            defaultValue={field.default_value || ''}
            rules={{ required: field.is_required ? `${field.field_label} es requerido` : false }}
            render={({ field: formField }) => (
              <Input
                {...formField}
                placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
                className={hasError ? 'border-red-500' : ''}
              />
            )}
          />
        );

      case 'number':
        return (
          <Controller
            name={fieldName}
            control={control}
            defaultValue={field.default_value || 0}
            rules={{ required: field.is_required ? `${field.field_label} es requerido` : false }}
            render={({ field: formField }) => (
              <Input
                {...formField}
                type="number"
                placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
                className={hasError ? 'border-red-500' : ''}
                onChange={(e) => formField.onChange(Number(e.target.value))}
              />
            )}
          />
        );

      case 'date':
        return (
          <Controller
            name={fieldName}
            control={control}
            defaultValue={field.default_value || ''}
            rules={{ required: field.is_required ? `${field.field_label} es requerido` : false }}
            render={({ field: formField }) => (
              <Input
                {...formField}
                type="date"
                className={hasError ? 'border-red-500' : ''}
              />
            )}
          />
        );

      case 'boolean':
        return (
          <Controller
            name={fieldName}
            control={control}
            defaultValue={field.default_value || false}
            render={({ field: formField }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formField.value}
                  onCheckedChange={formField.onChange}
                />
                <Label className="text-sm font-normal">
                  Sí
                </Label>
              </div>
            )}
          />
        );

      case 'select':
        const options = Array.isArray(field.field_options) ? field.field_options : [];
        return (
          <Controller
            name={fieldName}
            control={control}
            defaultValue={field.default_value || ''}
            rules={{ required: field.is_required ? `${field.field_label} es requerido` : false }}
            render={({ field: formField }) => (
              <Select onValueChange={formField.onChange} value={formField.value}>
                <SelectTrigger className={hasError ? 'border-red-500' : ''}>
                  <SelectValue placeholder={`Seleccionar ${field.field_label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option, index) => (
                    <SelectItem key={index} value={String(option)}>
                      {String(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case 'email':
        return (
          <Controller
            name={fieldName}
            control={control}
            defaultValue={field.default_value || ''}
            rules={{ 
              required: field.is_required ? `${field.field_label} es requerido` : false,
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email inválido'
              }
            }}
            render={({ field: formField }) => (
              <Input
                {...formField}
                type="email"
                placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
                className={hasError ? 'border-red-500' : ''}
              />
            )}
          />
        );

      case 'phone':
        return (
          <Controller
            name={fieldName}
            control={control}
            defaultValue={field.default_value || ''}
            rules={{ required: field.is_required ? `${field.field_label} es requerido` : false }}
            render={({ field: formField }) => (
              <Input
                {...formField}
                type="tel"
                placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
                className={hasError ? 'border-red-500' : ''}
              />
            )}
          />
        );

      default:
        return (
          <Input
            placeholder="Tipo de campo no soportado"
            disabled
            className="bg-gray-100"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName} className="text-sm font-medium">
        {field.field_label}
        {field.is_required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderFieldByType()}
      {hasError && (
        <p className="text-red-500 text-sm">
          {hasError.message || `${field.field_label} es requerido`}
        </p>
      )}
    </div>
  );
};
