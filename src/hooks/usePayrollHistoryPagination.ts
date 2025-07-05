
import { useState, useMemo } from 'react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';

interface UsePaginationProps {
  items: PayrollHistoryPeriod[];
  itemsPerPage?: number;
}

export const usePayrollHistoryPagination = ({ 
  items, 
  itemsPerPage = 10 
}: UsePaginationProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    totalItems: items.length,
    itemsPerPage,
    goToPage,
    resetPage
  };
};
