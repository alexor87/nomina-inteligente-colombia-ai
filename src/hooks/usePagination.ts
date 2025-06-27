
import { useState, useMemo } from 'react';

interface UsePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  initialPage?: number;
}

export interface PaginationResult {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  offset: number;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  canGoToNextPage: boolean;
  canGoToPreviousPage: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const usePagination = ({ 
  totalItems, 
  itemsPerPage, 
  initialPage = 1 
}: UsePaginationProps): PaginationResult => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const offset = (currentPage - 1) * itemsPerPage;

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);

  const canGoToNextPage = currentPage < totalPages;
  const canGoToPreviousPage = currentPage > 1;

  return useMemo(() => ({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    offset,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    canGoToNextPage,
    canGoToPreviousPage,
    hasNextPage: canGoToNextPage,
    hasPreviousPage: canGoToPreviousPage,
  }), [
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    offset,
    canGoToNextPage,
    canGoToPreviousPage
  ]);
};
