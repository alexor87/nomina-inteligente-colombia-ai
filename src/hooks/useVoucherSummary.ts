
import { useMemo } from 'react';
import { PayrollVoucher, VoucherSummary } from '@/types/vouchers';

export const useVoucherSummary = (vouchers: PayrollVoucher[]): VoucherSummary => {
  return useMemo(() => {
    const total = vouchers.length;
    const sent = vouchers.filter(v => v.sentToEmployee).length;
    const pending = vouchers.filter(v => v.voucherStatus === 'pendiente').length;
    const generated = vouchers.filter(v => v.voucherStatus === 'generado').length;

    return {
      totalVouchers: total,
      sentPercentage: total > 0 ? Math.round((sent / total) * 100) : 0,
      pendingVouchers: pending,
      generatedVouchers: generated
    };
  }, [vouchers]);
};
