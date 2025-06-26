
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PayrollHistoryDetails } from '@/components/payroll-history/PayrollHistoryDetails';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
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
      
      // Load all periods and find the specific one
      const data = await PayrollHistoryService.getPayrollPeriods();
      const foundRecord = data.find(record => record.id === periodId);
      
      if (!foundRecord) {
        setError('Período no encontrado');
        return;
      }

      // Convert the record to PayrollHistoryPeriod format
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
      console.error('Error loading period details:', error);
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
        <LoadingSpinner />
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
