import { useState, useEffect } from 'react';
import { PayrollEmployee } from '@/types/payroll';

interface UsePayrollIntelligentLoadResult {
  employees: PayrollEmployee[];
  loading: boolean;
  error: string | null;
}

export const usePayrollIntelligentLoad = (): UsePayrollIntelligentLoadResult => {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        // Simulación de carga de datos desde una API o base de datos
        // Aquí deberías reemplazar este timeout con tu lógica real de carga de datos
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Datos de ejemplo (reemplaza esto con tus datos reales)
        const mockEmployees: PayrollEmployee[] = [
          {
            id: "emp1",
            name: "Juan Pérez",
            position: "Desarrollador",
            baseSalary: 2500000,
            workedDays: 15,
            extraHours: 8,
            disabilities: 0,
            bonuses: 50000,
            absences: 0,
            grossPay: 1350000,
            deductions: 245000,
            netPay: 1105000,
            transportAllowance: 100000,
            employerContributions: 276750,
            eps: "Sura EPS",
            afp: "Protección AFP",
            status: 'valid' as const,
            errors: [],
            healthDeduction: 54000,
            pensionDeduction: 54000,
            ibc: 1350000,
            effectiveWorkedDays: 15,
            incapacityDays: 0,
            incapacityValue: 0,
            legalBasis: 'Cálculo quincenal estándar'
          }
        ];

        setEmployees(mockEmployees);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los empleados.');
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  return {
    employees,
    loading,
    error
  };
};
