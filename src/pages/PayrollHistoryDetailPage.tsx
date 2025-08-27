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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Textarea } from "@/components/ui/textarea"
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DatePicker } from "@/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const taxSchema = z.object({
  tipo_novedad: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  subtipo: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  valor: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  fecha_inicio: z.date(),
  fecha_fin: z.date(),
  observacion: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
})

export default function PayrollHistoryDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // ✅ FIXED: Use correct hook signature and destructure createNovedad
  const {
    novedades,
    isLoading: isLoadingNovedades,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    refetch: refetchNovedades
  } = usePayrollNovedadesUnified({ periodId: periodId || '', enabled: !!periodId });

  const [open, setOpen] = React.useState(false);

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

  const form = useForm<z.infer<typeof taxSchema>>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      tipo_novedad: "",
      subtipo: "",
      valor: "",
      fecha_inicio: new Date(),
      fecha_fin: new Date(),
      observacion: "",
    },
  })

  function formatDate(date: Date) {
    return format(date, 'dd MMMM yyyy', { locale: es });
  }

  const handleGoBack = () => {
    navigate('/payroll/history');
  };

  const handleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployee(employeeId);
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    const novedadData = {
      ...data,
      empleado_id: selectedEmployee,
      periodo_id: periodId!
    };
    
    const result = await createNovedad(novedadData);
    if (result) {
      refetchNovedades();
    }
  };

  const handleAddNovedad = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setOpen(true);
  };

  const handleEditNovedad = (novedad: PayrollNovedad) => {
    // Implementation for editing novedad
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

                <Separator className="my-4" />

                <div>
                  <h2>Novedades del Período</h2>
                  {isLoadingNovedades ? (
                    <p>Cargando novedades...</p>
                  ) : (
                    <Table>
                      <TableCaption>Lista de novedades para este período.</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Tipo</TableHead>
                          <TableHead>Subtipo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Fecha Inicio</TableHead>
                          <TableHead>Fecha Fin</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {novedades.map((novedad) => (
                          <TableRow key={novedad.id}>
                            <TableCell className="font-medium">{novedad.tipo_novedad}</TableCell>
                            <TableCell>{novedad.subtipo}</TableCell>
                            <TableCell>{novedad.valor}</TableCell>
                            <TableCell>{novedad.fecha_inicio}</TableCell>
                            <TableCell>{novedad.fecha_fin}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="mr-2 h-4 w-4" /> Duplicar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Trash className="mr-2 h-4 w-4" /> Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <Separator className="my-4" />

                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default">Agregar Novedad</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Agregar Novedad</DialogTitle>
                      <DialogDescription>
                        Agrega una nueva novedad al período seleccionado.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(async (values) => {
                        console.log(values)
                        if (!selectedEmployee) {
                          console.error('No employee selected');
                          return;
                        }
                        
                        await handleCreateNovedad({
                          empleado_id: selectedEmployee,
                          periodo_id: periodId!,
                          company_id: '', // This will be set by the service
                          tipo_novedad: values.tipo_novedad as 'bonificacion',
                          subtipo: values.subtipo,
                          valor: parseFloat(values.valor),
                          fecha_inicio: values.fecha_inicio.toISOString(),
                          fecha_fin: values.fecha_fin.toISOString(),
                          observacion: values.observacion,
                        })
                        setOpen(false)
                      })} className="space-y-4">
                        <div className="grid gap-2">
                          <FormItem>
                            <FormLabel>Tipo de Novedad</FormLabel>
                            <FormControl>
                              <Input placeholder="Tipo de Novedad" {...form.register("tipo_novedad")} />
                            </FormControl>
                            <FormDescription>
                              Este es el tipo de novedad.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        </div>
                        <div className="grid gap-2">
                          <FormItem>
                            <FormLabel>Subtipo de Novedad</FormLabel>
                            <FormControl>
                              <Input placeholder="Subtipo de Novedad" {...form.register("subtipo")} />
                            </FormControl>
                            <FormDescription>
                              Este es el subtipo de novedad.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        </div>
                        <div className="grid gap-2">
                          <FormItem>
                            <FormLabel>Valor</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Valor" {...form.register("valor")} />
                            </FormControl>
                            <FormDescription>
                              Este es el valor de la novedad.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormItem>
                            <FormLabel>Fecha de Inicio</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-[240px] pl-3 text-left font-normal",
                                      !form.getValues().fecha_inicio && "text-muted-foreground"
                                    )}
                                  >
                                    {form.getValues().fecha_inicio ? (
                                      formatDate(form.getValues().fecha_inicio)
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="center" side="bottom">
                                <DatePicker
                                  mode="single"
                                  selected={form.getValues().fecha_inicio}
                                  onSelect={(date) => form.setValue("fecha_inicio", date!)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              Esta es la fecha de inicio de la novedad.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                          <FormItem>
                            <FormLabel>Fecha de Fin</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-[240px] pl-3 text-left font-normal",
                                      !form.getValues().fecha_fin && "text-muted-foreground"
                                    )}
                                  >
                                    {form.getValues().fecha_fin ? (
                                      formatDate(form.getValues().fecha_fin)
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="center" side="bottom">
                                <DatePicker
                                  mode="single"
                                  selected={form.getValues().fecha_fin}
                                  onSelect={(date) => form.setValue("fecha_fin", date!)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              Esta es la fecha de fin de la novedad.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        </div>
                        <div className="grid gap-2">
                          <FormItem>
                            <FormLabel>Observación</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Observación"
                                className="resize-none"
                                {...form.register("observacion")}
                              />
                            </FormControl>
                            <FormDescription>
                              Esta es la observación de la novedad.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        </div>
                        <Button type="submit">Agregar</Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Separator className="my-4" />

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
