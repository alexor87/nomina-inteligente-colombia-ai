
import { useState, useEffect, useMemo } from 'react';
import { PayrollVoucher, VoucherFilters, VoucherSummary } from '@/types/vouchers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useVouchers = () => {
  const [vouchers, setVouchers] = useState<PayrollVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);
  const { toast } = useToast();

  const [filters, setFilters] = useState<VoucherFilters>({
    searchTerm: '',
    periodo: '',
    voucherStatus: '',
    sentToEmployee: undefined,
    dianStatus: '',
    startDate: '',
    endDate: ''
  });

  // Cargar comprobantes desde Supabase
  const loadVouchers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payroll_vouchers')
        .select(`
          *,
          employees (
            nombre,
            apellido,
            cedula,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading vouchers:', error);
        toast({
          title: "Error al cargar comprobantes",
          description: "No se pudieron cargar los comprobantes",
          variant: "destructive"
        });
        return;
      }

      // Transformar datos de Supabase
      const transformedVouchers: PayrollVoucher[] = (data || []).map(voucher => ({
        id: voucher.id,
        companyId: voucher.company_id,
        employeeId: voucher.employee_id,
        payrollId: voucher.payroll_id || undefined,
        periodo: voucher.periodo,
        startDate: voucher.start_date,
        endDate: voucher.end_date,
        netPay: Number(voucher.net_pay),
        voucherStatus: voucher.voucher_status as 'generado' | 'pendiente' | 'firmado' | 'error',
        sentToEmployee: voucher.sent_to_employee,
        sentDate: voucher.sent_date || undefined,
        pdfUrl: voucher.pdf_url || undefined,
        xmlUrl: voucher.xml_url || undefined,
        dianStatus: voucher.dian_status as 'pendiente' | 'firmado' | 'rechazado' | 'error',
        dianCufe: voucher.dian_cufe || undefined,
        electronicSignatureDate: voucher.electronic_signature_date || undefined,
        createdAt: voucher.created_at,
        updatedAt: voucher.updated_at,
        generatedBy: voucher.generated_by || undefined,
        // Campos del empleado
        employeeName: voucher.employees ? `${voucher.employees.nombre} ${voucher.employees.apellido}` : 'Sin nombre',
        employeeEmail: voucher.employees?.email || '',
        employeeCedula: voucher.employees?.cedula || ''
      }));

      setVouchers(transformedVouchers);
      console.log('Comprobantes cargados:', transformedVouchers.length);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al cargar los comprobantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  // Filtrar comprobantes
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(voucher => {
      // Búsqueda por texto
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          voucher.employeeName?.toLowerCase().includes(searchLower) ||
          voucher.employeeCedula?.includes(filters.searchTerm) ||
          voucher.periodo.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filtro por período
      if (filters.periodo && voucher.periodo !== filters.periodo) {
        return false;
      }

      // Filtro por estado del comprobante
      if (filters.voucherStatus && voucher.voucherStatus !== filters.voucherStatus) {
        return false;
      }

      // Filtro por enviado al empleado
      if (filters.sentToEmployee !== undefined && voucher.sentToEmployee !== filters.sentToEmployee) {
        return false;
      }

      // Filtro por estado DIAN
      if (filters.dianStatus && voucher.dianStatus !== filters.dianStatus) {
        return false;
      }

      // Filtro por rango de fechas
      if (filters.startDate) {
        if (new Date(voucher.startDate) < new Date(filters.startDate)) {
          return false;
        }
      }

      if (filters.endDate) {
        if (new Date(voucher.endDate) > new Date(filters.endDate)) {
          return false;
        }
      }

      return true;
    });
  }, [vouchers, filters]);

  // Calcular resumen
  const summary: VoucherSummary = useMemo(() => {
    const total = vouchers.length;
    const signed = vouchers.filter(v => v.dianStatus === 'firmado').length;
    const sent = vouchers.filter(v => v.sentToEmployee).length;
    const pending = vouchers.filter(v => v.voucherStatus === 'pendiente').length;

    return {
      totalVouchers: total,
      signedPercentage: total > 0 ? Math.round((signed / total) * 100) : 0,
      sentPercentage: total > 0 ? Math.round((sent / total) * 100) : 0,
      pendingVouchers: pending
    };
  }, [vouchers]);

  const updateFilters = (newFilters: Partial<VoucherFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      periodo: '',
      voucherStatus: '',
      sentToEmployee: undefined,
      dianStatus: '',
      startDate: '',
      endDate: ''
    });
  };

  const toggleVoucherSelection = (voucherId: string) => {
    setSelectedVouchers(prev => 
      prev.includes(voucherId)
        ? prev.filter(id => id !== voucherId)
        : [...prev, voucherId]
    );
  };

  const toggleAllVouchers = () => {
    if (selectedVouchers.length === filteredVouchers.length) {
      setSelectedVouchers([]);
    } else {
      setSelectedVouchers(filteredVouchers.map(v => v.id));
    }
  };

  const downloadVoucher = async (voucherId: string, type: 'pdf' | 'xml') => {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    const url = type === 'pdf' ? voucher.pdfUrl : voucher.xmlUrl;
    if (!url) {
      toast({
        title: "Archivo no disponible",
        description: `El ${type.toUpperCase()} no está disponible para este comprobante`,
        variant: "destructive"
      });
      return;
    }

    // Simular descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprobante_${voucher.employeeCedula}_${voucher.periodo}.${type}`;
    link.click();

    // Registrar auditoría
    await logVoucherAction(voucherId, 'downloaded', type);

    toast({
      title: "Descarga iniciada",
      description: `Se está descargando el ${type.toUpperCase()} del comprobante`,
    });
  };

  const downloadSelectedVouchers = async () => {
    if (selectedVouchers.length === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos un comprobante para descargar",
        variant: "destructive"
      });
      return;
    }

    // Simular descarga en ZIP
    toast({
      title: "Descarga en progreso",
      description: `Preparando descarga de ${selectedVouchers.length} comprobantes...`,
    });

    // Registrar auditoría para cada comprobante
    for (const voucherId of selectedVouchers) {
      await logVoucherAction(voucherId, 'downloaded', 'bulk');
    }

    setSelectedVouchers([]);
  };

  const sendVoucherByEmail = async (voucherId: string) => {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher || !voucher.employeeEmail) {
      toast({
        title: "No se puede enviar",
        description: "El empleado no tiene correo electrónico registrado",
        variant: "destructive"
      });
      return;
    }

    // Simular envío de correo
    await logVoucherAction(voucherId, 'sent_email', 'email', voucher.employeeEmail);

    // Actualizar estado en base de datos
    await supabase
      .from('payroll_vouchers')
      .update({ 
        sent_to_employee: true, 
        sent_date: new Date().toISOString() 
      })
      .eq('id', voucherId);

    toast({
      title: "Correo enviado",
      description: `Comprobante enviado a ${voucher.employeeEmail}`,
    });

    loadVouchers();
  };

  const sendSelectedVouchersByEmail = async () => {
    if (selectedVouchers.length === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos un comprobante para enviar",
        variant: "destructive"
      });
      return;
    }

    const vouchersToSend = vouchers.filter(v => 
      selectedVouchers.includes(v.id) && v.employeeEmail
    );

    if (vouchersToSend.length === 0) {
      toast({
        title: "Sin correos válidos",
        description: "Ninguno de los empleados seleccionados tiene correo registrado",
        variant: "destructive"
      });
      return;
    }

    // Simular envío masivo
    for (const voucher of vouchersToSend) {
      await logVoucherAction(voucher.id, 'sent_email', 'bulk_email', voucher.employeeEmail);
      await supabase
        .from('payroll_vouchers')
        .update({ 
          sent_to_employee: true, 
          sent_date: new Date().toISOString() 
        })
        .eq('id', voucher.id);
    }

    toast({
      title: "Envío completado",
      description: `${vouchersToSend.length} comprobantes enviados por correo`,
    });

    setSelectedVouchers([]);
    loadVouchers();
  };

  const regenerateVoucher = async (voucherId: string) => {
    await logVoucherAction(voucherId, 'regenerated');

    toast({
      title: "Comprobante regenerado",
      description: "El comprobante ha sido regenerado exitosamente",
    });

    loadVouchers();
  };

  const logVoucherAction = async (
    voucherId: string, 
    action: string, 
    method?: string, 
    recipient?: string
  ) => {
    try {
      await supabase
        .from('voucher_audit_log')
        .insert({
          company_id: vouchers.find(v => v.id === voucherId)?.companyId || '',
          voucher_id: voucherId,
          user_id: 'system', // TODO: obtener usuario actual
          action,
          method,
          recipient_email: recipient,
          success: true
        });
    } catch (error) {
      console.error('Error logging voucher action:', error);
    }
  };

  return {
    vouchers: filteredVouchers,
    allVouchers: vouchers,
    isLoading,
    filters,
    selectedVouchers,
    summary,
    updateFilters,
    clearFilters,
    toggleVoucherSelection,
    toggleAllVouchers,
    downloadVoucher,
    downloadSelectedVouchers,
    sendVoucherByEmail,
    sendSelectedVouchersByEmail,
    regenerateVoucher,
    refreshVouchers: loadVouchers
  };
};
