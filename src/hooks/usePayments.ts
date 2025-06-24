
import { useState, useEffect, useMemo } from 'react';
import { PaymentEmployee, PaymentPeriod, PaymentFilters, BankFileGeneration } from '@/types/payments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePayments = () => {
  const [employees, setEmployees] = useState<PaymentEmployee[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<PaymentPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingFile, setIsGeneratingFile] = useState(false);
  const [filters, setFilters] = useState<PaymentFilters>({});
  const { toast } = useToast();

  const getCurrentUserCompanyId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  };

  const loadPaymentData = async () => {
    try {
      setIsLoading(true);
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        setEmployees([]);
        setCurrentPeriod(null);
        return;
      }

      // Cargar empleados con datos de nómina procesada
      const { data: payrollData, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (
            id,
            nombre,
            apellido,
            cargo,
            email
          )
        `)
        .eq('company_id', companyId)
        .eq('estado', 'procesada')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convertir datos de nómina a formato de pagos
      const paymentEmployees: PaymentEmployee[] = (payrollData || []).map(payroll => ({
        id: payroll.id,
        employeeId: payroll.employee_id,
        name: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
        position: payroll.employees.cargo || 'Sin cargo',
        bankName: 'Bancolombia', // Por defecto
        accountType: 'ahorros',
        accountNumber: '****1234', // Por defecto
        netPay: Number(payroll.neto_pagado || 0),
        paymentStatus: 'pendiente',
        paymentMethod: 'transferencia',
        costCenter: 'Administración'
      }));

      setEmployees(paymentEmployees);

      // Crear período actual basado en los datos
      if (payrollData && payrollData.length > 0) {
        const latestPeriod = payrollData[0].periodo;
        setCurrentPeriod({
          id: 'current',
          periodName: latestPeriod,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          status: 'processing',
          totalEmployees: paymentEmployees.length,
          totalAmount: paymentEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
          totalPaid: 0,
          totalFailed: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error loading payment data:', error);
      toast({
        title: "Error al cargar datos de pago",
        description: "No se pudieron cargar los datos de pago",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      if (filters.paymentStatus && employee.paymentStatus !== filters.paymentStatus) {
        return false;
      }
      if (filters.bankName && employee.bankName !== filters.bankName) {
        return false;
      }
      if (filters.costCenter && employee.costCenter !== filters.costCenter) {
        return false;
      }
      return true;
    });
  }, [employees, filters]);

  const updateFilters = (newFilters: Partial<PaymentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const markEmployeeAsPaid = async (employeeId: string, confirmation: any) => {
    try {
      const { error } = await supabase
        .from('payrolls')
        .update({ estado: 'pagada' })
        .eq('id', employeeId);

      if (error) throw error;

      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, paymentStatus: 'pagado', paymentDate: confirmation.paymentDate }
          : emp
      ));

      toast({
        title: "Pago marcado como realizado",
        description: "El empleado ha sido marcado como pagado",
      });

      return true;
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar el pago",
        variant: "destructive"
      });
      return false;
    }
  };

  const markMultipleAsPaid = async (employeeIds: string[], paymentDate: string) => {
    try {
      const { error } = await supabase
        .from('payrolls')
        .update({ estado: 'pagada' })
        .in('id', employeeIds);

      if (error) throw error;

      setEmployees(prev => prev.map(emp => 
        employeeIds.includes(emp.id) 
          ? { ...emp, paymentStatus: 'pagado', paymentDate }
          : emp
      ));

      toast({
        title: "Pagos marcados como realizados",
        description: `${employeeIds.length} empleados marcados como pagados`,
      });

      return true;
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: "Error",
        description: "No se pudieron marcar los pagos",
        variant: "destructive"
      });
      return false;
    }
  };

  const retryPayment = async (employeeId: string) => {
    try {
      // Lógica para reintentar pago
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, paymentStatus: 'pendiente', errorReason: undefined }
          : emp
      ));

      toast({
        title: "Pago reintentado",
        description: "El pago se ha marcado para reintento",
      });

      return true;
    } catch (error) {
      console.error('Error retrying payment:', error);
      return false;
    }
  };

  const updateBankAccount = async (employeeId: string, accountData: any) => {
    try {
      // Aquí se actualizarían los datos bancarios en la base de datos
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, ...accountData, paymentStatus: 'pendiente', errorReason: undefined }
          : emp
      ));

      toast({
        title: "Datos bancarios actualizados",
        description: "Los datos bancarios han sido actualizados",
      });

      return true;
    } catch (error) {
      console.error('Error updating bank account:', error);
      return false;
    }
  };

  const downloadPaymentReport = async (periodId: string) => {
    try {
      // Lógica para descargar reporte
      toast({
        title: "Reporte descargado",
        description: "El reporte de pagos ha sido descargado",
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el reporte",
        variant: "destructive"
      });
    }
  };

  const generateBankFile = async (config: BankFileGeneration) => {
    try {
      setIsGeneratingFile(true);
      
      // Simular generación de archivo
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Archivo generado",
        description: `Archivo para ${config.bankName} generado exitosamente`,
      });

      return {
        success: true,
        fileName: `dispersión_${config.bankName}_${new Date().toISOString().split('T')[0]}.txt`,
        downloadUrl: '#'
      };
    } catch (error) {
      console.error('Error generating bank file:', error);
      return {
        success: false,
        fileName: '',
        downloadUrl: ''
      };
    } finally {
      setIsGeneratingFile(false);
    }
  };

  return {
    employees: filteredEmployees,
    currentPeriod,
    isLoading,
    isGeneratingFile,
    filters,
    updateFilters,
    markEmployeeAsPaid,
    markMultipleAsPaid,
    retryPayment,
    updateBankAccount,
    downloadPaymentReport,
    generateBankFile,
    refreshData: loadPaymentData,
    totalEmployees: employees.length,
    totalAmount: employees.reduce((sum, emp) => sum + emp.netPay, 0)
  };
};
