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
import { PayrollHistoryService, PayrollPeriodData, PayrollEmployeeData } from '@/services/PayrollHistoryService';
import { PeriodHeader } from '@/components/payroll-history/PeriodHeader';
import { PeriodSummaryCards } from '@/components/payroll-history/PeriodSummaryCards';
import { ExpandedEmployeesTable } from '@/components/payroll-history/ExpandedEmployeesTable';
import { formatCurrency } from '@/lib/utils';

// Use PayrollPeriodData from service instead of local interface

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
  const [periodData, setPeriodData] = useState<PayrollPeriodData | null>(null);
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
        const data = await PayrollHistoryService.getPeriodData(periodId);
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
        const payrollEmployees = await PayrollHistoryService.getPeriodEmployees(periodId);
        
        // Transform PayrollEmployeeData to ExpandedEmployee format
        const expandedEmployees: ExpandedEmployee[] = payrollEmployees.map((emp: PayrollEmployeeData) => ({
          id: emp.employee_id, // Use employee_id as the main id for novedades lookup
          nombre: emp.nombre,
          apellido: emp.apellido,
          salario_base: emp.salario_base,
          ibc: PayrollHistoryService.calculateIBC(emp.salario_base, emp.dias_trabajados),
          dias_trabajados: emp.dias_trabajados,
          total_devengado: emp.total_devengado,
          total_deducciones: emp.total_deducciones,
          neto_pagado: emp.neto_pagado,
          payroll_id: emp.id // This is the payroll record id
        }));
        
        setEmployees(expandedEmployees);
        
        console.log('✅ Loaded employees from payrolls table:', expandedEmployees.length);
        console.log('Sample employee:', expandedEmployees[0]);
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
    navigate('/app/payroll-history');
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
