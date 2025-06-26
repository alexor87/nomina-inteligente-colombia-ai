
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
      const payrollPeriod = await PayrollPeriodService.getPayrollPeriodById(periodId!);
      
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
      console.log('📝 Buscando en historial de payrolls...');
      const data = await PayrollHistoryService.getPayrollPeriods();
      const foundRecord = data.find(record => record.id === periodId);
      
      if (!foundRecord) {
        // Intentar buscar por coincidencia parcial del ID (en caso de IDs generados)
        const possibleMatch = data.find(record => 
          record.id?.includes(periodId!) || periodId!.includes(record.id || '')
        );
        
        if (!possibleMatch) {
          console.log('❌ Período no encontrado en ninguna fuente');
          setError('Período no encontrado');
          return;
        }
        
        console.log('📋 Período encontrado por coincidencia:', possibleMatch.periodo);
        // Usar el registro encontrado por coincidencia
        const convertedPeriod = convertHistoryRecordToPeriod(possibleMatch);
        setPeriod(convertedPeriod);
        return;
      }

      console.log('📋 Período encontrado en historial:', foundRecord.periodo);
      const convertedPeriod = convertHistoryRecordToPeriod(foundRecord);
      setPeriod(convertedPeriod);
      
    } catch (error) {
      console.error('❌ Error loading period details:', error);
      setError('Error al cargar los detalles del período');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper method to convert history record to period
  const convertHistoryRecordToPeriod = (foundRecord: any): PayrollHistoryPeriod => {
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

    // Determinar el tipo de período dinámicamente basado en las fechas
    const determinePeriodType = (startDate: string, endDate: string): 'quincenal' | 'mensual' => {
      if (!startDate || !endDate) return 'mensual';
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Si la diferencia es menor o igual a 16 días, es quincenal
      // Si es mayor, es mensual
      return diffDays <= 16 ? 'quincenal' : 'mensual';
    };

    // Extraer fechas del período si está disponible
    let periodStartDate = foundRecord.fechaCreacion || new Date().toISOString().split('T')[0];
    let periodEndDate = foundRecord.fechaCreacion || new Date().toISOString().split('T')[0];
    let periodType: 'quincenal' | 'mensual' = 'mensual';

    if (foundRecord.periodo) {
      // Intentar extraer fechas del formato "1 al 15 de Mayo 2025" o similar
      const periodText = foundRecord.periodo;
      const monthMatch = periodText.match(/(\d+)\s+al\s+(\d+)\s+de\s+(\w+)\s+(\d+)/i);
      
      if (monthMatch) {
        const [, startDay, endDay, monthName, year] = monthMatch;
        
        // Mapear nombres de meses a números
        const monthMap: { [key: string]: number } = {
          'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
          'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };
        
        const monthNum = monthMap[monthName.toLowerCase()];
        if (monthNum !== undefined) {
          const startDate = new Date(parseInt(year), monthNum, parseInt(startDay));
          const endDate = new Date(parseInt(year), monthNum, parseInt(endDay));
          
          periodStartDate = startDate.toISOString().split('T')[0];
          periodEndDate = endDate.toISOString().split('T')[0];
          periodType = determinePeriodType(periodStartDate, periodEndDate);
        }
      } else {
        // Si no se puede parsear el período, intentar con otros formatos
        const yearMatch = periodText.match(/(\d{4})/);
        if (yearMatch) {
          // Determinar tipo basado en el contenido del texto
          if (periodText.toLowerCase().includes('quinc') || 
              periodText.includes('1 al 15') || 
              periodText.includes('16 al 30') ||
              periodText.includes('16 al 31')) {
            periodType = 'quincenal';
          } else {
            periodType = 'mensual';
          }
        }
      }
    }

    return {
      id: foundRecord.id || '',
      period: foundRecord.periodo || 'Sin período',
      startDate: periodStartDate,
      endDate: periodEndDate,
      type: periodType, // Ahora dinámico basado en las fechas reales
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
