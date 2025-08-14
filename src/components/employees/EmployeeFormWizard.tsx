
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowLeft, ArrowRight } from 'lucide-react';
import { EmployeeUnified } from '@/types/employee-unified';
import { PersonalInfoSection } from './form/PersonalInfoSection';
import { LaborInfoSection } from './form/LaborInfoSection';
import { BankingInfoSection } from './form/BankingInfoSection';
import { AffiliationsSection } from './form/AffiliationsSection';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { useToast } from '@/hooks/use-toast';

interface EmployeeFormWizardProps {
  employee?: EmployeeUnified;
  onSuccess?: (employee: EmployeeUnified) => void;
  onCancel?: () => void;
}

const steps = [
  { id: 'personal', title: 'Información Personal', icon: Circle },
  { id: 'labor', title: 'Información Laboral', icon: Circle },
  { id: 'banking', title: 'Información Bancaria', icon: Circle },
  { id: 'affiliations', title: 'Afiliaciones', icon: Circle }
];

export const EmployeeFormWizard = ({ 
  employee, 
  onSuccess, 
  onCancel 
}: EmployeeFormWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<EmployeeUnified>>(
    employee || {
      empresaId: '',
      cedula: '',
      tipoDocumento: 'CC',
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      salarioBase: 0,
      tipoContrato: 'indefinido',
      fechaIngreso: new Date().toISOString().split('T')[0],
      periodicidadPago: 'mensual',
      cargo: '',
      estado: 'activo',
      banco: '',
      tipoCuenta: 'ahorros',
      numeroCuenta: '',
      titularCuenta: '',
      eps: '',
      afp: '',
      arl: '',
      cajaCompensacion: '',
      regimenSalud: 'contributivo',
      estadoAfiliacion: 'pendiente',
      tipoJornada: 'completa',
      formaPago: 'dispersion',
      custom_fields: {}
    }
  );
  
  const { createEmployee, updateEmployee, isCreating, isUpdating } = useEmployeeCRUD();
  const { toast } = useToast();

  const updateFormData = (section: string, data: Partial<EmployeeUnified>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Personal
        return !!(formData.cedula && formData.nombre && formData.apellido);
      case 1: // Labor
        return !!(formData.salarioBase && formData.fechaIngreso && formData.cargo);
      case 2: // Banking
        return !!(formData.banco && formData.tipoCuenta);
      case 3: // Affiliations
        return !!(formData.eps && formData.afp);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      // Ensure all required fields are present
      const employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> = {
        empresaId: formData.empresaId || '',
        cedula: formData.cedula || '',
        tipoDocumento: formData.tipoDocumento || 'CC',
        nombre: formData.nombre || '',
        segundoNombre: formData.segundoNombre,
        apellido: formData.apellido || '',
        email: formData.email,
        telefono: formData.telefono,
        sexo: formData.sexo,
        fechaNacimiento: formData.fechaNacimiento,
        direccion: formData.direccion,
        ciudad: formData.ciudad,
        departamento: formData.departamento,
        salarioBase: formData.salarioBase || 0,
        tipoContrato: formData.tipoContrato || 'indefinido',
        fechaIngreso: formData.fechaIngreso || new Date().toISOString().split('T')[0],
        periodicidadPago: formData.periodicidadPago || 'mensual',
        cargo: formData.cargo,
        codigoCIIU: formData.codigoCIIU,
        nivelRiesgoARL: formData.nivelRiesgoARL,
        estado: formData.estado || 'activo',
        centroCostos: formData.centroCostos,
        fechaFirmaContrato: formData.fechaFirmaContrato,
        fechaFinalizacionContrato: formData.fechaFinalizacionContrato,
        tipoJornada: formData.tipoJornada || 'completa',
        diasTrabajo: formData.diasTrabajo,
        horasTrabajo: formData.horasTrabajo,
        beneficiosExtralegales: formData.beneficiosExtralegales,
        clausulasEspeciales: formData.clausulasEspeciales,
        banco: formData.banco,
        tipoCuenta: formData.tipoCuenta || 'ahorros',
        numeroCuenta: formData.numeroCuenta,
        titularCuenta: formData.titularCuenta,
        formaPago: formData.formaPago || 'dispersion',
        eps: formData.eps,
        afp: formData.afp,
        arl: formData.arl,
        cajaCompensacion: formData.cajaCompensacion,
        tipoCotizanteId: formData.tipoCotizanteId,
        subtipoCotizanteId: formData.subtipoCotizanteId,
        regimenSalud: formData.regimenSalud || 'contributivo',
        estadoAfiliacion: formData.estadoAfiliacion || 'pendiente',
        custom_fields: formData.custom_fields || {}
      };

      let result;
      if (employee?.id) {
        result = await updateEmployee(employee.id, employeeData);
      } else {
        result = await createEmployee(employeeData);
      }

      if (result) {
        toast({
          title: "Empleado guardado exitosamente",
          description: employee ? "Los datos se actualizaron correctamente" : "El empleado se creó correctamente"
        });
        onSuccess?.(result);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar el empleado",
        variant: "destructive"
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <PersonalInfoSection
            formData={formData}
            updateFormData={(data) => updateFormData('personal', data)}
            errors={{}}
          />
        );
      case 1:
        return (
          <LaborInfoSection
            formData={formData}
            updateFormData={(data) => updateFormData('labor', data)}
            errors={{}}
          />
        );
      case 2:
        return (
          <BankingInfoSection
            formData={formData}
            updateFormData={(data) => updateFormData('banking', data)}
            errors={{}}
          />
        );
      case 3:
        return (
          <AffiliationsSection
            formData={formData}
            updateFormData={(data) => updateFormData('affiliations', data)}
            errors={{}}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const canProceed = validateStep(currentStep);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isValid = validateStep(index);
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isCompleted 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : isCurrent 
                    ? isValid 
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-red-500 text-red-500'
                    : 'bg-white border-gray-300 text-gray-500'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isCurrent ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-300 mx-4" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {steps[currentStep].title}
            <Badge variant="outline">
              {currentStep + 1} de {steps.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : handlePrev}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 0 ? 'Cancelar' : 'Anterior'}
        </Button>

        <Button
          onClick={isLastStep ? handleSubmit : handleNext}
          disabled={!canProceed || isCreating || isUpdating}
          className="flex items-center"
        >
          {isLastStep ? 'Guardar' : 'Siguiente'}
          {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
};
