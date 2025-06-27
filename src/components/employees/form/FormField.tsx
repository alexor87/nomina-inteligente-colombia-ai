
import { Control, FieldErrors, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import { EmployeeFormData } from './types';

interface FormFieldProps {
  name: keyof EmployeeFormData;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select';
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  options?: { value: string; label: string }[];
  required?: boolean;
  icon?: React.ReactNode;
  helpText?: string;
}

export const FormField = ({
  name,
  label,
  type,
  control,
  errors,
  options,
  required = false,
  icon,
  helpText
}: FormFieldProps) => {
  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <Label className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {helpText && (
          <div className="relative group/tooltip">
            <Info className="w-3 h-3 text-gray-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tooltip:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {helpText}
            </div>
          </div>
        )}
      </div>
      
      <Controller
        name={name}
        control={control}
        rules={{ required: required ? `${label} es requerido` : false }}
        render={({ field }) => {
          if (type === 'select' && options) {
            return (
              <Select 
                onValueChange={field.onChange}
                value={field.value as string || ''}
              >
                <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <SelectValue placeholder={`Seleccionar ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
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
              className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={`Ingresa ${label.toLowerCase()}`}
              value={field.value || ''}
            />
          );
        }}
      />
      
      {errors[name] && (
        <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>
      )}
    </div>
  );
};
