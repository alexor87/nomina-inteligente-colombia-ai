import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompanyId } from '@/components/employees/form/useCompanyId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Plus, Calendar, Users, DollarSign, History, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { PeriodAuditSummaryComponent } from '@/components/payroll/audit/PeriodAuditSummary';
import { NovedadAuditHistoryModal } from '@/components/payroll/audit/NovedadAuditHistoryModal';
import { ConfirmAdjustmentModal } from '@/components/payroll/corrections/ConfirmAdjustmentModal';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoucherPreviewModal } from '@/components/payroll/modals/VoucherPreviewModal';
import { 
  transformPayrollHistoryToEmployee, 
  validateEmployeeForVoucher, 
  type PayrollHistoryData 
} from '@/utils/payrollDataTransformer';
import { useCompanyDetails } from '@/hooks/useCompanyDetails';
import { ConfigurationService } from '@/services/ConfigurationService';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';

interface PeriodDetail {
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

interface EmployeePayroll {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_lastname: string;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  salario_base: number;
  ibc?: number;
  dias_trabajados?: number;
  completeEmployeeData?: any;
}

interface PendingNovedad {
  employee_id: string;
  employee_name: string;
  tipo_novedad: string;
  valor: number;
  observacion?: string;
  novedadData: CreateNovedadData;
}

export const PayrollHistoryDetailPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState<PeriodDetail | null>(null);
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeSalary, setSelectedEmployeeSalary] = useState<number>(0);
  const [selectedNovedadId, setSelectedNovedadId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [pendingNovedades, setPendingNovedades] = useState<PendingNovedad[]>([]);
  const [isApplyingAdjustments, setIsApplyingAdjustments] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucherEmployee, setSelectedVoucherEmployee] = useState<any>(null);
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [novedadesCounts, setNovedadesCounts] = useState<Record<string, number>>({});

  // Hook para gestionar novedades
  const { createNovedad } = usePayrollNovedadesUnified(periodId || '');
  
  // Hook para obtener company_id
  useCompanyId(setCompanyId);
  
  // Hook para obtener datos completos de la empresa
  const { companyDetails } = useCompanyDetails();

  // Cargar conteos de novedades del período
  const loadNovedadesCounts = async (compId: string, perId: string) => {
    if (!compId || !perId) return;
    try {
      console.log('🔄 Cargando conteos de novedades...', { compId, perId });
      const novedades = await NovedadesEnhancedService.getNovedades(compId, perId);
      const map: Record<string, number> = {};
      novedades.forEach((n: any) => {
        const empId = n?.empleado_id;
        if (empId) {
          map[empId] = (map[empId] || 0) + 1;
        }
      });
      setNovedadesCounts(map);
      console.log('✅ Conteos de novedades cargados:', map);
    } catch (error) {
      console.error('❌ Error cargando conteos de novedades:', error);
      setNovedadesCounts({});
    }
  };

  const loadPeriodDetail = async () => {
    if (!periodId) return;
    
    try {
      setLoading(true);
      
      // Load period details
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();
      
      if (periodError) throw periodError;
      setPeriod(periodData);

      // Obtener configuración del año del período para calcular IBC
      const year = periodData?.fecha_inicio ? new Date(periodData.fecha_inicio).getFullYear().toString() : '2025';
      const config = await ConfigurationService.getConfigurationAsync(year);
      console.log('⚙️ Configuración usada para IBC:', { year, porcentajes: config?.porcentajes });

      // Load employees payroll data with complete employee information
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees!inner(
            id,
            nombre, 
            apellido, 
            cedula, 
            email, 
            telefono, 
            cargo, 
            salario_base,
            banco,
            tipo_cuenta,
            numero_cuenta,
            eps,
            afp,
            arl,
            caja_compensacion
          )
        `)
        .eq('period_id', periodId);
      
      if (payrollError) throw payrollError;
      
      const employeesWithNames = payrollData?.map((p: any) => {
        // Calcular IBC desde deducciones persistidas
        const salud: number = p.salud_empleado || 0;
        const pension: number = p.pension_empleado || 0;
        let ibcCalc = 0;

        if (salud > 0 && config?.porcentajes?.saludEmpleado) {
          ibcCalc = Math.round(salud / config.porcentajes.saludEmpleado);
        } else if (pension > 0 && config?.porcentajes?.pensionEmpleado) {
          ibcCalc = Math.round(p.pension_empleado / config.porcentajes.pensionEmpleado);
        } else {
          ibcCalc = p.salario_base || 0; // fallback
        }

        return {
          id: p.id,
          employee_id: p.employee_id,
          employee_name: p.employees.nombre,
          employee_lastname: p.employees.apellido,
          total_devengado: p.total_devengado || 0,
          total_deducciones: p.total_deducciones || 0,
          neto_pagado: p.neto_pagado || 0,
          salario_base: p.salario_base || 0,
          ibc: ibcCalc,
          dias_trabajados: p.dias_trabajados || 30,
          // Campos específicos de payrolls para conceptos exactos
          auxilio_transporte: p.auxilio_transporte || 0,
          salud_empleado: p.salud_empleado || 0,
          pension_empleado: p.pension_empleado || 0,
          horas_extra: p.horas_extra || 0,
          bonificaciones: p.bonificaciones || 0,
          comisiones: p.comisiones || 0,
          cesantias: p.cesantias || 0,
          prima: p.prima || 0,
          vacaciones: p.vacaciones || 0,
          incapacidades: p.incapacidades || 0,
          otros_devengos: p.otros_devengos || 0,
          otros_descuentos: p.descuentos_varios || 0,
          retencion_fuente: p.retencion_fuente || 0,
          // Complete employee data for voucher
          completeEmployeeData: p.employees
        };
      }) || [];
      
      setEmployees(employeesWithNames);

      // Cargar conteos de novedades reales del período (si ya tenemos companyId)
      if (companyId) {
        await loadNovedadesCounts(companyId, periodId);
      }

    } catch (error) {
      console.error('Error loading period detail:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle del período",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriodDetail();
  }, [periodId]);

  // Recalcular conteos de novedades cuando tengamos companyId o cambie el listado
  useEffect(() => {
    if (periodId && companyId) {
      loadNovedadesCounts(companyId, periodId);
    }
  }, [periodId, companyId, employees.length]);

  const handleSendVoucherEmail = async (employeeId: string, employeeName: string) => {
    // Find the employee in current data
    const employeePayroll = employees.find(emp => emp.employee_id === employeeId);
    if (!employeePayroll) {
      toast({
        title: "Error",
        description: "No se encontraron datos del empleado",
        variant: "destructive"
      });
      return;
    }

    // Check if employee has email
    const employeeEmail = employeePayroll.completeEmployeeData?.email;
    if (!employeeEmail) {
      toast({
        title: "Email no disponible",
        description: `${employeeName} no tiene un email registrado`,
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeEmail)) {
      toast({
        title: "Email inválido",
        description: `El email ${employeeEmail} no tiene un formato válido`,
        variant: "destructive"
      });
      return;
    }

    // Prevent multiple sends for same employee
    if (sendingEmails.has(employeeId)) {
      toast({
        title: "Enviando...",
        description: "Ya se está enviando el comprobante a este empleado",
      });
      return;
    }

    try {
      setSendingEmails(prev => new Set(prev).add(employeeId));

      // Step 1: Generate PDF with base64 return
      console.log('🚀 Generating PDF for employee:', employeePayroll.id);
      
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: {
          payrollId: employeePayroll.id, // Use payroll record ID
          returnBase64: true
        }
      });

      if (pdfError) {
        console.error('❌ PDF generation error:', pdfError);
        throw new Error(`Error generando PDF: ${pdfError.message}`);
      }

      if (!pdfData || !pdfData.base64) {
        console.error('❌ No PDF data returned');
        throw new Error('No se pudo generar el PDF del comprobante');
      }

      console.log('✅ PDF generated successfully');

      // Step 2: Send email with PDF attachment
      const emailPayload = {
        employeeEmail,
        employeeName,
        period: {
          periodo: period?.periodo,
          startDate: period?.fecha_inicio,
          endDate: period?.fecha_fin
        },
        netPay: employeePayroll.neto_pagado,
        companyName: companyDetails?.razon_social || 'Mi Empresa',
        subject: `Comprobante de Pago - ${period?.periodo || ''}`,
        attachment: {
          fileName: pdfData.fileName || `comprobante-${employeeName.replace(/\s+/g, '-')}.pdf`,
          base64: pdfData.base64,
          mimeType: pdfData.mimeType || 'application/pdf'
        }
      };

      console.log('📧 Sending email to:', employeeEmail);

      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-voucher-email', {
        body: emailPayload
      });

      if (emailError) {
        console.error('❌ Email sending error:', emailError);
        throw new Error(`Error enviando email: ${emailError.message}`);
      }

      // Check if email was actually sent successfully
      if (!emailResult || !emailResult.success) {
        console.error('❌ Email service returned failure:', emailResult);
        throw new Error(emailResult?.error || 'El servicio de email no pudo enviar el correo');
      }

      if (!emailResult.emailId) {
        console.error('❌ No email ID returned');
        throw new Error('Email no confirmado - no se recibió ID de confirmación');
      }

      console.log('✅ Email sent successfully:', emailResult.emailId);

      // Handle test mode vs normal mode responses
      if (emailResult.testMode) {
        toast({
          title: "📧 Comprobante enviado (Modo Prueba)",
          description: `El comprobante fue enviado a ${emailResult.actualRecipient} en modo de pruebas. Original: ${emailResult.originalRecipient}`,
          className: "border-orange-200 bg-orange-50",
          duration: 8000
        });
      } else {
        toast({
          title: "✅ Comprobante enviado",
          description: `El comprobante de pago fue enviado exitosamente a ${employeeEmail}`,
          className: "border-green-200 bg-green-50"
        });
      }

    } catch (error) {
      console.error('❌ Error sending voucher email:', error);
      toast({
        title: "Error al enviar",
        description: error instanceof Error ? error.message : "No se pudo enviar el comprobante por email",
        variant: "destructive"
      });
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
        return newSet;
      });
    }
  };

  const handleDownloadVoucher = async (employeeId: string, employeeName: string) => {
    // Find the employee in current data
    const employeePayroll = employees.find(emp => emp.employee_id === employeeId);
    if (!employeePayroll) {
      toast({
        title: "Error",
        description: "No se encontraron datos del empleado",
        variant: "destructive"
      });
      return;
    }

    try {
      // NEW APPROACH: Use the payroll record ID directly for PDF generation
      console.log('✅ Opening voucher modal with payroll ID:', employeePayroll.id);
      
      // Create a simplified employee object with the payroll ID
      const employeeForVoucher = {
        id: employeePayroll.id, // This is the payroll record ID - what we need for the PDF
        name: `${employeePayroll.employee_name} ${employeePayroll.employee_lastname}`.trim(),
        employee_id: employeePayroll.employee_id,
        baseSalary: employeePayroll.salario_base,
        workedDays: employeePayroll.dias_trabajados,
        grossPay: employeePayroll.total_devengado,
        deductions: employeePayroll.total_deducciones,
        netPay: employeePayroll.neto_pagado,
        // Additional fields from the database
        transportAllowance: (employeePayroll as any).auxilio_transporte || 0,
        extraHours: (employeePayroll as any).horas_extra || 0,
        bonuses: (employeePayroll as any).bonificaciones || 0,
        position: employeePayroll.completeEmployeeData?.cargo || '',
        cedula: employeePayroll.completeEmployeeData?.cedula || '',
        eps: employeePayroll.completeEmployeeData?.eps || '',
        afp: employeePayroll.completeEmployeeData?.afp || '',
        disabilities: 0,
        absences: 0,
        employerContributions: 0
      };

      console.log('✅ Employee data prepared for voucher:', employeeForVoucher);
      setSelectedVoucherEmployee(employeeForVoucher);
      setIsVoucherModalOpen(true);
      
    } catch (error) {
      console.error('❌ Error preparing employee data:', error);
      toast({
        title: "Error de preparación",
        description: "Error al preparar los datos del empleado para el comprobante",
        variant: "destructive"
      });
    }
  };

  const handleAdjustmentSuccess = () => {
    setShowAdjustmentModal(false);
    loadPeriodDetail(); // Reload data to show new adjustment
    toast({
      title: "Ajuste registrado",
      description: "El ajuste se ha registrado correctamente",
    });
  };

  const handleOpenAdjustmentModal = (employeeId?: string, employeeSalary?: number) => {
    console.log('🔵 handleOpenAdjustmentModal called with:', { employeeId, employeeSalary });
    console.log('🔵 Period status:', period?.estado);
    console.log('🔵 Current showAdjustmentModal:', showAdjustmentModal);
    
    if (employeeId && employeeSalary) {
      // Ajuste para empleado específico
      setSelectedEmployeeId(employeeId);
      setSelectedEmployeeSalary(employeeSalary);
      const employeeData = employees.find(e => e.employee_id === employeeId);
      setSelectedEmployeeName(employeeData ? `${employeeData.employee_name} ${employeeData.employee_lastname}` : '');
      setShowAdjustmentModal(true);
      console.log('🔵 Set specific employee data and modal to true');
    } else if (employees.length > 0) {
      // Usar el primer empleado como fallback
      setSelectedEmployeeId(employees[0].employee_id);
      setSelectedEmployeeSalary(employees[0].salario_base);
      setSelectedEmployeeName(`${employees[0].employee_name} ${employees[0].employee_lastname}`);
      setShowAdjustmentModal(true);
      console.log('🔵 Set fallback employee data and modal to true');
    } else {
      console.log('🔵 No employees available');
      toast({
        title: "Error",
        description: "No hay empleados disponibles para ajustar",
        variant: "destructive"
      });
    }
  };

  const handleNovedadSubmit = async (data: CreateNovedadData) => {
    console.log('🟢 handleNovedadSubmit called with data:', data);
    console.log('🟢 Period estado:', period?.estado);
    console.log('🟢 selectedEmployeeId:', selectedEmployeeId);
    console.log('🟢 Current pendingNovedades length:', pendingNovedades.length);
    
    try {
      // For closed periods, add to pending list instead of applying immediately
      if (period?.estado === 'cerrado') {
        const employeeData = employees.find(e => e.employee_id === selectedEmployeeId);
        console.log('🟢 Found employee data:', employeeData);
        
        const newPendingNovedad: PendingNovedad = {
          employee_id: selectedEmployeeId,
          employee_name: employeeData ? `${employeeData.employee_name} ${employeeData.employee_lastname}` : selectedEmployeeName,
          tipo_novedad: data.tipo_novedad,
          valor: data.valor || 0,
          observacion: data.observacion,
          novedadData: data
        };
        
        console.log('🟢 Creating new pending novedad:', newPendingNovedad);
        setPendingNovedades(prev => {
          const newArray = [...prev, newPendingNovedad];
          console.log('🟢 Updated pendingNovedades array:', newArray);
          return newArray;
        });
        setShowAdjustmentModal(false);
        console.log('🟢 Modal closed, pending novedad added');
        
        toast({
          title: "Novedad agregada",
          description: "La novedad se agregó a la lista de ajustes pendientes",
        });
      } else {
        // For open periods, apply immediately
        console.log('🟢 Applying novedad immediately for open period');
        await createNovedad(data);
        handleAdjustmentSuccess();
      }
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
      throw error;
    }
  };

  const handleApplyPendingAdjustments = async (justification: string) => {
    if (!periodId || pendingNovedades.length === 0) return;

    try {
      setIsApplyingAdjustments(true);

      // Group novelties by employee
      const employeeGroups = pendingNovedades.reduce((groups, novedad) => {
        if (!groups[novedad.employee_id]) {
          groups[novedad.employee_id] = {
            employeeId: novedad.employee_id,
            employeeName: novedad.employee_name,
            novedades: []
          };
        }
        groups[novedad.employee_id].novedades.push(novedad.novedadData);
        return groups;
      }, {} as Record<string, { employeeId: string; employeeName: string; novedades: CreateNovedadData[] }>);

      // Apply adjustments for each employee
      for (const group of Object.values(employeeGroups)) {
        const adjustmentData: PendingAdjustmentData = {
          periodId,
          employeeId: group.employeeId,
          employeeName: group.employeeName,
          justification,
          novedades: group.novedades
        };

        const result = await PendingNovedadesService.applyPendingAdjustments(adjustmentData);
        
        if (!result.success) {
          throw new Error(result.message);
        }
      }

      // Create notification
      await PendingNovedadesService.createAdjustmentNotification(
        periodId,
        Object.keys(employeeGroups).length,
        pendingNovedades.length
      );

      toast({
        title: "Ajustes aplicados",
        description: `Se aplicaron ${pendingNovedades.length} ajustes correctamente`,
      });

      // Clear pending novelties and close modal
      setPendingNovedades([]);
      setShowConfirmModal(false);
      
      // Reload data
      loadPeriodDetail();

    } catch (error) {
      console.error("Error applying adjustments:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron aplicar los ajustes",
        variant: "destructive"
      });
    } finally {
      setIsApplyingAdjustments(false);
    }
  };

  const handleRemovePendingNovedad = (index: number) => {
    setPendingNovedades(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to calculate preview totals with pending novelties
  const calculateEmployeePreview = (employee: EmployeePayroll) => {
    const pendingForEmployee = pendingNovedades.filter(p => p.employee_id === employee.employee_id);
    
    if (pendingForEmployee.length === 0) {
      return {
        originalDevengado: employee.total_devengado,
        originalDeducciones: employee.total_deducciones,
        originalNeto: employee.neto_pagado,
        newDevengado: employee.total_devengado,
        newDeducciones: employee.total_deducciones,
        newNeto: employee.neto_pagado,
        hasPending: false,
        pendingCount: 0
      };
    }

    let totalPendingDevengos = 0;
    let totalPendingDeducciones = 0;

    pendingForEmployee.forEach(pending => {
      const { novedadData } = pending;
      if (novedadData.valor > 0) {
        totalPendingDevengos += novedadData.valor;
      } else {
        totalPendingDeducciones += Math.abs(novedadData.valor);
      }
    });

    const newDevengado = employee.total_devengado + totalPendingDevengos;
    const newDeducciones = employee.total_deducciones + totalPendingDeducciones;
    const newNeto = newDevengado - newDeducciones;

    return {
      originalDevengado: employee.total_devengado,
      originalDeducciones: employee.total_deducciones,
      originalNeto: employee.neto_pagado,
      newDevengado,
      newDeducciones,
      newNeto,
      hasPending: true,
      pendingCount: pendingForEmployee.length
    };
  };

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando detalle del período...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Período no encontrado</h3>
          <p className="text-muted-foreground mb-4">El período solicitado no existe o no tienes permisos para verlo.</p>
          <Button onClick={() => navigate('/app/payroll-history')}>
            Volver al historial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/app/payroll-history')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{period.periodo}</h1>
            <p className="text-muted-foreground">
              {new Date(period.fecha_inicio).toLocaleDateString()} - {new Date(period.fecha_fin).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        {/* Show save button for closed periods with pending novelties */}
        {period?.estado === 'cerrado' && pendingNovedades.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="animate-pulse">
              {pendingNovedades.length} novedades pendientes
            </Badge>
            <Button 
              onClick={() => setShowConfirmModal(true)}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              Guardar Novedades
            </Button>
          </div>
        )}
        
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipo</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{period.tipo_periodo}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{period.empleados_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devengado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(period.total_devengado)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(period.total_neto)}</div>
            <div className="text-xs text-muted-foreground">
              Deducciones: {formatCurrency(period.total_deducciones)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Auditoría
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Empleados Liquidados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                        Empleado
                      </TableHead>
                      <TableHead className="min-w-[140px] text-right">Salario Base</TableHead>
                      <TableHead className="min-w-[140px] text-right">IBC</TableHead>
                      <TableHead className="min-w-[100px] text-center">Días Trabajados</TableHead>
                      <TableHead className="min-w-[140px] bg-green-100 text-right font-semibold">
                        Total Devengado
                      </TableHead>
                      <TableHead className="min-w-[140px] bg-red-100 text-right font-semibold">
                        Total Deducciones
                      </TableHead>
                       <TableHead className="min-w-[100px] text-center">
                         Novedades
                       </TableHead>
                      <TableHead className="min-w-[140px] bg-blue-100 text-right font-semibold">
                        Neto Pagado
                      </TableHead>
                      <TableHead className="min-w-[140px] sticky right-0 bg-background z-10 text-center">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const preview = calculateEmployeePreview(employee);
                      const isSendingEmail = sendingEmails.has(employee.employee_id);
                      const hasEmail = !!employee.completeEmployeeData?.email;
                      const realNovedadesCount = novedadesCounts[employee.employee_id] || 0;
                      
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="sticky left-0 bg-background z-10 min-w-[200px] font-medium">
                            <div className="flex items-center">
                              <div>
                                <div className="font-medium">
                                  {employee.employee_name} {employee.employee_lastname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {employee.completeEmployeeData?.email || 'Sin email'}
                                </div>
                              </div>
                            </div>
                            {preview.hasPending && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 mt-1">
                                {preview.pendingCount} pendiente{preview.pendingCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(employee.salario_base)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(employee.ibc || employee.salario_base)}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {employee.dias_trabajados || (period?.tipo_periodo === 'quincenal' ? 15 : 30)}
                          </TableCell>
                          <TableCell className="bg-green-100 text-right">
                            {preview.hasPending ? (
                              <div className="space-y-1">
                                <div className="text-muted-foreground line-through text-sm">
                                  {formatCurrency(preview.originalDevengado)}
                                </div>
                                <div className="font-semibold text-green-600">
                                   {formatCurrency(preview.newDevengado)}
                                   <span className="text-xs ml-1">
                                     (+{formatCurrency(preview.newDevengado - preview.originalDevengado)})
                                   </span>
                                 </div>
                               </div>
                             ) : (
                               <span className="font-semibold text-green-600">
                                 {formatCurrency(employee.total_devengado)}
                               </span>
                            )}
                          </TableCell>
                          <TableCell className="bg-red-100 text-right">
                            {preview.hasPending ? (
                              <div className="space-y-1">
                                <div className="text-muted-foreground line-through text-sm">
                                  {formatCurrency(preview.originalDeducciones)}
                                </div>
                                 <div className="font-semibold text-red-600">
                                   {formatCurrency(preview.newDeducciones)}
                                   {preview.newDeducciones !== preview.originalDeducciones && (
                                     <span className="text-xs ml-1">
                                       ({preview.newDeducciones > preview.originalDeducciones ? '+' : ''}{formatCurrency(preview.newDeducciones - preview.originalDeducciones)})
                                     </span>
                                   )}
                                 </div>
                               </div>
                             ) : (
                               <span className="font-semibold text-red-600">
                                 {formatCurrency(employee.total_deducciones)}
                               </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-full border-dashed border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenAdjustmentModal(employee.employee_id, employee.salario_base)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              {realNovedadesCount > 0 && (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                  {realNovedadesCount}
                                </Badge>
                              )}
                              {preview.pendingCount > 0 && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  {preview.pendingCount}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="bg-blue-100 text-right">
                            {preview.hasPending ? (
                              <div className="space-y-1">
                                <div className="text-muted-foreground line-through text-sm">
                                  {formatCurrency(preview.originalNeto)}
                                </div>
                                 <div className="font-semibold text-blue-600">
                                    {formatCurrency(preview.newNeto)}
                                    <span className="text-xs ml-1">
                                      ({preview.newNeto > preview.originalNeto ? '+' : ''}{formatCurrency(preview.newNeto - preview.originalNeto)})
                                    </span>
                                 </div>
                               </div>
                             ) : (
                               <span className="font-semibold text-blue-600">
                                 {formatCurrency(employee.neto_pagado)}
                               </span>
                             )}
                          </TableCell>
                          <TableCell className="sticky right-0 bg-background z-10 text-center font-medium">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadVoucher(employee.employee_id, `${employee.employee_name} ${employee.employee_lastname}`)}
                                aria-label="Descargar comprobante"
                                title="Descargar comprobante"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendVoucherEmail(employee.employee_id, `${employee.employee_name} ${employee.employee_lastname}`)}
                                disabled={isSendingEmail || !hasEmail}
                                aria-label="Enviar por email"
                                title={hasEmail ? "Enviar comprobante por email" : "Empleado sin email registrado"}
                                className={!hasEmail ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                {isSendingEmail ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <PeriodAuditSummaryComponent 
            periodId={periodId || ''} 
            periodName={period.periodo} 
          />
        </TabsContent>
      </Tabs>

      {/* Adjustment Modal */}
      <NovedadUnifiedModal
        mode="ajustes"
        open={showAdjustmentModal}
        setOpen={setShowAdjustmentModal}
        employeeId={selectedEmployeeId}
        employeeSalary={selectedEmployeeSalary}
        periodId={periodId}
        onSubmit={handleNovedadSubmit}
        selectedNovedadType={null}
        startDate={period?.fecha_inicio}
        endDate={period?.fecha_fin}
        companyId={companyId}
        onClose={() => setShowAdjustmentModal(false)}
      />

      {/* Confirmation Modal for Pending Adjustments */}
      <ConfirmAdjustmentModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleApplyPendingAdjustments}
        pendingNovedades={pendingNovedades}
        periodName={period?.periodo || ''}
        isLoading={isApplyingAdjustments}
      />

      {/* Audit History Modal */}
      <NovedadAuditHistoryModal
        open={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        novedadId={selectedNovedadId}
        employeeName={selectedEmployeeName}
      />

      {/* Voucher Preview Modal */}
      <VoucherPreviewModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        employee={selectedVoucherEmployee}
        period={period ? {
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          type: period.tipo_periodo
        } : null}
        companyInfo={companyDetails}
      />
    </div>
  );
};
