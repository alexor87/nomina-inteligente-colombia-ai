
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'in_progress' | 'closed' | 'approved';
  type: 'quincenal' | 'mensual';
}

interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: 'valid' | 'error' | 'incomplete';
  errors: string[];
}

interface PayrollSummary {
  totalEmployees: number;
  validEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  employerContributions: number;
  totalPayrollCost: number;
}

// Mock data
const mockPeriod: PayrollPeriod = {
  id: '1',
  startDate: '2025-06-01',
  endDate: '2025-06-15',
  status: 'in_progress',
  type: 'quincenal'
};

const mockEmployees: PayrollEmployee[] = [
  {
    id: '1',
    name: 'María García',
    position: 'Desarrolladora Senior',
    workedDays: 15,
    extraHours: 8,
    disabilities: 0,
    bonuses: 200000,
    absences: 0,
    grossPay: 1350000,
    deductions: 108000,
    netPay: 1242000,
    status: 'valid',
    errors: []
  },
  {
    id: '2',
    name: 'Carlos López',
    position: 'Contador',
    workedDays: 13,
    extraHours: 0,
    disabilities: 2,
    bonuses: 0,
    absences: 2,
    grossPay: 780000,
    deductions: 62400,
    netPay: 717600,
    status: 'error',
    errors: ['Falta afiliación a EPS', 'Días trabajados inconsistentes']
  },
  {
    id: '3',
    name: 'Ana Rodríguez',
    position: 'Gerente Comercial',
    workedDays: 15,
    extraHours: 5,
    disabilities: 0,
    bonuses: 500000,
    absences: 0,
    grossPay: 2100000,
    deductions: 168000,
    netPay: 1932000,
    status: 'valid',
    errors: []
  }
];

export const usePayrollLiquidation = () => {
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod>(mockPeriod);
  const [employees, setEmployees] = useState<PayrollEmployee[]>(mockEmployees);
  const [isLoading, setIsLoading] = useState(false);

  // Calcular resumen
  const calculateSummary = useCallback((): PayrollSummary => {
    const totalEmployees = employees.length;
    const validEmployees = employees.filter(emp => emp.status === 'valid').length;
    const totalGrossPay = employees.reduce((sum, emp) => sum + emp.grossPay, 0);
    const totalDeductions = employees.reduce((sum, emp) => sum + emp.deductions, 0);
    const totalNetPay = employees.reduce((sum, emp) => sum + emp.netPay, 0);
    const employerContributions = totalGrossPay * 0.205; // Aproximado 20.5%
    const totalPayrollCost = totalNetPay + employerContributions;

    return {
      totalEmployees,
      validEmployees,
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      employerContributions,
      totalPayrollCost
    };
  }, [employees]);

  const [summary, setSummary] = useState<PayrollSummary>(calculateSummary());

  // Actualizar resumen cuando cambien los empleados
  useEffect(() => {
    setSummary(calculateSummary());
  }, [employees, calculateSummary]);

  // Simular cálculo de nómina
  const calculatePayroll = (employee: Partial<PayrollEmployee>) => {
    const baseSalary = 1000000; // Salario base simulado
    const dailySalary = baseSalary / 30;
    const workedDays = employee.workedDays || 0;
    const extraHours = employee.extraHours || 0;
    const bonuses = employee.bonuses || 0;
    const disabilities = employee.disabilities || 0;

    const regularPay = dailySalary * (workedDays - disabilities);
    const extraPay = (baseSalary / 240) * 1.25 * extraHours; // Horas extra con 25% recargo
    const grossPay = regularPay + extraPay + bonuses;
    const deductions = grossPay * 0.08; // 8% deducciones
    const netPay = grossPay - deductions;

    return { grossPay, deductions, netPay };
  };

  // Actualizar empleado
  const updateEmployee = useCallback(async (id: string, field: string, value: number) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const updated = { ...emp, [field]: value };
        const calculated = calculatePayroll(updated);
        
        // Validar empleado
        const errors: string[] = [];
        if (updated.workedDays > 15) errors.push('Días trabajados exceden el período');
        if (updated.extraHours > 60) errors.push('Horas extra excesivas');
        
        const status = errors.length > 0 ? 'error' : 'valid';

        return {
          ...updated,
          ...calculated,
          status,
          errors
        };
      }
      return emp;
    }));

    // Simular guardado automático
    await new Promise(resolve => setTimeout(resolve, 300));
  }, []);

  // Recalcular todos los empleados
  const recalculateAll = useCallback(async () => {
    setIsLoading(true);
    toast({
      title: "Recalculando nómina",
      description: "Actualizando todos los cálculos..."
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEmployees(prev => prev.map(emp => {
        const calculated = calculatePayroll(emp);
        return {
          ...emp,
          ...calculated,
          status: 'valid' as const,
          errors: []
        };
      }));

      toast({
        title: "Recálculo completado",
        description: "Todos los empleados han sido actualizados."
      });
    } catch (error) {
      toast({
        title: "Error en recálculo",
        description: "No se pudo completar el recálculo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Aprobar período
  const approvePeriod = useCallback(async () => {
    setIsLoading(true);
    toast({
      title: "Aprobando período",
      description: "Cerrando nómina y generando reportes..."
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCurrentPeriod(prev => ({ ...prev, status: 'approved' }));
      
      toast({
        title: "Período aprobado",
        description: "La nómina ha sido cerrada exitosamente. Ya puedes proceder con PILA y dispersión."
      });
    } catch (error) {
      toast({
        title: "Error al aprobar",
        description: "No se pudo aprobar el período.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Verificar si todo está válido
  const isValid = employees.every(emp => emp.status === 'valid') && employees.length > 0;

  return {
    currentPeriod,
    employees,
    summary,
    isValid,
    isLoading,
    updateEmployee,
    recalculateAll,
    approvePeriod
  };
};
