
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, FileText, Shield, Receipt, History, Download, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { ReportsFilters } from './ReportsFilters';
import { PayrollSummaryReport } from './PayrollSummaryReport';
import { LaborCostReport } from './LaborCostReport';
import { SocialSecurityReport } from './SocialSecurityReport';
import { IncomeRetentionReport } from './IncomeRetentionReport';
import { NoveltyHistoryReport } from './NoveltyHistoryReport';
import { AccountingExportReport } from './AccountingExportReport';
import { ExportHistory } from './ExportHistory';
import { useReports } from '@/hooks/useReports';

const reportSections = [
  {
    id: 'payroll-summary',
    title: 'Resumen de Nómina',
    description: 'Devengado, deducciones, neto y aportes por período',
    icon: FileText,
    color: 'bg-blue-500',
    badge: 'frecuente'
  },
  {
    id: 'labor-costs',
    title: 'Costos Laborales',
    description: 'Carga prestacional y costos por empleado/centro',
    icon: DollarSign,
    color: 'bg-green-500',
    badge: 'recomendado'
  },
  {
    id: 'social-security',
    title: 'Aportes Seguridad Social',
    description: 'Salud, pensión, ARL y caja de compensación',
    icon: Shield,
    color: 'bg-purple-500'
  },
  {
    id: 'income-retention',
    title: 'Certificados CIR',
    description: 'Certificados de ingresos y retenciones anuales',
    icon: Receipt,
    color: 'bg-orange-500'
  },
  {
    id: 'novelty-history',
    title: 'Histórico de Novedades',
    description: 'Horas extra, incapacidades, licencias y bonificaciones',
    icon: History,
    color: 'bg-indigo-500'
  },
  {
    id: 'accounting-export',
    title: 'Exportaciones Contables',
    description: 'Reportes para software contable',
    icon: BarChart3,
    color: 'bg-red-500',
    badge: 'nuevo'
  }
];

export const ReportsPage = () => {
  const { activeReportType, setActiveReportType, exportHistory } = useReports();
  const [showExportHistory, setShowExportHistory] = useState(false);

  const getBadgeVariant = (badge?: string) => {
    switch (badge) {
      case 'nuevo': return 'default';
      case 'frecuente': return 'secondary';
      case 'recomendado': return 'destructive';
      default: return 'outline';
    }
  };

  if (showExportHistory) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historial de Exportaciones</h1>
            <p className="text-gray-600 mt-1">Revisa y descarga reportes anteriores</p>
          </div>
          <Button variant="outline" onClick={() => setShowExportHistory(false)}>
            Volver a Reportes
          </Button>
        </div>
        <ExportHistory />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1">Genera y exporta reportes detallados de nómina</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowExportHistory(true)}>
            <Download className="h-4 w-4 mr-2" />
            Historial ({exportHistory.length})
          </Button>
        </div>
      </div>

      <Tabs value={activeReportType} onValueChange={setActiveReportType} className="space-y-6">
        {/* Cards de secciones principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {reportSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeReportType === section.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setActiveReportType(section.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${section.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {section.badge && (
                      <Badge variant={getBadgeVariant(section.badge)} className="text-xs">
                        {section.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {section.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Filtros globales */}
        <ReportsFilters />

        {/* Contenido de cada reporte */}
        <TabsList className="hidden">
          {reportSections.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {section.title}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="payroll-summary">
          <PayrollSummaryReport />
        </TabsContent>

        <TabsContent value="labor-costs">
          <LaborCostReport />
        </TabsContent>

        <TabsContent value="social-security">
          <SocialSecurityReport />
        </TabsContent>

        <TabsContent value="income-retention">
          <IncomeRetentionReport />
        </TabsContent>

        <TabsContent value="novelty-history">
          <NoveltyHistoryReport />
        </TabsContent>

        <TabsContent value="accounting-export">
          <AccountingExportReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};
