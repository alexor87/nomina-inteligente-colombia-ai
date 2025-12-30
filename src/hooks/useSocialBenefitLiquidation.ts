import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SocialBenefitsLiquidationService, type PendingPeriod } from '@/services/SocialBenefitsLiquidationService';
import type { EmployeeLiquidationData } from '@/components/social-benefits/liquidation/EmployeeLiquidationTable';

interface PeriodInfo {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  legalDeadline: string;
}

interface LiquidationSummary {
  totalEmployees: number;
  totalAmount: number;
}

export function useSocialBenefitLiquidation(
  benefitType: 'prima' | 'cesantias' | 'intereses_cesantias',
  periodKey: string
) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<EmployeeLiquidationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [isLiquidated, setIsLiquidated] = useState(false);
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);
  
  // Estados para edición inline
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const companyId = profile?.company_id;

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtener períodos pendientes para encontrar el período actual
      const periodsResult = await SocialBenefitsLiquidationService.getPendingPeriods(companyId);
      
      if (!periodsResult.success || !periodsResult.periods) {
        setError(periodsResult.error || 'Error cargando datos');
        return;
      }

      // Buscar el período que coincida con el periodKey y benefitType
      const matchingPeriod = periodsResult.periods.find(p => 
        p.benefitType === benefitType && 
        (p.periodLabel.includes(periodKey) || periodKey.includes(p.periodLabel))
      );

      if (!matchingPeriod) {
        // Si no hay período pendiente, puede que ya esté liquidado
        setIsLiquidated(true);
        setEmployees([]);
        return;
      }

      // Guardar info del período
      setPeriodInfo({
        periodLabel: matchingPeriod.periodLabel,
        periodStart: matchingPeriod.periodStart,
        periodEnd: matchingPeriod.periodEnd,
        legalDeadline: matchingPeriod.legalDeadline,
      });

      // Obtener preview con detalles de empleados
      const previewResult = await SocialBenefitsLiquidationService.getPreview(
        companyId,
        benefitType,
        matchingPeriod.periodStart,
        matchingPeriod.periodEnd,
        matchingPeriod.periodLabel
      );

      if (!previewResult.success) {
        setError('error' in previewResult ? previewResult.error : 'Error obteniendo datos');
        return;
      }

      if (previewResult.mode === 'preview' && previewResult.employees) {
        // Mapear empleados del preview al formato de la tabla
        const mappedEmployees: EmployeeLiquidationData[] = previewResult.employees.map((emp: any, index: number) => ({
          id: emp.id || `emp-${index}`,
          employeeId: emp.id || `emp-${index}`,
          name: emp.name || 'Sin nombre',
          cedula: emp.cedula || '',
          baseSalary: emp.baseSalary || 0,
          daysWorked: emp.totalDaysWorked || 0, // Días reales trabajados desde el backend
          calculatedAmount: emp.accumulatedAmount || 0,
          previousBalance: 0,
          amountToPay: emp.accumulatedAmount || 0,
          retefuente: 0,
        }));

        console.log('📊 Empleados mapeados para liquidación:', mappedEmployees.map(e => ({
          nombre: e.name,
          dias: e.daysWorked,
          salarioBase: e.baseSalary,
          montoCalculado: e.calculatedAmount
        })));

        setEmployees(mappedEmployees);
      }
    } catch (err) {
      console.error('Error en useSocialBenefitLiquidation:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, benefitType, periodKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrar empleados por búsqueda
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    
    const term = searchTerm.toLowerCase();
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(term) ||
      emp.cedula.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  // Calcular resumen
  const summary: LiquidationSummary = useMemo(() => ({
    totalEmployees: employees.length,
    totalAmount: employees.reduce((sum, e) => sum + e.amountToPay, 0),
  }), [employees]);

  // Actualizar empleado (edición inline)
  const handleUpdateEmployee = useCallback((employeeId: string, updates: Partial<EmployeeLiquidationData>) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, ...updates }
        : emp
    ));
    toast({
      title: 'Valores actualizados',
      description: 'Los cambios se aplicarán al liquidar',
    });
  }, [toast]);

  // Eliminar/excluir empleado de la liquidación
  const handleDeleteEmployee = useCallback((employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    toast({
      title: 'Empleado excluido',
      description: employee ? `${employee.name} no será incluido en esta liquidación` : 'Empleado excluido de la liquidación',
    });
  }, [employees, toast]);

  // Manejar liquidación
  const handleLiquidate = useCallback(async () => {
    if (!companyId || !periodInfo) return;

    setIsLiquidating(true);

    try {
      const result = await SocialBenefitsLiquidationService.liquidate(
        companyId,
        benefitType,
        periodInfo.periodStart,
        periodInfo.periodEnd,
        periodInfo.periodLabel,
        false
      );

      if (!result.success) {
        toast({
          title: 'Error en liquidación',
          description: 'error' in result ? result.error : 'Error desconocido',
          variant: 'destructive',
        });
        return;
      }

      if (result.mode === 'saved') {
        toast({
          title: '✅ Liquidación completada',
          description: `Liquidaste la ${periodInfo.periodLabel} de ${result.employeesCount} personas`,
        });
        setIsLiquidated(true);
      }
    } catch (err) {
      console.error('Error liquidando:', err);
      toast({
        title: 'Error',
        description: 'No se pudo completar la liquidación',
        variant: 'destructive',
      });
    } finally {
      setIsLiquidating(false);
    }
  }, [companyId, benefitType, periodInfo, toast]);

  // Manejar descarga de resumen
  const handleDownloadSummary = useCallback(() => {
    toast({
      title: 'Descargando...',
      description: 'El resumen se descargará en breve',
    });
    // TODO: Implementar descarga de Excel
  }, [toast]);

  return {
    employees: filteredEmployees,
    isLoading,
    error,
    summary,
    periodInfo,
    searchTerm,
    setSearchTerm,
    handleLiquidate,
    isLiquidating,
    isLiquidated,
    handleDownloadSummary,
    refetch: fetchData,
    // Nuevas funciones para edición inline
    editingRowId,
    setEditingRowId,
    handleUpdateEmployee,
    handleDeleteEmployee,
  };
}
