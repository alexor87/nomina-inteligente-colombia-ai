
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollCalculationService, PayrollCalculationInput } from '@/services/PayrollCalculationService';

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
  baseSalary: number;
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
  eps?: string;
  afp?: string;
  transportAllowance: number;
  employerContributions: number;
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

// Base employee data type for calculations
interface BaseEmployeeData {
  id: string;
  name: string;
  position: string;
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  eps?: string;
  afp?: string;
}

// Mock data inicial
const mockPeriod: PayrollPeriod = {
  id: '1',
  startDate: '2025-06-01',
  endDate: '2025-06-15',
  status: 'in_progress',
  type: 'quincenal'
};

const mockEmployeesBase: BaseEmployeeData[] = [
  {
    id: '1',
    name: 'María García',
    position: 'Desarrolladora Senior',
    baseSalary: 2600000,
    workedDays: 15,
    extraHours: 8,
    disabilities: 0,
    bonuses: 200000,
    absences: 0,
    eps: 'Compensar',
    afp: 'Protección'
  },
  {
    id: '2',
    name: 'Carlos López',
    position: 'Contador',
    baseSalary: 1800000,
    workedDays: 13,
    extraHours: 0,
    disabilities: 2,
    bonuses: 0,
    absences: 2,
    eps: 'Sura',
    afp: 'Porvenir'
  },
  {
    id: '3',
    name: 'Ana Rodríguez',
    position: 'Gerente Comercial',
    baseSalary: 4200000,
    workedDays: 15,
    extraHours: 5,
    disabilities: 0,
    bonuses: 500000,
    absences: 0,
    eps: 'Compensar',
    afp: 'Colfondos'
  }
];

export const usePayrollLiquidation = () => {
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod>(mockPeriod);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Función para calcular un empleado usando el servicio
  const calculateEmployee = useCallback((baseEmployee: BaseEmployeeData): PayrollEmployee => {
    const input: PayrollCalculationInput = {
      baseSalary: baseEmployee.baseSalary,
      workedDays: baseEmployee.workedDays,
      extraHours: baseEmployee.extraHours,
      disabilities: baseEmployee.disabilities,
      bonuses: baseEmployee.bonuses,
      absences: baseEmployee.absences,
      periodType: currentPeriod.type
    };

    const calculation = PayrollCalculationService.calculatePayroll(input);
    const validation = PayrollCalculationService.validateEmployee(input, baseEmployee.eps, baseEmployee.afp);

    return {
      ...baseEmployee,
      grossPay: calculation.grossPay,
      deductions: calculation.totalDeductions,
      netPay: calculation.netPay,
      transportAllowance: calculation.transportAllowance,
      employerContributions: calculation.employerContributions,
      status: validation.isValid ? 'valid' : 'error',
      errors: [...validation.errors, ...validation.warnings]
    };
  }, [currentPeriod.type]);

  // Calcular resumen
  const calculateSummary = useCallback((): PayrollSummary => {
    const totalEmployees = employees.length;
    const validEmployees = employees.filter(emp => emp.status === 'valid').length;
    const totalGrossPay = employees.reduce((sum, emp) => sum + emp.grossPay, 0);
    const totalDeductions = employees.reduce((sum, emp) => sum + emp.deductions, 0);
    const totalNetPay = employees.reduce((sum, emp) => sum + emp.netPay, 0);
    const employerContributions = employees.reduce((sum, emp) => sum + emp.employerContributions, 0);
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

  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    validEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerContributions: 0,
    totalPayrollCost: 0
  });

  // Inicializar empleados
  useEffect(() => {
    const calculatedEmployees = mockEmployeesBase.map(emp => calculateEmployee(emp));
    setEmployees(calculatedEmployees);
  }, [calculateEmployee]);

  // Actualizar resumen
  useEffect(() => {
    setSummary(calculateSummary());
  }, [employees, calculateSummary]);

  // Actualizar empleado
  const updateEmployee = useCallback(async (id: string, field: string, value: number) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const updated: BaseEmployeeData = {
          id: emp.id,
          name: emp.name,
          position: emp.position,
          baseSalary: emp.baseSalary,
          workedDays: emp.workedDays,
          extraHours: emp.extraHours,
          disabilities: emp.disabilities,
          bonuses: emp.bonuses,
          absences: emp.absences,
          eps: emp.eps,
          afp: emp.afp,
          [field]: value
        };
        return calculateEmployee(updated);
      }
      return emp;
    }));

    // Simulación de guardado automático
    await new Promise(resolve => setTimeout(resolve, 300));
  }, [calculateEmployee]);

  // Recalcular todos
  const recalculateAll = useCallback(async () => {
    setIsLoading(true);
    toast({
      title: "Recalculando nómina",
      description: "Aplicando configuración actual a todos los empleados..."
    });

    try {
      // Actualizar configuración del servicio
      PayrollCalculationService.updateConfiguration('2025');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEmployees(prev => prev.map(emp => {
        const baseData: BaseEmployeeData = {
          id: emp.id,
          name: emp.name,
          position: emp.position,
          baseSalary: emp.baseSalary,
          workedDays: emp.workedDays,
          extraHours: emp.extraHours,
          disabilities: emp.disabilities,
          bonuses: emp.bonuses,
          absences: emp.absences,
          eps: emp.eps,
          afp: emp.afp
        };
        return calculateEmployee(baseData);
      }));

      toast({
        title: "Recálculo completado",
        description: "Todos los cálculos han sido actualizados exitosamente."
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
  }, [toast, calculateEmployee]);

  // Aprobar período
  const approvePeriod = useCallback(async () => {
    const invalidEmployees = employees.filter(emp => emp.status !== 'valid');
    if (invalidEmployees.length > 0) {
      toast({
        title: "No se puede aprobar",
        description: `Corrige los errores en ${invalidEmployees.length} empleado(s) antes de aprobar.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    toast({
      title: "Aprobando período",
      description: "Cerrando nómina y preparando reportes..."
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCurrentPeriod(prev => ({ ...prev, status: 'approved' }));
      
      toast({
        title: "¡Período aprobado!",
        description: "La nómina está lista para PILA y dispersión bancaria."
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
  }, [toast, employees]);

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
