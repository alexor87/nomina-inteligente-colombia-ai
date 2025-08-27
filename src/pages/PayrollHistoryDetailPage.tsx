import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Edit, Copy, Trash, FileText, XCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { useToast as useToastHook } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { PayrollNovedad as PayrollNovedadEnhanced } from '@/types/novedades-enhanced';
import { PayrollNovedad } from '@/types/novedades';
import { CreateNovedadData } from '@/services/NovedadesEnhancedService';
import { PeriodEmployeesTable } from '@/components/payroll-history/PeriodEmployeesTable';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';

export default function PayrollHistoryDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Load novedades for the period
  const {
    novedades,
    isLoading: isLoadingNovedades,
    refetch: refetchNovedades
  } = usePayrollNovedadesUnified({ periodId: periodId || '', enabled: !!periodId });

  // Load employees for the period
  useEffect(() => {
    const loadEmployees = async () => {
      if (!periodId) return;
      
      setIsLoadingEmployees(true);
      try {
        const employeesData = await EmployeeUnifiedService.getEmployeesForPeriod(periodId);
        setEmployees(employeesData);
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

  return (
    <>
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Detalle del Período de Nómina</CardTitle>
            <CardDescription>
              Aquí puedes ver y gestionar las novedades del período seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {periodId ? (
              <>
                <Alert>
                  <AlertTitle>Período seleccionado: {periodId}</AlertTitle>
                  <AlertDescription>
                    Estás viendo las novedades del período con ID: {periodId}.
                  </AlertDescription>
                </Alert>

                <Separator className="my-4" />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Empleados Liquidados</h3>
                  {isLoadingEmployees ? (
                    <p>Cargando empleados...</p>
                  ) : (
                    <PeriodEmployeesTable
                      employees={employees}
                      novedades={novedadesByEmployee}
                      onAddNovedad={handleAddNovedad}
                      onEditNovedad={handleEditNovedad}
                      canEdit={true}
                    />
                  )}
                </div>


                <Button variant="secondary" onClick={handleGoBack}>
                  Volver a la Lista de Períodos
                </Button>
              </>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  No se ha especificado un período válido.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
