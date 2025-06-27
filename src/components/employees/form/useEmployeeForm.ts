
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Employee } from '@/types';
import { EmployeeFormData } from './types';
import { supabase } from '@/integrations/supabase/client';
import { ConfigurationService } from '@/services/ConfigurationService';

const SALARIO_MINIMO_2025 = 1300000;

const DEFAULT_ARL_RISK_LEVELS = [
  { value: 'I', label: 'Nivel I - Riesgo Mínimo', percentage: '0.522%' },
  { value: 'II', label: 'Nivel II - Riesgo Bajo', percentage: '1.044%' },
  { value: 'III', label: 'Nivel III - Riesgo Medio', percentage: '2.436%' },
  { value: 'IV', label: 'Nivel IV - Riesgo Alto', percentage: '4.350%' },
  { value: 'V', label: 'Nivel V - Riesgo Máximo', percentage: '6.960%' }
];

export const useEmployeeForm = (employee?: Employee) => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isDraft, setIsDraft] = useState(false);
  const [arlRiskLevels, setArlRiskLevels] = useState(DEFAULT_ARL_RISK_LEVELS);

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger, reset, control } = useForm<EmployeeFormData>({
    defaultValues: {
      // Información Personal
      cedula: '',
      tipoDocumento: 'CC',
      nombre: '',
      segundoNombre: '',
      apellido: '',
      email: '',
      telefono: '',
      sexo: 'M',
      fechaNacimiento: '',
      direccion: '',
      ciudad: '',
      departamento: '',
      
      // Información Laboral
      salarioBase: SALARIO_MINIMO_2025,
      tipoContrato: 'indefinido',
      fechaIngreso: new Date().toISOString().split('T')[0],
      periodicidadPago: 'mensual',
      cargo: '',
      codigoCIIU: '',
      nivelRiesgoARL: 'I',
      estado: 'activo',
      centroCostos: '',
      
      // Detalles del Contrato
      fechaFirmaContrato: '',
      fechaFinalizacionContrato: '',
      tipoJornada: 'completa',
      diasTrabajo: 30,
      horasTrabajo: 8,
      beneficiosExtralegales: false,
      clausulasEspeciales: '',
      
      // Información Bancaria
      banco: '',
      tipoCuenta: 'ahorros',
      numeroCuenta: '',
      titularCuenta: '',
      formaPago: 'dispersion',
      
      // Afiliaciones
      eps: '',
      afp: '',
      arl: '',
      cajaCompensacion: '',
      tipoCotizanteId: '',
      subtipoCotizanteId: '',
      regimenSalud: 'contributivo',
      estadoAfiliacion: 'pendiente'
    }
  });

  const watchedValues = watch();

  // Load ARL risk levels configuration
  useEffect(() => {
    try {
      const config = ConfigurationService.getConfiguration();
      
      if (config && config.arlRiskLevels) {
        const levels = [
          { value: 'I', label: 'Nivel I - Riesgo Mínimo', percentage: `${config.arlRiskLevels.I || 0.522}%` },
          { value: 'II', label: 'Nivel II - Riesgo Bajo', percentage: `${config.arlRiskLevels.II || 1.044}%` },
          { value: 'III', label: 'Nivel III - Riesgo Medio', percentage: `${config.arlRiskLevels.III || 2.436}%` },
          { value: 'IV', label: 'Nivel IV - Riesgo Alto', percentage: `${config.arlRiskLevels.IV || 4.350}%` },
          { value: 'V', label: 'Nivel V - Riesgo Máximo', percentage: `${config.arlRiskLevels.V || 6.960}%` }
        ];
        setArlRiskLevels(levels);
      } else {
        console.warn('Configuration or arlRiskLevels not available, using defaults');
        setArlRiskLevels(DEFAULT_ARL_RISK_LEVELS);
      }
    } catch (error) {
      console.error('Error loading ARL risk levels configuration:', error);
      setArlRiskLevels(DEFAULT_ARL_RISK_LEVELS);
    }
  }, []);

  // Load company ID
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

  // Update form when employee changes
  useEffect(() => {
    if (employee) {
      console.log('🔄 useEmployeeForm: Setting form values from employee:', employee);
      
      // Información Personal
      setValue('cedula', employee.cedula || '');
      setValue('tipoDocumento', employee.tipoDocumento || 'CC');
      setValue('nombre', employee.nombre || '');
      setValue('segundoNombre', employee.segundoNombre || '');
      setValue('apellido', employee.apellido || '');
      setValue('email', employee.email || '');
      setValue('telefono', employee.telefono || '');
      setValue('sexo', (employee as any).sexo || 'M');
      setValue('fechaNacimiento', (employee as any).fechaNacimiento || '');
      setValue('direccion', (employee as any).direccion || '');
      setValue('ciudad', (employee as any).ciudad || '');
      setValue('departamento', (employee as any).departamento || '');
      
      // Información Laboral
      setValue('salarioBase', employee.salarioBase || SALARIO_MINIMO_2025);
      setValue('tipoContrato', employee.tipoContrato || 'indefinido');
      setValue('fechaIngreso', employee.fechaIngreso || new Date().toISOString().split('T')[0]);
      setValue('periodicidadPago', (employee as any).periodicidadPago || 'mensual');
      setValue('cargo', employee.cargo || '');
      setValue('codigoCIIU', (employee as any).codigoCIIU || '');
      setValue('nivelRiesgoARL', employee.nivelRiesgoARL || 'I');
      setValue('estado', employee.estado || 'activo');
      setValue('centroCostos', (employee as any).centroCostos || '');
      
      // Detalles del Contrato
      setValue('fechaFirmaContrato', (employee as any).fechaFirmaContrato || '');
      setValue('fechaFinalizacionContrato', (employee as any).fechaFinalizacionContrato || '');
      setValue('tipoJornada', (employee as any).tipoJornada || 'completa');
      setValue('diasTrabajo', (employee as any).diasTrabajo || 30);
      setValue('horasTrabajo', (employee as any).horasTrabajo || 8);
      setValue('beneficiosExtralegales', (employee as any).beneficiosExtralegales || false);
      setValue('clausulasEspeciales', (employee as any).clausulasEspeciales || '');
      
      // Información Bancaria
      setValue('banco', employee.banco || '');
      setValue('tipoCuenta', employee.tipoCuenta || 'ahorros');
      setValue('numeroCuenta', employee.numeroCuenta || '');
      setValue('titularCuenta', employee.titularCuenta || '');
      setValue('formaPago', (employee as any).formaPago || 'dispersion');
      
      // Afiliaciones
      setValue('eps', employee.eps || '');
      setValue('afp', employee.afp || '');
      setValue('arl', employee.arl || '');
      setValue('cajaCompensacion', employee.cajaCompensacion || '');
      setValue('tipoCotizanteId', employee.tipoCotizanteId || '');
      setValue('subtipoCotizanteId', employee.subtipoCotizanteId || '');
      setValue('regimenSalud', (employee as any).regimenSalud || 'contributivo');
      setValue('estadoAfiliacion', employee.estadoAfiliacion || 'pendiente');
      
      console.log('✅ useEmployeeForm: All form values set from employee data');
    }
  }, [employee, setValue]);

  // Auto-fill titular cuenta
  useEffect(() => {
    if (watchedValues.nombre && watchedValues.apellido) {
      const fullName = watchedValues.segundoNombre 
        ? `${watchedValues.nombre} ${watchedValues.segundoNombre} ${watchedValues.apellido}`
        : `${watchedValues.nombre} ${watchedValues.apellido}`;
      setValue('titularCuenta', fullName);
    }
  }, [watchedValues.nombre, watchedValues.segundoNombre, watchedValues.apellido, setValue]);

  // Calculate completion percentage
  useEffect(() => {
    const requiredFields = [
      'cedula', 'nombre', 'apellido', 'email', 'salarioBase', 'tipoContrato', 
      'fechaIngreso', 'banco', 'numeroCuenta', 'titularCuenta', 'tipoCotizanteId'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = watchedValues[field as keyof EmployeeFormData];
      return value !== '' && value !== null && value !== undefined;
    });
    
    setCompletionPercentage(Math.round((completedFields.length / requiredFields.length) * 100));
  }, [watchedValues]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return {
    // Form methods
    register,
    handleSubmit,
    errors,
    setValue,
    watch,
    trigger,
    reset,
    control,
    watchedValues,
    
    // State
    companyId,
    activeSection,
    completionPercentage,
    isDraft,
    arlRiskLevels,
    
    // Setters
    setActiveSection,
    setIsDraft,
    
    // Methods
    scrollToSection
  };
};
