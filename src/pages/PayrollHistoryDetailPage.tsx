import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { PayrollNovedad as PayrollNovedadEnhanced } from '@/types/novedades-enhanced';
import { PayrollNovedad } from '@/types/novedades';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { PeriodHeader } from '@/components/payroll-history/PeriodHeader';
import { PeriodSummaryCards } from '@/components/payroll-history/PeriodSummaryCards';
import { ExpandedEmployeesTable } from '@/components/payroll-history/ExpandedEmployeesTable';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface PeriodData {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
  empleados_count: number;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  estado: string;
}

interface ExpandedEmployee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  ibc: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  payroll_id: string;
}

export default function PayrollHistoryDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<ExpandedEmployee[]>([]);
  const [periodData, setPeriodData] = useState<PeriodData | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);

  // Load novedades for the period
  const {
    novedades,
    isLoading: isLoadingNovedades,
    refetch: refetchNovedades
  } = usePayrollNovedadesUnified({ periodId: periodId || '', enabled: !!periodId });

  // Load period data
  useEffect(() => {
    const loadPeriodData = async () => {
      if (!periodId) return;
      
      setIsLoadingPeriod(true);
      try {
        const { data, error } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('id', periodId)
          .single();

        if (error) {
          throw error;
        }

        setPeriodData(data);
      } catch (error) {
        console.error('Error loading period data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del período",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPeriod(false);
      }
    };

    loadPeriodData();
  }, [periodId]);

  // Load employees for the period
  useEffect(() => {
    const loadEmployees = async () => {
      if (!periodId) return;
      
      setIsLoadingEmployees(true);
      try {
        const employeesData = await EmployeeUnifiedService.getEmployeesForPeriod(periodId);
        
        // Transform to expanded format with payroll data
        const expandedEmployees: ExpandedEmployee[] = employeesData.map((emp: any) => ({
          id: emp.id,
          nombre: emp.name?.split(' ')[0] || emp.nombre || '',
          apellido: emp.name?.split(' ').slice(1).join(' ') || emp.apellido || '',
          salario_base: emp.salarioBase || emp.salario_base || 0,
          ibc: emp.ibc || emp.salarioBase || emp.salario_base || 0,
          dias_trabajados: emp.diasTrabajados || emp.dias_trabajados || 30,
          total_devengado: emp.totalDevengado || emp.total_devengado || emp.salarioBase || 0,
          total_deducciones: emp.totalDeducciones || emp.total_deducciones || 0,
          neto_pagado: emp.netoPagado || emp.neto_pagado || (emp.totalDevengado || emp.salarioBase || 0) - (emp.totalDeducciones || 0),
          payroll_id: emp.payrollId || emp.payroll_id || emp.id
        }));
        
        setEmployees(expandedEmployees);
      } catch (error) {
        console.error('Error loading employees:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los empleados del período",
          variant: "destructive",
        });
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, [periodId]);

  const handleGoBack = () => {
    navigate('/payroll/history');
  };

  const handleAddNovedad = (employeeId: string) => {
    // Navigate to add novedad for specific employee
    console.log('Add novedad for employee:', employeeId);
  };

  const handleEditNovedad = (novedad: PayrollNovedad) => {
    // Navigate to edit novedad
    console.log('Edit novedad:', novedad);
  };

  // Group novedades by employee (convert to basic PayrollNovedad type)
  const novedadesByEmployee = React.useMemo(() => {
    const grouped: Record<string, PayrollNovedad[]> = {};
    novedades.forEach((novedad) => {
      if (!grouped[novedad.empleado_id]) {
        grouped[novedad.empleado_id] = [];
      }
      // Convert enhanced novedad to basic novedad type
      const basicNovedad: PayrollNovedad = {
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad as any, // Type conversion
        subtipo: novedad.subtipo || '',
        valor: novedad.valor,
        fecha_inicio: novedad.fecha_inicio,
        fecha_fin: novedad.fecha_fin,
        observacion: novedad.observacion || '',
        dias: novedad.dias || 0,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      };
      grouped[novedad.empleado_id].push(basicNovedad);
    });
    return grouped;
  }, [novedades]);

  // Format period header
  const formatPeriodHeader = () => {
    if (!periodData) return { title: '', dateRange: '' };
    
    const startDate = new Date(periodData.fecha_inicio);
    const endDate = new Date(periodData.fecha_fin);
    
    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    return {
      title: periodData.periodo,
      dateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`
    };
  };

  const { title, dateRange } = formatPeriodHeader();

  if (!periodId) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se ha especificado un período válido.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingPeriod || !periodData) {
    return (
      <div className="container py-10">
        <p>Cargando datos del período...</p>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleGoBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <PeriodHeader period={title} dateRange={dateRange} />
      
      <PeriodSummaryCards
        periodType={periodData.tipo_periodo}
        employeesCount={periodData.empleados_count}
        totalDevengado={periodData.total_devengado}
        totalNeto={periodData.total_neto}
      />

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>
        
        <TabsContent value="employees" className="mt-6">
          {isLoadingEmployees ? (
            <p>Cargando empleados...</p>
          ) : (
            <ExpandedEmployeesTable
              employees={employees}
              novedades={novedadesByEmployee}
              onAddNovedad={handleAddNovedad}
              onEditNovedad={handleEditNovedad}
              canEdit={true}
            />
          )}
        </TabsContent>
        
        <TabsContent value="audit" className="mt-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>Los registros de auditoría estarán disponibles próximamente.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
