
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Employee } from '@/types';
import { CONTRACT_TYPES, TIPOS_DOCUMENTO } from '@/types/employee-config';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, User, Briefcase, CreditCard, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmployeeFormData {
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  eps: string;
  afp: string;
  arl: string;
  cajaCompensacion: string;
  cargo: string;
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
  banco: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta: string;
  titularCuenta: string;
}

interface EmployeeFormWizardProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

const BANCOS_COLOMBIA = [
  'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia',
  'Banco Popular', 'Banco de Occidente', 'Banco AV Villas', 'Bancoomeva',
  'Banco Falabella', 'Banco Pichincha', 'Banco Caja Social', 'Nequi', 'Daviplata'
];

const STEPS = [
  { id: 1, title: 'Información Personal', icon: User, description: 'Datos básicos del empleado' },
  { id: 2, title: 'Información Laboral', icon: Briefcase, description: 'Cargo y condiciones de trabajo' },
  { id: 3, title: 'Información Bancaria', icon: CreditCard, description: 'Datos para pagos' },
  { id: 4, title: 'Afiliaciones', icon: Shield, description: 'EPS, AFP, ARL y Caja' }
];

export const EmployeeFormWizard = ({ employee, onSuccess, onCancel }: EmployeeFormWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { configuration } = useEmployeeGlobalConfiguration();
  const { createEmployee, updateEmployee, isLoading } = useEmployeeCRUD();
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = useForm<EmployeeFormData>({
    defaultValues: {
      cedula: employee?.cedula || '',
      tipoDocumento: employee?.tipoDocumento || 'CC',
      nombre: employee?.nombre || '',
      apellido: employee?.apellido || '',
      email: employee?.email || '',
      telefono: employee?.telefono || '',
      salarioBase: employee?.salarioBase || 1300000,
      tipoContrato: employee?.tipoContrato || 'indefinido',
      fechaIngreso: employee?.fechaIngreso || new Date().toISOString().split('T')[0],
      estado: employee?.estado || 'activo',
      eps: employee?.eps || '',
      afp: employee?.afp || '',
      arl: employee?.arl || '',
      cajaCompensacion: employee?.cajaCompensacion || '',
      cargo: employee?.cargo || '',
      estadoAfiliacion: employee?.estadoAfiliacion || 'pendiente',
      banco: '',
      tipoCuenta: 'ahorros',
      numeroCuenta: '',
      titularCuenta: ''
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    const loadCompanyId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      } catch (error) {
        console.error('Error loading company ID:', error);
      }
    };

    loadCompanyId();
  }, []);

  // Auto-fill titular cuenta based on nombre and apellido
  useEffect(() => {
    if (watchedValues.nombre && watchedValues.apellido) {
      setValue('titularCuenta', `${watchedValues.nombre} ${watchedValues.apellido}`);
    }
  }, [watchedValues.nombre, watchedValues.apellido, setValue]);

  const validateCurrentStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid && !completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    return isValid;
  };

  const getFieldsForStep = (step: number): (keyof EmployeeFormData)[] => {
    switch (step) {
      case 1: return ['tipoDocumento', 'cedula', 'nombre', 'apellido', 'email', 'telefono'];
      case 2: return ['salarioBase', 'tipoContrato', 'fechaIngreso', 'cargo'];
      case 3: return ['banco', 'tipoCuenta', 'numeroCuenta', 'titularCuenta'];
      case 4: return ['eps', 'afp', 'arl', 'cajaCompensacion'];
      default: return [];
    }
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    if (!companyId) {
      console.error('No company ID available');
      return;
    }

    const employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
      empresaId: companyId,
      cedula: data.cedula,
      tipoDocumento: data.tipoDocumento,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      salarioBase: Number(data.salarioBase),
      tipoContrato: data.tipoContrato,
      fechaIngreso: data.fechaIngreso,
      estado: data.estado,
      eps: data.eps,
      afp: data.afp,
      arl: data.arl,
      cajaCompensacion: data.cajaCompensacion,
      cargo: data.cargo,
      estadoAfiliacion: data.estadoAfiliacion
    };

    let result;
    if (employee) {
      result = await updateEmployee(employee.id, employeeData);
    } else {
      result = await createEmployee(employeeData);
    }

    if (result.success) {
      onSuccess();
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
            currentStep === step.id 
              ? 'bg-primary border-primary text-primary-foreground' 
              : completedSteps.includes(step.id)
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 text-gray-400'
          }`}>
            {completedSteps.includes(step.id) ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <step.icon className="w-5 h-5" />
            )}
          </div>
          {index < STEPS.length - 1 && (
            <div className={`h-0.5 w-16 mx-2 transition-all duration-200 ${
              completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Información Personal</h3>
        <p className="text-gray-600">Ingresa los datos básicos del empleado</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="tipoDocumento" className="text-sm font-medium">Tipo de Documento *</Label>
          <Select onValueChange={(value) => setValue('tipoDocumento', value as any)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTO.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipoDocumento && <p className="text-red-500 text-sm">{errors.tipoDocumento.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cedula" className="text-sm font-medium">Número de Documento *</Label>
          <Input
            id="cedula"
            {...register('cedula', { required: 'El número de documento es requerido' })}
            placeholder="1234567890"
            className="h-12"
          />
          {errors.cedula && <p className="text-red-500 text-sm">{errors.cedula.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nombre" className="text-sm font-medium">Nombre *</Label>
          <Input
            id="nombre"
            {...register('nombre', { required: 'El nombre es requerido' })}
            placeholder="Juan"
            className="h-12"
          />
          {errors.nombre && <p className="text-red-500 text-sm">{errors.nombre.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="apellido" className="text-sm font-medium">Apellido *</Label>
          <Input
            id="apellido"
            {...register('apellido', { required: 'El apellido es requerido' })}
            placeholder="Pérez"
            className="h-12"
          />
          {errors.apellido && <p className="text-red-500 text-sm">{errors.apellido.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
          <Input
            id="email"
            type="email"
            {...register('email', { required: 'El email es requerido' })}
            placeholder="juan.perez@empresa.com"
            className="h-12"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono" className="text-sm font-medium">Teléfono</Label>
          <Input
            id="telefono"
            {...register('telefono')}
            placeholder="3001234567"
            className="h-12"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Información Laboral</h3>
        <p className="text-gray-600">Define el cargo y condiciones de trabajo</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="cargo" className="text-sm font-medium">Cargo *</Label>
          <Input
            id="cargo"
            {...register('cargo', { required: 'El cargo es requerido' })}
            placeholder="Desarrollador Senior"
            className="h-12"
          />
          {errors.cargo && <p className="text-red-500 text-sm">{errors.cargo.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="salarioBase" className="text-sm font-medium">Salario Base *</Label>
          <Input
            id="salarioBase"
            type="number"
            {...register('salarioBase', { required: 'El salario es requerido', min: 1 })}
            placeholder="2500000"
            className="h-12"
          />
          {errors.salarioBase && <p className="text-red-500 text-sm">{errors.salarioBase.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipoContrato" className="text-sm font-medium">Tipo de Contrato *</Label>
          <Select onValueChange={(value) => setValue('tipoContrato', value as any)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fechaIngreso" className="text-sm font-medium">Fecha de Ingreso *</Label>
          <Input
            id="fechaIngreso"
            type="date"
            {...register('fechaIngreso', { required: 'La fecha de ingreso es requerida' })}
            className="h-12"
          />
          {errors.fechaIngreso && <p className="text-red-500 text-sm">{errors.fechaIngreso.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="estado" className="text-sm font-medium">Estado</Label>
          <Select onValueChange={(value) => setValue('estado', value as any)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_EMPLEADO.map((estado) => (
                <SelectItem key={estado.value} value={estado.value}>
                  {estado.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Información Bancaria</h3>
        <p className="text-gray-600">Datos necesarios para realizar los pagos</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="banco" className="text-sm font-medium">Banco *</Label>
          <Select onValueChange={(value) => setValue('banco', value)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Seleccionar banco" />
            </SelectTrigger>
            <SelectContent>
              {BANCOS_COLOMBIA.map((banco) => (
                <SelectItem key={banco} value={banco}>
                  {banco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.banco && <p className="text-red-500 text-sm">{errors.banco.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipoCuenta" className="text-sm font-medium">Tipo de Cuenta *</Label>
          <Select onValueChange={(value) => setValue('tipoCuenta', value as any)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ahorros">Ahorros</SelectItem>
              <SelectItem value="corriente">Corriente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numeroCuenta" className="text-sm font-medium">Número de Cuenta *</Label>
          <Input
            id="numeroCuenta"
            {...register('numeroCuenta', { required: 'El número de cuenta es requerido' })}
            placeholder="1234567890"
            className="h-12"
          />
          {errors.numeroCuenta && <p className="text-red-500 text-sm">{errors.numeroCuenta.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="titularCuenta" className="text-sm font-medium">Titular de la Cuenta *</Label>
          <Input
            id="titularCuenta"
            {...register('titularCuenta', { required: 'El titular de la cuenta es requerido' })}
            placeholder="Juan Pérez"
            className="h-12"
          />
          {errors.titularCuenta && <p className="text-red-500 text-sm">{errors.titularCuenta.message}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Afiliaciones</h3>
        <p className="text-gray-600">Información de seguridad social y prestaciones</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="eps" className="text-sm font-medium">EPS *</Label>
          <Input
            id="eps"
            {...register('eps', { required: 'La EPS es requerida' })}
            placeholder="Sura EPS"
            className="h-12"
          />
          {errors.eps && <p className="text-red-500 text-sm">{errors.eps.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="afp" className="text-sm font-medium">AFP *</Label>
          <Input
            id="afp"
            {...register('afp', { required: 'La AFP es requerida' })}
            placeholder="Porvenir"
            className="h-12"
          />
          {errors.afp && <p className="text-red-500 text-sm">{errors.afp.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="arl" className="text-sm font-medium">ARL *</Label>
          <Input
            id="arl"
            {...register('arl', { required: 'La ARL es requerida' })}
            placeholder="Sura ARL"
            className="h-12"
          />
          {errors.arl && <p className="text-red-500 text-sm">{errors.arl.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cajaCompensacion" className="text-sm font-medium">Caja de Compensación *</Label>
          <Input
            id="cajaCompensacion"
            {...register('cajaCompensacion', { required: 'La caja de compensación es requerida' })}
            placeholder="Compensar"
            className="h-12"
          />
          {errors.cajaCompensacion && <p className="text-red-500 text-sm">{errors.cajaCompensacion.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="estadoAfiliacion" className="text-sm font-medium">Estado Afiliación</Label>
          <Select onValueChange={(value) => setValue('estadoAfiliacion', value as any)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completa">Completa</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="inconsistente">Inconsistente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-gray-900">
          {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
        </CardTitle>
        <p className="text-gray-600">
          {employee ? 'Actualiza la información del empleado' : 'Completa los pasos para crear un nuevo empleado'}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-8">
        {renderStepIndicator()}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="min-h-[400px]">
            {renderCurrentStep()}
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Guardando...' : employee ? 'Actualizar Empleado' : 'Crear Empleado'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
