import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Users, DollarSign, Download, Edit, RefreshCw, AlertTriangle, Settings } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { HistoryServiceAleluya } from '@/services/HistoryServiceAleluya';
import { PeriodRepairService } from '@/services/PeriodRepairService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * ✅ PÁGINA DE DETALLES DEL PERÍODO - MEJORADA CON SINCRONIZACIÓN
 * Muestra información detallada de un período específico con capacidad de reparación
 */
export const PayrollHistoryDetailsPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [periodData, setPeriodData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRepairing, setIsRepairing] = useState(false);
  const [needsRepair, setNeedsRepair] = useState(false);

  // Cargar datos del período
  useEffect(() => {
    const loadPeriodData = async () => {
      if (!periodId) return;
      
      try {
        setIsLoading(true);
        
        // Obtener datos del período
        const { data: period, error } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('id', periodId)
          .single();
        
        if (error) throw error;
        
        setPeriodData(period);
        
        // Verificar si necesita reparación (totales en 0 o deducciones en 0)
        const needsRepairCheck = (period.empleados_count > 0) && 
                               ((!period.total_deducciones || period.total_deducciones === 0) || 
                                (!period.total_neto || period.total_neto === 0));
        setNeedsRepair(needsRepairCheck);
        
      } catch (error) {
        console.error('Error cargando datos del período:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del período",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPeriodData();
  }, [periodId, toast]);

  const handleBack = () => {
    navigate('/app/payroll-history');
  };

  const handleEdit = () => {
    navigate(`/app/period-edit/${periodId}`);
  };

  const handleExport = () => {
    console.log('Exportar período:', periodId);
  };

  const handleRepairSync = async () => {
    if (!periodId) return;
    
    setIsRepairing(true);
    try {
      console.log('🔧 Reparando período específico...');
      
      await PeriodRepairService.repairSpecificPeriod(periodId);
      
      // Recargar datos del período
      const { data: updatedPeriod, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();
      
      if (error) throw error;
      
      setPeriodData(updatedPeriod);
      setNeedsRepair(false);
      
      toast({
        title: "✅ Período Reparado",
        description: "Las deducciones y totales han sido corregidos correctamente",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('Error reparando período:', error);
      toast({
        title: "❌ Error en Reparación",
        description: "No se pudo reparar el período",
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!periodData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Período no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al historial
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Detalles del Período
            </h1>
            <p className="text-gray-600">{periodData.periodo}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {needsRepair && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRepairSync}
              disabled={isRepairing}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              {isRepairing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              {isRepairing ? 'Reparando...' : 'Reparar Período'}
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          {periodData.estado === 'borrador' && (
            <Button size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de problemas con deducciones */}
      {needsRepair && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-900">Período Requiere Reparación</h3>
                <p className="text-sm text-orange-700">
                  Este período tiene deducciones en $0 o totales incorrectos. 
                  Haz clic en "Reparar Período" para corregir los cálculos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del período */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Información del Período
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Tipo</p>
              <p className="font-medium capitalize">{periodData.tipo_periodo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Estado</p>
              <p className="font-medium capitalize">{periodData.estado}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fechas</p>
              <p className="font-medium">
                {new Date(periodData.fecha_inicio).toLocaleDateString('es-ES')} - {' '}
                {new Date(periodData.fecha_fin).toLocaleDateString('es-ES')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {periodData.empleados_count || 0}
            </div>
            <p className="text-xs text-gray-500">Empleados procesados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Estado de Cálculos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${needsRepair ? 'text-orange-600' : 'text-green-600'}`}>
              {needsRepair ? 'Requiere Reparación' : 'Correcto'}
            </div>
            <p className="text-xs text-gray-500">
              {needsRepair ? 'Deducciones incorrectas' : 'Cálculos correctos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen financiero */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Devengado</p>
              <p className={`text-lg font-bold ${needsRepair ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(periodData.total_devengado || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Deducciones</p>
              <p className={`text-lg font-bold ${needsRepair ? 'text-orange-600' : 'text-red-600'}`}>
                {formatCurrency(periodData.total_deducciones || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Neto</p>
              <p className={`text-lg font-bold ${needsRepair ? 'text-orange-600' : 'text-blue-600'}`}>
                {formatCurrency(periodData.total_neto || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Aportes Empleador</p>
              <p className={`text-lg font-bold ${needsRepair ? 'text-orange-600' : 'text-purple-600'}`}>
                {formatCurrency((periodData.total_devengado || 0) * 0.205)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder para tabla de empleados */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados del Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Aquí se mostrará la lista de empleados y sus cálculos detallados</p>
            <p className="text-sm mt-2">Esta funcionalidad se implementará en una fase posterior</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollHistoryDetailsPage;
