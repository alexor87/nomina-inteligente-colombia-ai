
import { useState } from 'react';

export const useVoucherSelection = () => {
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);

  const toggleVoucherSelection = (voucherId: string) => {
    setSelectedVouchers(prev => 
      prev.includes(voucherId)
        ? prev.filter(id => id !== voucherId)
        : [...prev, voucherId]
    );
  };

  const toggleAllVouchers = (allVoucherIds: string[]) => {
    if (selectedVouchers.length === allVoucherIds.length) {
      setSelectedVouchers([]);
    } else {
      setSelectedVouchers(allVoucherIds);
    }
  };

  const clearSelection = () => {
    setSelectedVouchers([]);
  };

  return {
    selectedVouchers,
    toggleVoucherSelection,
    toggleAllVouchers,
    clearSelection,
    setSelectedVouchers
  };
};
