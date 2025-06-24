
import { PayrollVoucher, VoucherFilters } from '@/types/vouchers';

export const filterVouchers = (vouchers: PayrollVoucher[], filters: VoucherFilters): PayrollVoucher[] => {
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
};

export const getUniquePeriodsFromVouchers = (vouchers: PayrollVoucher[]): string[] => {
  const periods = vouchers.map(voucher => voucher.periodo);
  return [...new Set(periods)].sort();
};
