
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, Loader2 } from 'lucide-react';
import { CompanyService, CompanyRegistrationWithUser } from '@/services/CompanyService';
import { useToast } from '@/hooks/use-toast';

export const CompanyRegistrationPage = () => {
  const [formData, setFormData] = useState<CompanyRegistrationWithUser>({
    nit: '',
    razon_social: '',
    email: '',
    telefono: '',
    ciudad: 'Bogotá',
    plan: 'basico',
    user_email: '',
    user_password: '',
    first_name: '',
    last_name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const plans = [
    {
      id: 'basico',
      name: 'Plan Básico',
      price: '$99.000/mes',
      employees: '5 empleados',
      payrolls: '1 nómina/mes',
      features: ['Soporte por email', 'Reportes básicos', 'Comprobantes PDF']
    },
    {
      id: 'profesional',
      name: 'Plan Profesional',
      price: '$299.000/mes',
      employees: '25 empleados',
      payrolls: '12 nóminas/mes',
      features: ['Soporte telefónico', 'Reportes avanzados', 'Integraciones bancarias', 'Nómina electrónica']
    },
    {
      id: 'empresarial',
      name: 'Plan Empresarial',
      price: '$599.000/mes',
      employees: '100 empleados',
      payrolls: 'Nóminas ilimitadas',
      features: ['Soporte prioritario', 'Reportes personalizados', 'API completa', 'Consultoría incluida']
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    // Validar campos requeridos
    if (!formData.nit.trim()) {
      toast({
        title: "Campo requerido",
        description: "El NIT es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.razon_social.trim()) {
      toast({
        title: "Campo requerido",
        description: "La razón social es obligatoria",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Campo requerido",
        description: "El email corporativo es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.user_email.trim()) {
      toast({
        title: "Campo requerido",
        description: "El email del usuario es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.user_password.trim() || formData.user_password.length < 6) {
      toast({
        title: "Campo requerido",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (!formData.first_name.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.last_name.trim()) {
      toast({
        title: "Campo requerido",
        description: "El apellido es obligatorio",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Creating company with user data:', formData);
      const companyId = await CompanyService.createCompanyWithUser(formData);
      console.log('Company created successfully with id:', companyId);
      
      toast({
        title: "¡Empresa registrada exitosamente!",
        description: "Tu empresa ha sido creada con un trial de 30 días gratuitos. Revisa tu email para confirmar tu cuenta.",
      });

      // Redirigir a login después de un breve delay
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast({
        title: "Error al registrar empresa",
        description: error.message || "Ha ocurrido un error inesperado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanyRegistrationWithUser, value: string) => {
    console.log(`Updating ${field} to:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Registra tu Empresa</h1>
          </div>
          <p className="text-gray-600">Únete a miles de empresas que confían en nuestra plataforma de nómina</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>
                Completa los datos para crear tu cuenta empresarial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Datos del Usuario Administrador */}
                <div className="border-b pb-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Datos del Administrador</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">Nombre *</Label>
                      <Input
                        id="first_name"
                        placeholder="Juan"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Apellido *</Label>
                      <Input
                        id="last_name"
                        placeholder="Pérez"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="user_email">Email del usuario *</Label>
                    <Input
                      id="user_email"
                      type="email"
                      placeholder="juan.perez@miempresa.com"
                      value={formData.user_email}
                      onChange={(e) => handleInputChange('user_email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="user_password">Contraseña *</Label>
                    <Input
                      id="user_password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.user_password}
                      onChange={(e) => handleInputChange('user_password', e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Datos de la Empresa */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Datos de la Empresa</h4>
                  <div>
                    <Label htmlFor="nit">NIT de la empresa *</Label>
                    <Input
                      id="nit"
                      placeholder="900123456-1"
                      value={formData.nit}
                      onChange={(e) => handleInputChange('nit', e.target.value)}
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="razon_social">Razón Social *</Label>
                    <Input
                      id="razon_social"
                      placeholder="Mi Empresa S.A.S"
                      value={formData.razon_social}
                      onChange={(e) => handleInputChange('razon_social', e.target.value)}
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="email">Email corporativo *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="contacto@miempresa.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      placeholder="(+57) 1 234 5678"
                      value={formData.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                    />
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <Select value={formData.ciudad} onValueChange={(value) => handleInputChange('ciudad', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bogotá">Bogotá</SelectItem>
                        <SelectItem value="Medellín">Medellín</SelectItem>
                        <SelectItem value="Cali">Cali</SelectItem>
                        <SelectItem value="Barranquilla">Barranquilla</SelectItem>
                        <SelectItem value="Cartagena">Cartagena</SelectItem>
                        <SelectItem value="Otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-4">
                    <Label>Plan seleccionado</Label>
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900">
                            {plans.find(p => p.id === formData.plan)?.name}
                          </p>
                          <p className="text-sm text-blue-700">
                            {plans.find(p => p.id === formData.plan)?.price}
                          </p>
                        </div>
                        <Badge variant="secondary">30 días gratis</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando empresa...
                    </>
                  ) : (
                    'Crear empresa y comenzar trial'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Planes */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Elige tu plan</h3>
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`cursor-pointer transition-colors ${
                  formData.plan === plan.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => handleInputChange('plan', plan.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{plan.name}</h4>
                    {formData.plan === plan.id && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mb-1">{plan.price}</p>
                  <p className="text-sm text-gray-600 mb-3">{plan.employees} • {plan.payrolls}</p>
                  <ul className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/auth')}
            className="text-gray-600"
          >
            ¿Ya tienes cuenta? Inicia sesión
          </Button>
        </div>
      </div>
    </div>
  );
};
