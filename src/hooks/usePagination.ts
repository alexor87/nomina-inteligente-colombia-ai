
import { useState, useMemo, useEffect } from 'react';

export interface PaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  storageKey?: string;
}

export interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedItems: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  changePageSize: (size: number) => void;
  pageSizeOptions: number[];
}

export const usePagination = <T>(
  items: T[],
  options: PaginationOptions = {}
): PaginationResult<T> => {
  const {
    defaultPageSize = 25,
    pageSizeOptions = [25, 50, 75, 100],
    storageKey
  } = options;

  // Load initial page size from localStorage if storageKey is provided
  const getInitialPageSize = () => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`pagination_${storageKey}_pageSize`);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (pageSizeOptions.includes(parsed)) {
          return parsed;
        }
      }
    }
    return defaultPageSize;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(getInitialPageSize);

  // Calculate pagination values
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Reset to page 1 when items change (e.g., after filtering)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Save page size to localStorage when it changes
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`pagination_${storageKey}_pageSize`, pageSize.toString());
    }
  }, [pageSize, storageKey]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    pageSizeOptions
  };
};
