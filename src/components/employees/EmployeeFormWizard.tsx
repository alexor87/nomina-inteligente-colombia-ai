import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { PersonalInfoSection } from './PersonalInfoSection';
import { LaborInfoSection } from './LaborInfoSection';
import { BankingInfoSection } from './BankingInfoSection';
import { AffiliationsSection } from './AffiliationsSection';
import { CustomFieldsSection } from './CustomFieldsSection';
import { EmployeeFormData, EmployeeValidationEnhancedSchema } from './types';
import { EmployeeUnified } from '@/types/employee-unified';
import { useARLRiskLevels } from './useARLRiskLevels';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EmployeeFormWizardProps {
  employee?: EmployeeUnified | null;
  onSuccess: () => void;
  onCancel: () => void;
}

type SectionKey = 'personal' | 'laboral' | 'bancaria' | 'afiliaciones' | 'personalizados';

export const EmployeeFormWizard = ({ employee, onSuccess, onCancel }: EmployeeFormWizardProps) => {
  const [currentSection, setCurrentSection] = useState<SectionKey>('personal');
  const { arlRiskLevels } = useARLRiskLevels();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(EmployeeValidationEnhancedSchema),
    defaultValues: {
      cedula: employee?.cedula || '',
      tipoDocumento: employee?.tipoDocumento || 'CC',
      nombre: employee?.nombre || '',
      segundoNombre: employee?.segundoNombre || '',
      apellido: employee?.apellido || '',
      email: employee?.email || '',
      telefono: employee?.telefono || '',
      sexo: employee?.sexo,
      fechaNacimiento: employee?.fechaNacimiento || '',
      direccion: employee?.direccion || '',
      ciudad: employee?.ciudad || '',
      departamento: employee?.departamento || '',
      salarioBase: employee?.salarioBase || 0,
      tipoContrato: employee?.tipoContrato || 'indefinido',
      fechaIngreso: employee?.fechaIngreso || new Date().toISOString().split('T')[0],
      periodicidadPago: employee?.periodicidadPago || 'mensual',
      cargo: employee?.cargo || '',
      codigoCIIU: employee?.codigoCIIU || '',
      nivelRiesgoARL: employee?.nivelRiesgoARL || '1',
      estado: (employee?.estado && ['activo', 'inactivo', 'vacaciones', 'incapacidad'].includes(employee.estado) ? employee.estado : 'activo'),
      centroCostos: employee?.centroCostos || '',
      fechaFirmaContrato: employee?.fechaFirmaContrato || '',
      fechaFinalizacionContrato: employee?.fechaFinalizacionContrato || '',
      tipoJornada: employee?.tipoJornada || 'completa',
      diasTrabajo: employee?.diasTrabajo || 30,
      horasTrabajo: employee?.horasTrabajo || 8,
      beneficiosExtralegales: employee?.beneficiosExtralegales || false,
      clausulasEspeciales: employee?.clausulasEspeciales || '',
      banco: employee?.banco || '',
      tipoCuenta: employee?.tipoCuenta || 'ahorros',
      numeroCuenta: employee?.numeroCuenta || '',
      titularCuenta: employee?.titularCuenta || '',
      formaPago: employee?.formaPago || 'dispersion',
      eps: employee?.eps || '',
      afp: employee?.afp || '',
      arl: employee?.arl || '',
      cajaCompensacion: employee?.cajaCompensacion || '',
      tipoCotizanteId: employee?.tipoCotizanteId || '',
      subtipoCotizanteId: employee?.subtipoCotizanteId || '',
      regimenSalud: employee?.regimenSalud || 'contributivo',
      estadoAfiliacion: employee?.estadoAfiliacion || 'pendiente',
      custom_fields: employee?.custom_fields || {}
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldFocusError: true
  });

  const { register, handleSubmit, formState, setValue, watch, trigger, reset, control } = form;
  const { errors, isValid, isDirty, isSubmitting } = formState;
  const watchedValues = watch();

  const nextSection = () => {
    switch (currentSection) {
      case 'personal':
        return setCurrentSection('laboral');
      case 'laboral':
        return setCurrentSection('bancaria');
      case 'bancaria':
        return setCurrentSection('afiliaciones');
      case 'afiliaciones':
        return setCurrentSection('personalizados');
      case 'personalizados':
        return setCurrentSection('personal');
      default:
        return setCurrentSection('personal');
    }
  };

  const prevSection = () => {
    switch (currentSection) {
      case 'personal':
        return setCurrentSection('personalizados');
      case 'laboral':
        return setCurrentSection('personal');
      case 'bancaria':
        return setCurrentSection('laboral');
      case 'afiliaciones':
        return setCurrentSection('bancaria');
      case 'personalizados':
        return setCurrentSection('afiliaciones');
      default:
        return setCurrentSection('personal');
    }
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'personal':
        return (
          <PersonalInfoSection 
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            watch={watch}
          />
        );
      case 'laboral':
        return (
          <LaborInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            arlRiskLevels={arlRiskLevels}
            register={register}
          />
        );
      case 'bancaria':
        return (
          <BankingInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            register={register}
          />
        );
      case 'afiliaciones':
        return (
          <AffiliationsSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
          />
        );
      case 'personalizados':
        return (
          <CustomFieldsSection
            control={control}
            errors={errors}
            setValue={setValue}
            customFields={[]}
          />
        );
      default:
        return null;
    }
  };

  const onSubmit = (data: EmployeeFormData) => {
    console.log('Form data submitted:', data);
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {renderCurrentSection()}

        <div className="flex justify-between">
          <Button variant="secondary" onClick={prevSection}>
            Anterior
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </Button>
          <Button variant="secondary" onClick={nextSection}>
            Siguiente
          </Button>
        </div>
      </form>
    </Form>
  );
};
