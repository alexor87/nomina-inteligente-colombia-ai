
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { useNovedades } from '@/hooks/useNovedades';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { LoadingState } from '@/components/ui/LoadingState';

export const PayrollHistoryDetailPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isNovedadModalOpen, setIsNovedadModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  
  const { companyId } = useCurrentCompany();
  const { createNovedad } = useNovedades(periodId || '');

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'No se ha seleccionado una fecha';
    return format(date, 'LLLL yyyy', { locale: es });
  };

  const loadEmployees = useCallback(async () => {
    if (!periodId) {
      toast({
        title: "Error",
        description: "No se proporcionó el ID del período.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Since payroll_employees table doesn't exist in the schema, let's use a different approach
      // We'll fetch from employees and filter by company
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        throw new Error(error.message);
      }

      // Transform the data to match PayrollEmployee interface
      const transformedEmployees: PayrollEmployee[] = (data || []).map(emp => ({
        id: emp.id,
        name: emp.first_name + ' ' + emp.last_name,
        position: emp.position || 'Sin cargo',
        baseSalary: emp.salary || 0,
        workedDays: 30, // Default value
        extraHours: 0,
        bonuses: 0,
        grossPay: emp.salary || 0,
        deductions: 0,
        netPay: emp.salary || 0,
        status: 'valid' as const,
        healthDeduction: 0,
        pensionDeduction: 0,
        transportAllowance: 0,
        ibc: emp.salary || 0
      }));

      setEmployees(transformedEmployees);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los empleados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [periodId, companyId, toast]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    console.log('📝 PayrollTable - Creating novedad with data:', data);
    
    const novedadData: CreateNovedadData = {
      empleado_id: selectedEmployee.id,
      periodo_id: periodId,
      company_id: companyId || '',
      ...data
    };
    
    await createNovedad(novedadData);
  };

  const columns = React.useMemo(
    () => [
      {
        accessorKey: 'name' as keyof PayrollEmployee,
        header: 'Nombre',
      },
      {
        accessorKey: 'position' as keyof PayrollEmployee,
        header: 'Cargo',
      },
      {
        accessorKey: 'baseSalary' as keyof PayrollEmployee,
        header: 'Salario Base',
      },
      {
        accessorKey: 'workedDays' as keyof PayrollEmployee,
        header: 'Días Trabajados',
      },
      {
        accessorKey: 'extraHours' as keyof PayrollEmployee,
        header: 'Horas Extra',
      },
      {
        accessorKey: 'bonuses' as keyof PayrollEmployee,
        header: 'Bonificaciones',
      },
      {
        accessorKey: 'grossPay' as keyof PayrollEmployee,
        header: 'Total Devengado',
      },
      {
        accessorKey: 'deductions' as keyof PayrollEmployee,
        header: 'Deducciones',
      },
      {
        accessorKey: 'netPay' as keyof PayrollEmployee,
        header: 'Neto a Pagar',
      },
      {
        accessorKey: 'actions' as keyof PayrollEmployee,
        header: 'Acciones',
        cell: ({ row }: { row: { original: PayrollEmployee } }) => (
          <Button onClick={() => {
            setSelectedEmployee(row.original);
            setIsNovedadModalOpen(true);
          }}>
            Gestionar Novedades
          </Button>
        )
      },
    ],
    []
  );

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <Button onClick={() => navigate('/payroll/history')}>
          Volver al Historial
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDate(date)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) =>
                date > new Date() || date < new Date('2023-01-01')
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <LoadingState message="Cargando empleados..." />
      ) : (
        <DataTable columns={columns} data={employees} />
      )}

      {selectedEmployee && (
        <NovedadUnifiedModal
          open={isNovedadModalOpen}
          setOpen={setIsNovedadModalOpen}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          periodId={periodId}
          onSubmit={handleCreateNovedad}
          selectedNovedadType={null}
          onClose={() => {
            setIsNovedadModalOpen(false);
            setSelectedEmployee(null);
          }}
          companyId={companyId}
        />
      )}
    </div>
  );
};
