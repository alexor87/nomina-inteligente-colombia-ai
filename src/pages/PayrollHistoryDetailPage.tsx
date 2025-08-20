import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { useNovedades } from '@/hooks/useNovedades';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

interface RouteParams {
  periodId: string;
}

export const PayrollHistoryDetailPage = () => {
  const { periodId } = useParams<RouteParams>();
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
      const { data, error } = await supabase
        .from('payroll_employees')
        .select('*')
        .eq('periodo_id', periodId);

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setEmployees(data);
      } else {
        setEmployees([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los empleados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [periodId, toast]);

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
        accessorKey: 'name',
        header: 'Nombre',
      },
      {
        accessorKey: 'position',
        header: 'Cargo',
      },
      {
        accessorKey: 'baseSalary',
        header: 'Salario Base',
      },
      {
        accessorKey: 'workedDays',
        header: 'Días Trabajados',
      },
      {
        accessorKey: 'extraHours',
        header: 'Horas Extra',
      },
      {
        accessorKey: 'bonuses',
        header: 'Bonificaciones',
      },
      {
        accessorKey: 'grossPay',
        header: 'Total Devengado',
      },
      {
        accessorKey: 'deductions',
        header: 'Deducciones',
      },
      {
        accessorKey: 'netPay',
        header: 'Neto a Pagar',
      },
			{
        accessorKey: 'actions',
        header: 'Acciones',
				cell: ({ row }) => (
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
              mode="month"
              defaultMonth={date}
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
        <p>Cargando empleados...</p>
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
