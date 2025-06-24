
import { useState, useEffect, useMemo } from 'react';
import { PayrollVoucher } from '@/types/vouchers';
import { VoucherService } from '@/services/VoucherService';
import { useToast } from '@/hooks/use-toast';
import { useVoucherFilters } from './useVoucherFilters';
import { useVoucherSelection } from './useVoucherSelection';
import { useVoucherActions } from './useVoucherActions';
import { useVoucherSummary } from './useVoucherSummary';

export const useVouchers = () => {
  const [vouchers, setVouchers] = useState<PayrollVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const { filters, updateFilters, clearFilters } = useVoucherFilters();
  const { 
    selectedVouchers, 
    toggleVoucherSelection, 
    toggleAllVouchers, 
    clearSelection 
  } = useVoucherSelection();

  // Cargar comprobantes desde Supabase
  const loadVouchers = async () => {
    try {
      setIsLoading(true);
      const data = await VoucherService.loadVouchers();
      setVouchers(data);
      console.log('Comprobantes cargados:', data.length);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast({
        title: "Error al cargar comprobantes",
        description: "No se pudieron cargar los comprobantes",
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

  const summary = useVoucherSummary(vouchers);
  
  const {
    downloadVoucher,
    downloadSelectedVouchers,
    sendVoucherByEmail,
    sendSelectedVouchersByEmail,
    regenerateVoucher
  } = useVoucherActions(vouchers, loadVouchers);

  const handleToggleAllVouchers = () => {
    toggleAllVouchers(filteredVouchers.map(v => v.id));
  };

  const handleDownloadSelectedVouchers = async () => {
    await downloadSelectedVouchers(selectedVouchers);
    clearSelection();
  };

  const handleSendSelectedVouchersByEmail = async () => {
    await sendSelectedVouchersByEmail(selectedVouchers);
    clearSelection();
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
    toggleAllVouchers: handleToggleAllVouchers,
    downloadVoucher,
    downloadSelectedVouchers: handleDownloadSelectedVouchers,
    sendVoucherByEmail,
    sendSelectedVouchersByEmail: handleSendSelectedVouchersByEmail,
    regenerateVoucher,
    refreshVouchers: loadVouchers
  };
};
