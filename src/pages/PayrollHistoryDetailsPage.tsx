
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PayrollHistoryDetails } from '@/components/payroll-history/PayrollHistoryDetails';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const PayrollHistoryDetailsPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!periodId) {
      navigate('/payroll-history');
      return;
    }
    loadPeriodDetails();
  }, [periodId, navigate]);

  const loadPeriodDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Cargando detalles del período:', periodId);
      
      // Primero intentar buscar en payroll_periods (períodos del sistema inteligente)
      const payrollPeriod = await PayrollPeriodService.getPayrollPeriodById(periodId);
      
      if (payrollPeriod) {
        console.log('📋 Período encontrado en payroll_periods:', payrollPeriod);
        
        // Convertir PayrollPeriod a PayrollHistoryPeriod
        const convertedPeriod: PayrollHistoryPeriod = {
          id: payrollPeriod.id,
          period: PayrollPeriodService.formatPeriodText(payrollPeriod.fecha_inicio, payrollPeriod.fecha_fin),
          startDate: payrollPeriod.fecha_inicio,
          endDate: payrollPeriod.fecha_fin,
          type: payrollPeriod.tipo_periodo as 'quincenal' | 'mensual',
          employeesCount: 0, // Se calculará con los datos reales
          status: payrollPeriod.estado === 'cerrada' ? 'cerrado' : 
                 payrollPeriod.estado === 'procesada' ? 'cerrado' : 'revision',
          totalGrossPay: 0,
          totalNetPay: 0,
          totalDeductions: 0,
          totalCost: 0,
          employerContributions: 0,
          paymentStatus: payrollPeriod.estado === 'pagada' ? 'pagado' : 'pendiente',
          version: 1,
          createdAt: payrollPeriod.created_at,
          updatedAt: payrollPeriod.updated_at || payrollPeriod.created_at,
        };
        
        setPeriod(convertedPeriod);
        return;
      }
      
      // Si no se encuentra en payroll_periods, buscar en el historial de payrolls
      const data = await PayrollHistoryService.getPayrollPeriods();
      const foundRecord = data.find(record => record.id === periodId);
      
      if (!foundRecord) {
        setError('Período no encontrado');
        return;
      }

      console.log('📋 Período encontrado en historial:', foundRecord);

      // Convertir el record a PayrollHistoryPeriod format
      let mappedStatus: 'cerrado' | 'con_errores' | 'revision' = 'revision';
      
      switch (foundRecord.estado) {
        case 'cerrada':
        case 'procesada':
        case 'pagada':
          mappedStatus = 'cerrado';
          break;
        case 'borrador':
          mappedStatus = 'revision';
          break;
        default:
          mappedStatus = 'con_errores';
          break;
      }

      const convertedPeriod: PayrollHistoryPeriod = {
        id: foundRecord.id,
        period: foundRecord.periodo || 'Sin período',
        startDate: foundRecord.fechaCreacion || new Date().toISOString().split('T')[0],
        endDate: foundRecord.fechaCreacion || new Date().toISOString().split('T')[0],
        type: 'mensual' as const,
        employeesCount: foundRecord.empleados || 0,
        status: mappedStatus,
        totalGrossPay: Number(foundRecord.totalNomina || 0),
        totalNetPay: Number(foundRecord.totalNomina || 0),
        totalDeductions: 0,
        totalCost: Number(foundRecord.totalNomina || 0),
        employerContributions: 0,
        paymentStatus: foundRecord.estado === 'pagada' ? 'pagado' as const : 'pendiente' as const,
        version: 1,
        createdAt: foundRecord.fechaCreacion || new Date().toISOString(),
        updatedAt: foundRecord.fechaCreacion || new Date().toISOString(),
      };

      setPeriod(convertedPeriod);
    } catch (error) {
      console.error('❌ Error loading period details:', error);
      setError('Error al cargar los detalles del período');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/payroll-history');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              📋 Cargando detalles del período
            </h3>
            <p className="text-gray-600">
              Obteniendo información del período seleccionado...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !period) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Período no encontrado'}</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver al historial
          </button>
        </div>
      </div>
    );
  }

  return <PayrollHistoryDetails period={period} onBack={handleBack} />;
};

export default PayrollHistoryDetailsPage;
