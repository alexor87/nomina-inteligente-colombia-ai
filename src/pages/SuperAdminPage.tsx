
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Users, TrendingUp, AlertCircle, Play, Pause } from 'lucide-react';
import { CompanyService, Company } from '@/services/CompanyService';
import { useToast } from '@/hooks/use-toast';

interface CompanyWithStats extends Company {
  subscription?: {
    plan_type: string;
    status: string;
    trial_ends_at?: string;
    max_employees: number;
  };
  employee_count?: number;
  payroll_count?: number;
}

export const SuperAdminPage = () => {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesData = await CompanyService.getAllCompanies();
      setCompanies(companiesData);
    } catch (error) {
      toast({
        title: "Error al cargar empresas",
        description: "No se pudieron cargar los datos de las empresas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleSuspendCompany = async (companyId: string) => {
    try {
      await CompanyService.suspendCompany(companyId);
      toast({
        title: "Empresa suspendida",
        description: "La empresa ha sido suspendida exitosamente",
      });
      loadCompanies();
    } catch (error: any) {
      toast({
        title: "Error al suspender",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleActivateCompany = async (companyId: string) => {
    try {
      await CompanyService.activateCompany(companyId);
      toast({
        title: "Empresa activada",
        description: "La empresa ha sido activada exitosamente",
      });
      loadCompanies();
    } catch (error: any) {
      toast({
        title: "Error al activar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activa':
        return <Badge variant="default" className="bg-green-100 text-green-800">Activa</Badge>;
      case 'suspendida':
        return <Badge variant="destructive">Suspendida</Badge>;
      case 'inactiva':
        return <Badge variant="secondary">Inactiva</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'basico':
        return <Badge variant="outline">Básico</Badge>;
      case 'profesional':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Profesional</Badge>;
      case 'empresarial':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Empresarial</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.estado === 'activa').length;
  const totalEmployees = companies.reduce((sum, c) => sum + (c.employee_count || 0), 0);
  const totalPayrolls = companies.reduce((sum, c) => sum + (c.payroll_count || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 animate-pulse mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Cargando datos del SaaS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Super Admin</h1>
          <p className="text-gray-600">Administra todas las empresas del SaaS</p>
        </div>
        <Badge variant="default" className="bg-red-100 text-red-800">
          Super Admin
        </Badge>
      </div>

      {/* Métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              {activeCompanies} activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              En todas las empresas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nóminas Procesadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayrolls}</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter(c => c.estado === 'suspendida').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Empresas suspendidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de empresas */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Registradas</CardTitle>
          <CardDescription>
            Administra todas las empresas del SaaS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>NIT</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Empleados</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{company.razon_social}</div>
                      <div className="text-sm text-gray-500">{company.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{company.nit}</TableCell>
                  <TableCell>{getPlanBadge(company.plan)}</TableCell>
                  <TableCell>{getStatusBadge(company.estado)}</TableCell>
                  <TableCell>{company.employee_count || 0}</TableCell>
                  <TableCell>
                    {new Date(company.created_at).toLocaleDateString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {company.estado === 'activa' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendCompany(company.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Suspender
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateCompany(company.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Activar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
