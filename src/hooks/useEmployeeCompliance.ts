
import { EmployeeWithStatus, ComplianceIndicator } from '@/types/employee-extended';

export const useEmployeeCompliance = () => {
  const getComplianceIndicators = (employee: EmployeeWithStatus): ComplianceIndicator[] => {
    const indicators: ComplianceIndicator[] = [];

    if (!employee.eps) {
      indicators.push({
        type: 'eps',
        status: 'pendiente',
        message: 'Falta afiliación a EPS'
      });
    }

    if (!employee.afp) {
      indicators.push({
        type: 'pension',
        status: 'pendiente',
        message: 'Falta afiliación a fondo de pensiones'
      });
    }

    if (!employee.nivelRiesgoARL) {
      indicators.push({
        type: 'arl',
        status: 'pendiente',
        message: 'Falta asignar nivel de riesgo ARL'
      });
    }

    if (employee.contratoVencimiento) {
      const vencimiento = new Date(employee.contratoVencimiento);
      const hoy = new Date();
      const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
      
      if (diasRestantes <= 0) {
        indicators.push({
          type: 'contrato',
          status: 'vencido',
          message: 'Contrato vencido'
        });
      } else if (diasRestantes <= 30) {
        indicators.push({
          type: 'contrato',
          status: 'pendiente',
          message: `Contrato vence en ${diasRestantes} días`
        });
      }
    }

    return indicators;
  };

  return {
    getComplianceIndicators
  };
};
