import { useState, useEffect } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { isWithinDays } from 'date-fns';

interface ComplianceAlert {
  type: 'warning' | 'error';
  message: string;
}

export const useEmployeeCompliance = (employee: EmployeeWithStatus | null) => {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);

  useEffect(() => {
    if (!employee) {
      setAlerts([]);
      return;
    }

    const newAlerts: ComplianceAlert[] = [];

    // Check for missing affiliations
    if (!employee.eps) {
      newAlerts.push({
        type: 'warning',
        message: 'No EPS asignada'
      });
    }
    if (!employee.afp) {
      newAlerts.push({
        type: 'warning',
        message: 'No AFP asignada'
      });
    }
    if (!employee.arl) {
      newAlerts.push({
        type: 'warning',
        message: 'No ARL asignada'
      });
    }

    // Check contract expiration
    const contractExpirationDate = employee.fechaFinalizacionContrato || (employee as any).contratoVencimiento;
    if (contractExpirationDate && isWithinDays(contractExpirationDate, 30)) {
      alerts.push({
        type: 'warning',
        message: `Contrato vence el ${new Date(contractExpirationDate).toLocaleDateString('es-CO')}`
      });
    }

    setAlerts(newAlerts);
  }, [employee]);

  return alerts;
};
