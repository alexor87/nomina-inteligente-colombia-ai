
import { Control, FieldErrors, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeFormData } from './types';

interface FormFieldProps {
  name: keyof EmployeeFormData;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select';
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const FormField = ({
  name,
  label,
  type,
  control,
  errors,
  options,
  required = false,
  placeholder,
  disabled = false,
  onValueChange,
  className
}: FormFieldProps) => {
  console.log(`🔍 FormField ${name}:`, { 
    hasError: !!errors[name], 
    error: errors[name]?.message,
    required,
    currentValue: control._getWatch(name)
  });

  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      <Label className="text-sm font-normal text-gray-600">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      
      <Controller
        name={name}
        control={control}
        rules={{ 
          required: required ? `${label} es requerido` : false 
        }}
        render={({ field }) => {
          if (type === 'select' && options) {
            // Filter out empty values from options
            const validOptions = options.filter(option => option.value && option.value.trim() !== '');
            
            return (
              <Select 
                onValueChange={(value) => {
                  console.log(`🔄 Select ${name} changed to:`, value);
                  field.onChange(value);
                  onValueChange?.(value);
                }}
                value={field.value?.toString() || ''}
                disabled={disabled}
              >
                <SelectTrigger className={`h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder={placeholder || `Seleccionar ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg z-50">
                  {validOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="hover:bg-gray-50 focus:bg-gray-50"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          return (
            <Input
              {...field}
              type={type}
              className="h-9 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-0 bg-white transition-colors rounded-md"
              placeholder={placeholder || `Ingresa ${label.toLowerCase()}`}
              value={field.value?.toString() || ''}
              disabled={disabled}
              onChange={(e) => {
                const value = type === 'number' ? Number(e.target.value) || 0 : e.target.value;
                console.log(`🔄 Input ${name} changed to:`, value);
                field.onChange(value);
              }}
            />
          );
        }}
      />
      
      {errors[name] && (
        <p className="text-red-400 text-xs mt-1">
          {typeof errors[name]?.message === 'string' ? errors[name]?.message : `${label} es requerido`}
        </p>
      )}
    </div>
  );
};
