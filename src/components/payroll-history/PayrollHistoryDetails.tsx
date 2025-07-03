
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
  AlertTriangle
} from 'lucide-react';

export const PayrollHistoryDetails: React.FC = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<PayrollHistoryDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  const {
    isReopening,
    isRegenerating,
    canUserReopenPeriods,
    checkUserPermissions,
    reopenPeriod,
    regenerateHistoricalData
  } = usePayrollHistory();

  useEffect(() => {
    checkUserPermissions();
  }, [checkUserPermissions]);

  const loadDetails = async () => {
    if (!periodId) {
      setError('ID de período no válido');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 Cargando detalles del período:', periodId);
      
      const data = await PayrollHistoryService.getPeriodDetails(periodId);
      console.log('✅ Detalles cargados:', data);
      
      setDetails(data);
    } catch (error: any) {
      console.error('❌ Error loading period details:', error);
      setError(error.message || 'Error al cargar los detalles del período');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [periodId]);

  const handleReopen = async (reason: string) => {
    if (!details?.period.period) return;
    
    try {
      await reopenPeriod(details.period.period);
      setShowReopenDialog(false);
      await loadDetails(); // Reload details after reopening
    } catch (error) {
      console.error('Error reopening period:', error);
    }
  };

  const handleRegenerateData = async () => {
    if (!periodId) return;

    const success = await regenerateHistoricalData(periodId);
    if (success) {
      await loadDetails(); // Reload details after regeneration
    }
  };

  const handleEditWizardConfirm = async (steps: any) => {
    console.log('Edit wizard steps:', steps);
    // Process the steps here
    setShowEditWizard(false);
    await loadDetails();
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
              canEdit={period.editable}
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
