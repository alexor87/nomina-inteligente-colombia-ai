import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Employee } from '@/types';
import { CONTRACT_TYPES, TIPOS_DOCUMENTO } from '@/types/employee-config';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { useSecurityEntities } from '@/hooks/useSecurityEntities';
import { useTiposCotizante } from '@/hooks/useTiposCotizante';
import { ConfigurationService } from '@/services/ConfigurationService';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Briefcase, 
  FileText, 
  CreditCard, 
  Shield, 
  Settings,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronRight,
  Save,
  Copy,
  CheckCircle2,
  Info
} from 'lucide-react';

interface EmployeeFormModernProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

interface EmployeeFormData {
  // Información Personal
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre: string;
  apellido: string;
  email: string;
  telefono: string;
  sexo: 'M' | 'F' | 'O';
  fechaNacimiento: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  
  // Información Laboral
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago: 'quincenal' | 'mensual';
  cargo: string;
  codigoCIIU: string;
  nivelRiesgoARL: 'I' | 'II' | 'III' | 'IV' | 'V';
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  centroCostos: string;
  
  // Detalles del Contrato
  fechaFirmaContrato: string;
  fechaFinalizacionContrato: string;
  tipoJornada: 'completa' | 'parcial' | 'horas';
  diasTrabajo: number;
  horasTrabajo: number;
  beneficiosExtralegales: boolean;
  clausulasEspeciales: string;
  
  // Información Bancaria
  banco: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta: string;
  titularCuenta: string;
  formaPago: 'dispersion' | 'manual';
  
  // Afiliaciones
  eps: string;
  afp: string;
  arl: string;
  cajaCompensacion: string;
  tipoCotizanteId: string;
  subtipoCotizanteId: string;
  regimenSalud: 'contributivo' | 'subsidiado';
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
}

const SECTIONS = [
  { id: 'personal', title: 'Información Personal', icon: User, color: 'bg-blue-50 text-blue-700' },
  { id: 'laboral', title: 'Información Laboral', icon: Briefcase, color: 'bg-green-50 text-green-700' },
  { id: 'contrato', title: 'Detalles del Contrato', icon: FileText, color: 'bg-purple-50 text-purple-700' },
  { id: 'bancaria', title: 'Información Bancaria', icon: CreditCard, color: 'bg-orange-50 text-orange-700' },
  { id: 'afiliaciones', title: 'Afiliaciones', icon: Shield, color: 'bg-red-50 text-red-700' },
  { id: 'personalizados', title: 'Campos Personalizados', icon: Settings, color: 'bg-gray-50 text-gray-700' }
];

const BANCOS_COLOMBIA = [
  'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia',
  'Banco Popular', 'Banco de Occidente', 'Banco AV Villas', 'Bancoomeva',
  'Banco Falabella', 'Banco Pichincha', 'Banco Caja Social', 'Nequi', 'Daviplata'
];

const DEPARTAMENTOS_COLOMBIA = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas',
  'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
  'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
  'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia',
  'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
];

// Salario mínimo 2025 Colombia
const SALARIO_MINIMO_2025 = 1300000;

// Default ARL risk levels in case configuration is not available
const DEFAULT_ARL_RISK_LEVELS = [
  { value: 'I', label: 'Nivel I - Riesgo Mínimo', percentage: '0.522%' },
  { value: 'II', label: 'Nivel II - Riesgo Bajo', percentage: '1.044%' },
  { value: 'III', label: 'Nivel III - Riesgo Medio', percentage: '2.436%' },
  { value: 'IV', label: 'Nivel IV - Riesgo Alto', percentage: '4.350%' },
  { value: 'V', label: 'Nivel V - Riesgo Máximo', percentage: '6.960%' }
];

