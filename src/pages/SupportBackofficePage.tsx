import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSupportCompanies, isUserSupport } from '@/utils/roleUtils';
import { 
  Building2, Users, AlertTriangle, Activity, 
  Calendar, Mail, Phone, MapPin, Eye 
} from 'lucide-react';

interface SupportCompany {
  id: string;
  razon_social: string;
  nit?: string;
  email?: string;
  estado?: string;
  employee_count?: number;
  last_activity?: string;
  alerts_count?: number;
}

export const SupportBackofficePage = () => {
  const [companies, setCompanies] = useState<SupportCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSupport, setHasSupport] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkSupportAccess();
  }, []);

  const checkSupportAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Acceso denegado",
          description: "Debes estar autenticado para acceder al backoffice",
          variant: "destructive"
        });
        return;
      }

      const isSupportUser = await isUserSupport(user.id);
      
      if (!isSupportUser) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos de soporte para acceder a esta página",
          variant: "destructive"
        });
        return;
      }

      setHasSupport(true);
      await loadSupportCompanies(user.id);
    } catch (error) {
      console.error('Error checking support access:', error);
      toast({
        title: "Error",
        description: "Error verificando permisos de acceso",
        variant: "destructive"
      });
    }
  };

  const loadSupportCompanies = async (userId: string) => {
    try {
      setIsLoading(true);
      const supportCompanies = await getSupportCompanies(userId);
      
      // Enriquecer datos con métricas adicionales
      const enrichedCompanies = await Promise.all(
        supportCompanies.map(async (company) => {
          try {
            // Contar empleados
            const { count: employeeCount } = await supabase
              .from('employees')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.id);

            // Contar alertas activas
            const { count: alertsCount } = await supabase
              .from('dashboard_alerts')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.id)
              .eq('dismissed', false);

            // Última actividad
            const { data: lastActivity } = await supabase
              .from('dashboard_activity')
              .select('created_at')
              .eq('company_id', company.id)
              .order('created_at', { ascending: false })
              .limit(1);

            return {
              ...company,
              employee_count: employeeCount || 0,
              alerts_count: alertsCount || 0,
              last_activity: lastActivity?.[0]?.created_at
            } as SupportCompany;
          } catch (error) {
            console.error(`Error enriching company ${company.id}:`, error);
            return company as SupportCompany;
          }
        })
      );

      setCompanies(enrichedCompanies);
    } catch (error) {
      console.error('Error loading support companies:', error);
      toast({
        title: "Error",
        description: "Error cargando empresas de soporte",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchToCompanyContext = (companyId: string) => {
    setSelectedCompany(companyId);
    toast({
      title: "Contexto cambiado",
      description: "Ahora estás viendo los datos de la empresa seleccionada",
    });
    // Aquí podrías redirigir al dashboard con el contexto de la empresa
    window.location.href = `/dashboard?support_company=${companyId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando backoffice de soporte...</p>
        </div>
      </div>
    );
  }

  if (!hasSupport) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              No tienes permisos de soporte para acceder a esta página.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Backoffice de Soporte</h1>
          <p className="text-gray-600">
            Gestiona y monitorea todas las empresas donde tienes acceso de soporte
          </p>
        </div>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Empresas</p>
                  <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Empleados Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {companies.reduce((sum, company) => sum + (company.employee_count || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Alertas Activas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {companies.reduce((sum, company) => sum + (company.alerts_count || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Empresas Activas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {companies.filter(c => c.estado === 'activa').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de empresas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Empresas de Soporte</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companies.length > 0 ? (
              <div className="space-y-4">
                {companies.map((company) => (
                  <div 
                    key={company.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {company.razon_social}
                          </h3>
                          <Badge variant={company.estado === 'activa' ? 'default' : 'secondary'}>
                            {company.estado || 'activa'}
                          </Badge>
                          {(company.alerts_count || 0) > 0 && (
                            <Badge variant="destructive">
                              {company.alerts_count} alertas
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          {company.nit && (
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <span>NIT: {company.nit}</span>
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4" />
                              <span>{company.email}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>{company.employee_count || 0} empleados</span>
                          </div>
                        </div>

                        {company.last_activity && (
                          <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>Última actividad: {formatDate(company.last_activity)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => switchToCompanyContext(company.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Empresa
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay empresas asignadas</h3>
                <p className="text-gray-600">
                  No tienes empresas asignadas para soporte en este momento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
