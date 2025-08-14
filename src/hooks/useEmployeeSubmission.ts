import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SecureEmployeeService } from '@/services/SecureEmployeeService';
import { EmployeeUnified } from '@/types/employee-unified';

interface UseEmployeeSubmissionProps {
  employee?: EmployeeUnified | null;
  onSuccess: () => void;
}

interface SubmissionError {
  field?: string;
  message: string;
  code?: string;
}

export const useEmployeeSubmission = ({ employee, onSuccess }: UseEmployeeSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const validateSalario = (data: any): SubmissionError | null => {
    const salarioBase = Number(data.salarioBase);
    const tipoSalario = data.tipoSalario;

    if (!salarioBase || salarioBase <= 0) {
      return {
        field: 'salarioBase',
        message: 'El salario base debe ser mayor a 0',
        code: 'INVALID_SALARY'
      };
    }

    // Validación específica para salario integral (13 SMMLV ≈ $16,900,000 en 2024)
    if (tipoSalario === 'integral' && salarioBase < 16900000) {
      return {
        field: 'salarioBase',
        message: 'El salario integral debe ser mínimo 13 SMMLV (aproximadamente $16,900,000)',
        code: 'SALARY_BELOW_INTEGRAL_MINIMUM'
      };
    }

    return null;
  };

  const validateRequiredFields = (data: any): SubmissionError | null => {
    const requiredFields = [
      { key: 'cedula', name: 'Cédula' },
      { key: 'nombre', name: 'Nombre' },
      { key: 'apellido', name: 'Apellido' },
      { key: 'salarioBase', name: 'Salario base' },
      { key: 'tipoContrato', name: 'Tipo de contrato' },
      { key: 'fechaIngreso', name: 'Fecha de ingreso' }
    ];

    for (const field of requiredFields) {
      if (!data[field.key] || (typeof data[field.key] === 'string' && data[field.key].trim() === '')) {
        return {
          field: field.key,
          message: `${field.name} es requerido`,
          code: 'REQUIRED_FIELD_MISSING'
        };
      }
    }

    return null;
  };

  const sanitizeFormData = (data: any): EmployeeUnified => {
    // Limpiar campos undefined y aplicar valores por defecto
    const sanitized = {
      ...data,
      tipoDocumento: data.tipoDocumento || 'CC',
      tipoSalario: data.tipoSalario || 'mensual',
      tipoContrato: data.tipoContrato || 'indefinido',
      estado: data.estado || 'activo',
      tipoJornada: data.tipoJornada || 'completa',
      periodicidadPago: data.periodicidadPago || 'mensual',
      salarioBase: Number(data.salarioBase) || 0,
      // Limpiar campos de texto
      nombre: data.nombre?.trim() || '',
      apellido: data.apellido?.trim() || '',
      cedula: data.cedula?.trim() || '',
      email: data.email?.trim() || null,
      telefono: data.telefono?.trim() || null,
      // Garantizar company_id
      company_id: data.company_id || data.empresaId,
      empresaId: data.empresaId || data.company_id
    };

    // Eliminar campos undefined
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    return sanitized as EmployeeUnified;
  };

  const handleSubmit = async (formData: any) => {
    console.log('🚀 EMPLOYEE SUBMISSION STARTED');
    console.log('📝 Form data received:', formData);
    console.log('👤 Employee mode:', employee ? 'EDIT' : 'CREATE');

    setIsSubmitting(true);

    try {
      // 1. Validar campos requeridos
      const requiredError = validateRequiredFields(formData);
      if (requiredError) {
        throw new Error(requiredError.message);
      }

      // 2. Validar salario
      const salaryError = validateSalario(formData);
      if (salaryError) {
        throw new Error(salaryError.message);
      }

      // 3. Sanitizar datos
      const sanitizedData = sanitizeFormData(formData);
      console.log('🧹 Sanitized data:', sanitizedData);

      let result;
      let actionText;

      if (employee?.id) {
        // ACTUALIZAR empleado existente
        console.log('📝 Updating existing employee:', employee.id);
        
        result = await SecureEmployeeService.updateEmployee(employee.id, sanitizedData);
        actionText = 'actualizado';
      } else {
        // CREAR nuevo empleado
        console.log('➕ Creating new employee');
        
        result = await SecureEmployeeService.createEmployee(sanitizedData);
        actionText = 'creado';
      }

      console.log('📤 Service result:', result);

      if (result.success && result.data) {
        console.log('✅ Employee operation successful:', result.data);

        toast({
          title: `Empleado ${actionText} ✅`,
          description: `${result.data.nombre} ${result.data.apellido} ha sido ${actionText} exitosamente`,
          className: "border-green-200 bg-green-50"
        });

        console.log('🎉 Calling onSuccess callback');
        onSuccess();
      } else {
        throw new Error(result.error || `Error al ${actionText.replace('do', 'ar')} empleado`);
      }

    } catch (error) {
      console.error('❌ Employee submission error:', error);

      let errorMessage = "Error desconocido al procesar empleado";

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Mejorar mensajes de error específicos
        if (error.message.includes('Salario integral')) {
          // Ya tenemos el mensaje correcto
        } else if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          errorMessage = "Ya existe un empleado con esta cédula";
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = "Los datos proporcionados no cumplen con las validaciones requeridas";
        } else if (error.message.includes('invalid input syntax')) {
          errorMessage = "Formato de datos inválido";
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    isSubmitting
  };
};