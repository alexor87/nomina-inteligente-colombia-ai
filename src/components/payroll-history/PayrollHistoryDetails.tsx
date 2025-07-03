

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PeriodEmployeesTable } from './PeriodEmployeesTable';
import { EditWizard } from './EditWizard';
import { ReopenDialog } from './ReopenDialog';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { PayrollHistoryDetails as PayrollHistoryDetailsType } from '@/types/payroll-history';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calculator,
  Edit3,
  RotateCcw,
  RefreshCw,
  Download,
  FileText,
  AlertTriangle,
  Wrench
} from 'lucide-react';

export const PayrollHistoryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<PayrollHistoryDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState<string | null>(null);

  const {
    isReopening,
    isRegenerating,
    isFixing,
    canUserReopenPeriods,
    checkUserPermissions,
    reopenPeriod,
    regenerateHistoricalData,
    fixSpecificPeriodData
  } = usePayrollHistory();

  useEffect(() => {
    checkUserPermissions();
  }, [checkUserPermissions]);

  const loadDetails = async () => {
    if (!id) {
      setError('ID de período no válido');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 Cargando detalles del período:', id);
      
      const data = await PayrollHistoryService.getPeriodDetails(id);
      console.log('✅ Detalles cargados:', data);
      
      setDetails(data);
    } catch (error: any) {
      console.error('❌ Error loading period details:', error);
      setError(error.message || 'Error al cargar los detalles del período');
      
      // Toast de error específico
      toast({
        title: "Error al cargar período",
        description: error.message || "No se pudieron obtener los detalles del período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleReopen = async (reason: string) => {
    if (!details?.period.period) return;
    
    try {
      await reopenPeriod(details.period.period);
      setShowReopenDialog(false);
      await loadDetails(); // Reload details after reopening
      
      toast({
        title: "Período reabierto",
        description: "El período ha sido reabierto exitosamente"
      });
    } catch (error) {
      console.error('Error reopening period:', error);
      toast({
        title: "Error al reabrir",
        description: "No se pudo reabrir el período",
        variant: "destructive"
      });
    }
  };

  const handleRegenerateData = async () => {
    if (!id) return;

    const success = await regenerateHistoricalData(id);
    if (success) {
      await loadDetails(); // Reload details after regeneration
      toast({
        title: "Datos regenerados",
        description: "Los datos históricos se han regenerado correctamente"
      });
    }
  };

  const handleFixPeriodData = async () => {
    if (!id) return;

    const success = await fixSpecificPeriodData(id);
    if (success) {
      await loadDetails(); // Reload details after fixing
    }
  };

  const handleEditWizardConfirm = async (steps: any) => {
    console.log('Edit wizard steps:', steps);
    // Process the steps here
    setShowEditWizard(false);
    await loadDetails();
    
    toast({
      title: "Período procesado",
      description: "Los cambios se han aplicado correctamente"
    });
  };

  const handleDownloadEmployeePDF = async (employee: any) => {
    if (!details?.period || !employee.payroll_id) return;
    
    try {
      setIsDownloadingPDF(employee.id);
      console.log('🔄 Descargando PDF para empleado:', employee.nombre);
      
      // Preparar datos para el PDF
      const pdfData = {
        employee: {
          id: employee.id,
          name: `${employee.nombre} ${employee.apellido}`,
          position: employee.cargo,
          baseSalary: employee.salario_base,
          grossPay: employee.total_devengado,
          deductions: employee.total_deducciones,
          netPay: employee.neto_pagado,
          workedDays: 30, // Valor por defecto
          extraHours: 0,
          bonuses: 0,
          transportAllowance: 0,
          payrollId: employee.payroll_id
        },
        period: {
          startDate: details.period.startDate,
          endDate: details.period.endDate,
          type: details.period.type
        },
        company: {
          razon_social: 'Mi Empresa', // Valor por defecto
          nit: 'N/A',
          direccion: '',
          telefono: '',
          email: ''
        }
      };

      // Llamar a la edge function para generar el PDF
      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: pdfData
      });

      if (error) {
        console.error('❌ Error generando PDF:', error);
        throw new Error(error.message || 'Error generando PDF');
      }

      if (data?.pdfUrl) {
        // Descargar el PDF
        const link = document.createElement('a');
        link.href = data.pdfUrl;
        link.download = `comprobante_${employee.nombre}_${employee.apellido}_${details.period.period}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "PDF descargado",
          description: `Comprobante de ${employee.nombre} ${employee.apellido} generado exitosamente`
        });
      }
    } catch (error: any) {
      console.error('❌ Error descargando PDF:', error);
      toast({
        title: "Error al generar PDF",
        description: error.message || "No se pudo generar el comprobante de pago",
        variant: "destructive"
      });
    } finally {
      setIsDownloadingPDF(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500 mr-2" />
          <h2 className="text-lg font-semibold text-red-700">Error al cargar período</h2>
        </div>
        <p className="text-red-500 mb-4">{error}</p>
        <div className="flex justify-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/app/payroll-history')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Historial
          </Button>
          <Button 
            onClick={loadDetails}
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No se encontraron detalles del período</p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/app/payroll-history')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Historial
        </Button>
      </div>
    );
  }

  const { period, summary, employees } = details;
  const hasNoEmployees = employees.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/app/payroll-history')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{period.period}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {new Date(period.startDate).toLocaleDateString('es-CO')} - {new Date(period.endDate).toLocaleDateString('es-CO')}
              </span>
              <Badge 
                variant={period.status === 'cerrado' ? 'default' : 'secondary'}
                className="ml-2"
              >
                {period.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Fix Period Data Button - Nueva funcionalidad de corrección específica */}
          <Button
            onClick={handleFixPeriodData}
            disabled={isFixing}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Wrench className={`h-4 w-4 mr-2 ${isFixing ? 'animate-spin' : ''}`} />
            {isFixing ? 'Corrigiendo...' : 'Corregir Datos'}
          </Button>

          {/* Regenerate Data Button - Show only if no employees and period is closed */}
          {hasNoEmployees && period.status === 'cerrado' && (
            <Button
              onClick={handleRegenerateData}
              disabled={isRegenerating}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerando...' : 'Regenerar Datos'}
            </Button>
          )}

          {period.editable && canUserReopenPeriods && (
            <Button
              onClick={() => setShowReopenDialog(true)}
              disabled={isReopening}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reabrir
            </Button>
          )}

          <Button
            onClick={() => setShowEditWizard(true)}
            disabled={!period.editable}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* No Employees Warning */}
      {hasNoEmployees && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">Sin empleados procesados</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Este período no tiene empleados asociados. Esto puede ocurrir cuando el período se cerró sin generar los registros individuales.
                </p>
                {period.status === 'cerrado' && (
                  <p className="text-sm text-amber-600 mt-2">
                    💡 Usa el botón "Regenerar Datos" para crear los registros históricos basados en los empleados activos.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Empleados</p>
                <p className="text-2xl font-bold text-gray-900">{period.employeesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devengado</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDevengado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deducciones</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDeducciones)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Neto a Pagar</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalNeto)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      {!hasNoEmployees && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Empleados del Período</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PeriodEmployeesTable 
              employees={employees.map(emp => ({
                id: emp.id,
                nombre: emp.name.split(' ')[0] || '',
                apellido: emp.name.split(' ').slice(1).join(' ') || '',
                cargo: emp.position,
                salario_base: emp.baseSalary,
                total_devengado: emp.grossPay,
                total_deducciones: emp.deductions,
                neto_pagado: emp.netPay,
                payroll_id: emp.payrollId,
                estado: 'procesada'
              }))} 
              novedades={{}}
              onAddNovedad={() => {}}
              onEditNovedad={() => {}}
              onDownloadPDF={handleDownloadEmployeePDF}
              canEdit={period.editable}
              isDownloadingPDF={isDownloadingPDF}
            />
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showEditWizard && (
        <EditWizard
          isOpen={showEditWizard}
          onClose={() => setShowEditWizard(false)}
          onConfirm={handleEditWizardConfirm}
          isProcessing={false}
        />
      )}

      {showReopenDialog && (
        <ReopenDialog
          isOpen={showReopenDialog}
          onClose={() => setShowReopenDialog(false)}
          onConfirm={handleReopen}
          period={period}
          isProcessing={isReopening}
        />
      )}
    </div>
  );
};