export const EmployeeFormModern = ({ employee, onSuccess, onCancel }: EmployeeFormModernProps) => {
  const { configuration } = useEmployeeGlobalConfiguration();
  const { createEmployee, updateEmployee, isLoading } = useEmployeeCRUD();
  const { epsEntities, afpEntities, arlEntities, compensationFunds, isLoading: entitiesLoading } = useSecurityEntities();
  const { 
    tiposCotizante, 
    subtiposCotizante, 
    isLoadingTipos, 
    isLoadingSubtipos, 
    error: tiposError,
    fetchSubtipos,
    clearSubtipos 
  } = useTiposCotizante();
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isDraft, setIsDraft] = useState(false);
  const [arlRiskLevels, setArlRiskLevels] = useState<{ value: string; label: string; percentage: string }[]>(DEFAULT_ARL_RISK_LEVELS);
  
  // Obtener configuración actual para ARL con fallback
  useEffect(() => {
    try {
      const config = ConfigurationService.getConfiguration();
      
      // Verificar que config y arlRiskLevels existen antes de usarlos
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

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = useForm<EmployeeFormData>({
    defaultValues: {
      // Información Personal
      cedula: employee?.cedula || '',
      tipoDocumento: employee?.tipoDocumento || 'CC',
      nombre: employee?.nombre || '',
      segundoNombre: '',
      apellido: employee?.apellido || '',
      email: employee?.email || '',
      telefono: employee?.telefono || '',
      sexo: 'M',
      fechaNacimiento: '',
      direccion: '',
      ciudad: '',
      departamento: '',
      
      // Información Laboral
      salarioBase: employee?.salarioBase || SALARIO_MINIMO_2025,
      tipoContrato: employee?.tipoContrato || 'indefinido',
      fechaIngreso: employee?.fechaIngreso || new Date().toISOString().split('T')[0],
      periodicidadPago: 'mensual',
      cargo: employee?.cargo || '',
      codigoCIIU: '',
      nivelRiesgoARL: employee?.nivelRiesgoARL || 'I',
      estado: employee?.estado || 'activo',
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
      eps: employee?.eps || '',
      afp: employee?.afp || '',
      arl: employee?.arl || '',
      cajaCompensacion: employee?.cajaCompensacion || '',
      tipoCotizanteId: employee?.tipoCotizanteId || '',
      subtipoCotizanteId: employee?.subtipoCotizanteId || '',
      regimenSalud: 'contributivo',
      estadoAfiliacion: employee?.estadoAfiliacion || 'pendiente'
    }
  });

  const watchedValues = watch();

  // Obtener company_id del usuario actual
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

  // Auto-fill titular cuenta based on nombres y apellidos
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

  // Manejar cambio de tipo de cotizante
  const handleTipoCotizanteChange = async (tipoCotizanteId: string) => {
    setValue('tipoCotizanteId', tipoCotizanteId);
    setValue('subtipoCotizanteId', ''); // Limpiar subtipo al cambiar tipo
    
    if (tipoCotizanteId) {
      await fetchSubtipos(tipoCotizanteId);
    } else {
      clearSubtipos();
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    console.log('🚀 EmployeeFormModern onSubmit called with data:', data);
    console.log('📝 Employee being edited:', employee);
    
    if (!companyId) {
      console.error('No company ID available');
      return;
    }

    // Crear el objeto de empleado con segundo nombre y tipos de cotizante
    const employeeData = {
      empresaId: companyId,
      cedula: data.cedula,
      tipoDocumento: data.tipoDocumento,
      nombre: data.nombre,
      segundoNombre: data.segundoNombre,
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
      estadoAfiliacion: data.estadoAfiliacion,
      // Información bancaria
      banco: data.banco,
      tipoCuenta: data.tipoCuenta,
      numeroCuenta: data.numeroCuenta,
      titularCuenta: data.titularCuenta,
      // Tipos de cotizante
      tipoCotizanteId: data.tipoCotizanteId,
      subtipoCotizanteId: data.subtipoCotizanteId
    };

    console.log('📋 Employee data to be sent:', employeeData);

    let result;
    if (employee) {
      console.log('🔄 Updating employee with ID:', employee.id);
      result = await updateEmployee(employee.id, employeeData);
    } else {
      console.log('➕ Creating new employee');
      result = await createEmployee(employeeData);
    }

    console.log('✅ Operation result:', result);

    if (result.success) {
      onSuccess();
    }
  };

  const handleDuplicate = () => {
    // Lógica para duplicar empleado
    console.log('Duplicating employee...');
  };

  const renderNavigationSidebar = () => (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 sticky top-0 h-screen overflow-y-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Progreso</h3>
          <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
            {completionPercentage}%
          </Badge>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <nav className="space-y-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const isCollapsed = collapsedSections.includes(section.id);
          
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{section.title}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderInlineField = (
    name: keyof EmployeeFormData,
    label: string,
    type: 'text' | 'number' | 'email' | 'date' | 'select' = 'text',
    options?: { value: string; label: string }[],
    required = false,
    icon?: React.ReactNode,
    helpText?: string
  ) => (
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
      
      {type === 'select' && options ? (
        <Select 
          onValueChange={(value) => setValue(name, value as any)}
          defaultValue={watchedValues[name] as string}
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
      ) : (
        <Input
          {...register(name, { required: required ? `${label} es requerido` : false })}
          type={type}
          className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder={`Ingresa ${label.toLowerCase()}`}
        />
      )}
      
      {errors[name] && (
        <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>
      )}
    </div>
  );

  const renderSection = (sectionId: string, title: string, icon: React.ReactNode, children: React.ReactNode) => {
    const isCollapsed = collapsedSections.includes(sectionId);
    
    return (
      <Card id={`section-${sectionId}`} className="mb-6 border-gray-200">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection(sectionId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            </div>
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </CardHeader>
        
        {!isCollapsed && (
          <CardContent className="space-y-6">
            {children}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen bg-white">
      {renderNavigationSidebar()}
      
      <div className="flex-1">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h1>
              <p className="text-gray-600 mt-1">
                {employee ? 'Actualiza la información del empleado' : 'Completa la información para crear un nuevo empleado'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {employee && (
                <Button variant="outline" onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </Button>
              )}
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
            
            {/* Información Personal */}
            {renderSection('personal', 'Información Personal', <User className="w-5 h-5 text-blue-600" />, (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInlineField('tipoDocumento', 'Tipo de Documento', 'select', 
                  TIPOS_DOCUMENTO.map(tipo => ({ value: tipo.value, label: tipo.label })), 
                  true, <FileText className="w-4 h-4 text-gray-500" />)}
                
                {renderInlineField('cedula', 'Número de Documento', 'text', undefined, true)}
                {renderInlineField('nombre', 'Primer Nombre', 'text', undefined, true)}
                {renderInlineField('segundoNombre', 'Segundo Nombre', 'text', undefined, false)}
                {renderInlineField('apellido', 'Apellidos', 'text', undefined, true)}
                
                {renderInlineField('sexo', 'Sexo', 'select', [
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Femenino' },
                  { value: 'O', label: 'Otro' }
                ], true)}
                
                {renderInlineField('fechaNacimiento', 'Fecha de Nacimiento', 'date', undefined, true)}
                {renderInlineField('direccion', 'Dirección', 'text', undefined, true, <MapPin className="w-4 h-4 text-gray-500" />)}
                {renderInlineField('ciudad', 'Ciudad', 'text', undefined, true)}
                
                {renderInlineField('departamento', 'Departamento', 'select', 
                  DEPARTAMENTOS_COLOMBIA.map(dept => ({ value: dept, label: dept })), 
                  true)}
                
                {renderInlineField('email', 'Email', 'email', undefined, true, <Mail className="w-4 h-4 text-gray-500" />)}
                {renderInlineField('telefono', 'Teléfono', 'text', undefined, false, <Phone className="w-4 h-4 text-gray-500" />)}
              </div>
            ))}

            {/* Información Laboral */}
            {renderSection('laboral', 'Información Laboral', <Briefcase className="w-5 h-5 text-green-600" />, (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <Label className="text-sm font-medium text-gray-700">
                      Salario Base <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Input
                    {...register('salarioBase', { required: 'Salario base es requerido' })}
                    type="number"
                    className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder={`Mínimo: ${SALARIO_MINIMO_2025.toLocaleString()}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Salario mínimo 2025: ${SALARIO_MINIMO_2025.toLocaleString()}</p>
                  {errors.salarioBase && (
                    <p className="text-red-500 text-xs mt-1">{errors.salarioBase?.message}</p>
                  )}
                </div>
                
                {renderInlineField('tipoContrato', 'Tipo de Contrato', 'select', 
                  CONTRACT_TYPES.map(type => ({ value: type.value, label: type.label })), 
                  true)}
                
                {renderInlineField('fechaIngreso', 'Fecha de Ingreso', 'date', undefined, true, <Calendar className="w-4 h-4 text-gray-500" />)}
                
                {renderInlineField('periodicidadPago', 'Periodicidad de Pago', 'select', [
                  { value: 'quincenal', label: 'Quincenal' },
                  { value: 'mensual', label: 'Mensual' }
                ])}
                
                {renderInlineField('cargo', 'Cargo', 'text', undefined, false, <Building className="w-4 h-4 text-gray-500" />)}
                {renderInlineField('codigoCIIU', 'Código CIIU', 'text', undefined, true)}
                
                <div className="group">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-sm font-medium text-gray-700">
                      Nivel de Riesgo ARL <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Select onValueChange={(value) => setValue('nivelRiesgoARL', value as any)} defaultValue={watchedValues.nivelRiesgoARL}>
                    <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar nivel de riesgo" />
                    </SelectTrigger>
                    <SelectContent>
                      {arlRiskLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center justify-between w-full">
                            <span>{level.label}</span>
                            <Badge variant="outline" className="ml-2">
                              {level.percentage}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {renderInlineField('estado', 'Estado', 'select', 
                  ESTADOS_EMPLEADO.map(estado => ({ value: estado.value, label: estado.label })))}
                
                {renderInlineField('centroCostos', 'Centro de Costos', 'text')}
              </div>
            ))}

            {/* Detalles del Contrato */}
            {renderSection('contrato', 'Detalles del Contrato', <FileText className="w-5 h-5 text-purple-600" />, (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInlineField('fechaFirmaContrato', 'Fecha de Firma', 'date')}
                  {renderInlineField('fechaFinalizacionContrato', 'Fecha de Finalización', 'date')}
                  
                  {renderInlineField('tipoJornada', 'Tipo de Jornada', 'select', [
                    { value: 'completa', label: 'Jornada Completa' },
                    { value: 'parcial', label: 'Jornada Parcial' },
                    { value: 'horas', label: 'Por Horas' }
                  ])}
                  
                  {renderInlineField('diasTrabajo', 'Días de Trabajo', 'number')}
                  {renderInlineField('horasTrabajo', 'Horas de Trabajo', 'number', undefined, false, <Clock className="w-4 h-4 text-gray-500" />)}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="beneficiosExtralegales"
                      checked={watchedValues.beneficiosExtralegales}
                      onCheckedChange={(checked) => setValue('beneficiosExtralegales', checked)}
                    />
                    <Label htmlFor="beneficiosExtralegales">¿Tiene beneficios extralegales?</Label>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Cláusulas Especiales</Label>
                    <textarea
                      {...register('clausulasEspeciales')}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      rows={3}
                      placeholder="Describe cualquier cláusula especial del contrato..."
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Información Bancaria */}
            {renderSection('bancaria', 'Información Bancaria', <CreditCard className="w-5 h-5 text-orange-600" />, (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInlineField('banco', 'Banco', 'select', 
                  BANCOS_COLOMBIA.map(banco => ({ value: banco, label: banco })), 
                  true)}
                
                {renderInlineField('tipoCuenta', 'Tipo de Cuenta', 'select', [
                  { value: 'ahorros', label: 'Ahorros' },
                  { value: 'corriente', label: 'Corriente' }
                ], true)}
                
                {renderInlineField('numeroCuenta', 'Número de Cuenta', 'text', undefined, true)}
                
                <div className="group">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-sm font-medium text-gray-700">
                      Titular de la Cuenta <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Input
                    {...register('titularCuenta', { required: 'Titular de la cuenta es requerido' })}
                    className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Se auto-completa con nombres y apellidos"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Se completa automáticamente</p>
                  {errors.titularCuenta && (
                    <p className="text-red-500 text-xs mt-1">{errors.titularCuenta?.message}</p>
                  )}
                </div>
                
                {renderInlineField('formaPago', 'Forma de Pago', 'select', [
                  { value: 'dispersion', label: 'Dispersión Bancaria' },
                  { value: 'manual', label: 'Pago Manual' }
                ], true)}
              </div>
            ))}

            {/* Afiliaciones */}
            {renderSection('afiliaciones', 'Afiliaciones', <Shield className="w-5 h-5 text-red-600" />, (
              <div className="space-y-6">
                {tiposError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{tiposError}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-sm font-medium text-gray-700">EPS</Label>
                    </div>
                    <Select onValueChange={(value) => setValue('eps', value)} defaultValue={watchedValues.eps}>
                      <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Seleccionar EPS" />
                      </SelectTrigger>
                      <SelectContent>
                        {epsEntities.map((eps) => (
                          <SelectItem key={eps.id} value={eps.name}>
                            {eps.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-sm font-medium text-gray-700">AFP</Label>
                    </div>
                    <Select onValueChange={(value) => setValue('afp', value)} defaultValue={watchedValues.afp}>
                      <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Seleccionar AFP" />
                      </SelectTrigger>
                      <SelectContent>
                        {afpEntities.map((afp) => (
                          <SelectItem key={afp.id} value={afp.name}>
                            {afp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-sm font-medium text-gray-700">ARL</Label>
                    </div>
                    <Select onValueChange={(value) => setValue('arl', value)} defaultValue={watchedValues.arl}>
                      <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Seleccionar ARL" />
                      </SelectTrigger>
                      <SelectContent>
                        {arlEntities.map((arl) => (
                          <SelectItem key={arl.id} value={arl.name}>
                            {arl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-sm font-medium text-gray-700">Caja de Compensación</Label>
                    </div>
                    <Select onValueChange={(value) => setValue('cajaCompensacion', value)} defaultValue={watchedValues.cajaCompensacion}>
                      <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Seleccionar Caja de Compensación" />
                      </SelectTrigger>
                      <SelectContent>
                        {compensationFunds.map((fund) => (
                          <SelectItem key={fund.id} value={fund.name}>
                            {fund.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo de Cotizante */}
                  <div className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-sm font-medium text-gray-700">
                        Tipo de Cotizante <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative group/tooltip">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tooltip:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          Clasificación del empleado según normativa PILA
                        </div>
                      </div>
                    </div>
                    <Select 
                      onValueChange={handleTipoCotizanteChange} 
                      defaultValue={watchedValues.tipoCotizanteId}
                      disabled={isLoadingTipos}
                    >
                      <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder={isLoadingTipos ? "Cargando..." : "Seleccionar tipo de cotizante"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposCotizante.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {tipo.codigo}
                              </Badge>
                              <span>{tipo.nombre}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.tipoCotizanteId && (
                      <p className="text-red-500 text-xs mt-1">Tipo de cotizante es requerido</p>
                    )}
                  </div>

                  {/* Subtipo de Cotizante */}
                  <div className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-sm font-medium text-gray-700">
                        Subtipo de Cotizante <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative group/tooltip">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tooltip:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          Subcategoría específica del tipo de cotizante
                        </div>
                      </div>
                    </div>
                    <Select 
                      onValueChange={(value) => setValue('subtipoCotizanteId', value)} 
                      defaultValue={watchedValues.subtipoCotizanteId}
                      disabled={!watchedValues.tipoCotizanteId || isLoadingSubtipos || subtiposCotizante.length === 0}
                    >
                      <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder={
                          !watchedValues.tipoCotizanteId 
                            ? "Primero selecciona un tipo de cotizante"
                            : isLoadingSubtipos 
                              ? "Cargando subtipos..."
                              : subtiposCotizante.length === 0
                                ? "Este tipo de cotizante no requiere subtipo"
                                : "Seleccionar subtipo de cotizante"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {subtiposCotizante.map((subtipo) => (
                          <SelectItem key={subtipo.id} value={subtipo.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {subtipo.codigo}
                              </Badge>
                              <span>{subtipo.nombre}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {subtiposCotizante.length === 0 && watchedValues.tipoCotizanteId && !isLoadingSubtipos && (
                      <p className="text-xs text-gray-500 mt-1">Este tipo de cotizante no requiere subtipo</p>
                    )}
                    {errors.subtipoCotizanteId && (
                      <p className="text-red-500 text-xs mt-1">Subtipo de cotizante es requerido</p>
                    )}
                  </div>
                  
                  {renderInlineField('regimenSalud', 'Régimen de Salud', 'select', [
                    { value: 'contributivo', label: 'Contributivo' },
                    { value: 'subsidiado', label: 'Subsidiado' }
                  ])}
                  
                  {renderInlineField('estadoAfiliacion', 'Estado de Afiliación', 'select', [
                    { value: 'completa', label: 'Completa' },
                    { value: 'pendiente', label: 'Pendiente' },
                    { value: 'inconsistente', label: 'Inconsistente' }
                  ])}
                </div>
              </div>
            ))}

            {/* Campos Personalizados */}
            {configuration.customFields.length > 0 && renderSection('personalizados', 'Campos Personalizados', <Settings className="w-5 h-5 text-gray-600" />, (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {configuration.customFields.map((field) => (
                  <div key={field.id} className="group">
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">
                      {field.name} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.type === 'text' && (
                      <Input
                        placeholder={`Ingresa ${field.name.toLowerCase()}`}
                        className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                    {field.type === 'number' && (
                      <Input
                        type="number"
                        placeholder={`Ingresa ${field.name.toLowerCase()}`}
                        className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                    {field.type === 'date' && (
                      <Input
                        type="date"
                        className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                    {field.type === 'list' && field.options && (
                      <Select>
                        <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                          <SelectValue placeholder={`Seleccionar ${field.name.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option, index) => (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </form>
        </div>

        {/* Fixed Bottom Bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">
                  Progreso: {completionPercentage}% completado
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="isDraft"
                  checked={isDraft}
                  onCheckedChange={setIsDraft}
                />
                <Label htmlFor="isDraft" className="text-sm">Guardar como borrador</Label>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isDraft ? 'Guardar Borrador' : 'Guardar'}
              </Button>
              
              {!isDraft && (
                <Button 
                  type="submit"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isLoading || completionPercentage < 80}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isLoading ? 'Guardando...' : employee ? 'Actualizar y Activar' : 'Crear y Activar'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
