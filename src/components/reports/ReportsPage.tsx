
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileBarChart, 
  TrendingUp, 
  Users, 
  FileText, 
  Download,
  Filter,
  Calendar,
  Building2,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { ReportFilters } from './ReportFilters';
import { ReportTable } from './ReportTable';
import { useReports } from '@/hooks/useReports';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  role: string;
  canAccessReports: string[];
}

export const ReportsPage = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    filters,
    setFilters,
    loading,
    activeReportType,
    setActiveReportType,
    getPayrollSummaryReport,
    getLaborCostReport,
    getSocialSecurityReport,
    getNoveltyHistoryReport,
    exportToExcel,
    exportToPDF
  } = useReports();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const userRole = roles?.[0]?.role || 'empleado';
      
      setUserProfile({
        role: userRole,
        canAccessReports: getAccessibleReports(userRole)
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessibleReports = (role: string): string[] => {
    const reportAccess = {
      administrador: ['gerencia', 'contabilidad', 'rrhh', 'ugpp'],
      contador: ['contabilidad', 'gerencia'],
      rrhh: ['rrhh', 'gerencia'],
      gerente: ['gerencia', 'contabilidad', 'rrhh'],
      ugpp: ['ugpp'],
      empleado: []
    };
    
    return reportAccess[role as keyof typeof reportAccess] || [];
  };

  const reportCategories = {
    gerencia: {
      title: 'Gerencia',
      icon: TrendingUp,
      color: 'bg-blue-500',
      reports: [
        {
          id: 'payroll-summary',
          title: 'Resumen de Nómina por Período',
          description: 'Vista consolidada de la nómina por períodos',
          icon: FileBarChart
        },
        {
          id: 'cost-centers',
          title: 'Costos por Centro de Costos',
          description: 'Análisis de costos distribuidos por áreas',
          icon: Building2
        },
        {
          id: 'labor-costs',
          title: 'Reporte de Costos Laborales',
          description: 'Costos totales incluyendo prestaciones y aportes',
          icon: TrendingUp
        },
        {
          id: 'absences',
          title: 'Reporte de Ausentismos',
          description: 'Seguimiento de ausencias y licencias',
          icon: AlertCircle
        }
      ]
    },
    contabilidad: {
      title: 'Contabilidad',
      icon: FileText,
      color: 'bg-green-500',
      reports: [
        {
          id: 'employee-detail',
          title: 'Detalle de Nómina por Empleado',
          description: 'Desglose detallado por empleado',
          icon: Users
        },
        {
          id: 'social-security',
          title: 'Seguridad Social y Parafiscales',
          description: 'Aportes a seguridad social detallados',
          icon: UserCheck
        },
        {
          id: 'accounting-provisions',
          title: 'Provisiones Contables',
          description: 'Cálculo de provisiones para cierre contable',
          icon: FileText
        },
        {
          id: 'novelty-report',
          title: 'Reporte de Novedades',
          description: 'Todas las novedades procesadas en el período',
          icon: FileBarChart
        }
      ]
    },
    rrhh: {
      title: 'Recursos Humanos',
      icon: Users,
      color: 'bg-purple-500',
      reports: [
        {
          id: 'employee-detail-hr',
          title: 'Detalle de Nómina por Empleado',
          description: 'Vista de RRHH del detalle de nómina',
          icon: Users
        },
        {
          id: 'contracts',
          title: 'Contratos y Vinculaciones',
          description: 'Estado de contratos y vinculaciones',
          icon: FileText
        },
        {
          id: 'hr-novelties',
          title: 'Novedades de Personal',
          description: 'Bonos, licencias, horas extra, incapacidades',
          icon: AlertCircle
        },
        {
          id: 'hr-absences',
          title: 'Reporte de Ausentismos',
          description: 'Control de ausencias del personal',
          icon: Calendar
        }
      ]
    },
    ugpp: {
      title: 'UGPP',
      icon: UserCheck,
      color: 'bg-orange-500',
      reports: [
        {
          id: 'ugpp-social-security',
          title: 'Seguridad Social y Parafiscales',
          description: 'Información para fiscalización UGPP',
          icon: UserCheck
        },
        {
          id: 'ugpp-novelties',
          title: 'Novedades Relevantes',
          description: 'Horas extra, licencias, incapacidades',
          icon: FileBarChart
        },
        {
          id: 'ugpp-contracts',
          title: 'Contratos y Vinculaciones',
          description: 'Información contractual para auditoría',
          icon: FileText
        }
      ]
    }
  };

  const handleRunReport = async (reportId: string, categoryId: string) => {
    setActiveReport(reportId);
    setActiveReportType(reportId);
    
    try {
      // Load report data based on type
      console.log(`Running report: ${reportId} from category: ${categoryId}`);
    } catch (error) {
      console.error('Error running report:', error);
    }
  };

  const handleExportExcel = async (reportId: string, data: any[]) => {
    try {
      await exportToExcel(reportId, data, `reporte-${reportId}`);
      console.log('✅ Excel export completed successfully');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
    }
  };

  const handleExportPDF = async (reportId: string, data: any[]) => {
    try {
      await exportToPDF(reportId, data, `reporte-${reportId}`);
      console.log('✅ PDF export completed successfully');
    } catch (error) {
      console.error('❌ Error exporting to PDF:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userProfile?.canAccessReports.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              No tienes permisos para acceder al módulo de reportes.
              Contacta a tu administrador para solicitar acceso.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
              <p className="text-sm text-gray-600 mt-1">
                Genera y exporta reportes según tu perfil de usuario
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              Perfil: {userProfile?.role || 'Usuario'} 
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeReport ? (
          // Show active report view
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setActiveReport(null)}
                className="flex items-center space-x-2"
              >
                ← Volver a reportes
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExportExcel(activeReport, [])}
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExportPDF(activeReport, [])}
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>

            <ReportFilters 
              filters={filters}
              onFiltersChange={setFilters}
              reportType={activeReportType}
            />
            
            <ReportTable 
              reportType={activeReportType}
              filters={filters}
              onExport={(format, data) => {
                if (format === 'excel') {
                  handleExportExcel(activeReport, data);
                } else {
                  handleExportPDF(activeReport, data);
                }
              }}
            />
          </div>
        ) : (
          // Show reports dashboard
          <Tabs defaultValue={userProfile.canAccessReports[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              {userProfile.canAccessReports.map((categoryId) => {
                const category = reportCategories[categoryId as keyof typeof reportCategories];
                const IconComponent = category.icon;
                
                return (
                  <TabsTrigger 
                    key={categoryId} 
                    value={categoryId}
                    className="flex items-center space-x-2"
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{category.title}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(reportCategories).map(([categoryId, category]) => {
              if (!userProfile.canAccessReports.includes(categoryId)) return null;
              
              return (
                <TabsContent key={categoryId} value={categoryId} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.reports.map((report) => {
                      const IconComponent = report.icon;
                      
                      return (
                        <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className={`p-2 rounded-lg ${category.color} text-white`}>
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRunReport(report.id, categoryId)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Ver reporte →
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <CardTitle className="text-lg mb-2">{report.title}</CardTitle>
                            <CardDescription className="text-sm text-gray-600 leading-relaxed">
                              {report.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
};
