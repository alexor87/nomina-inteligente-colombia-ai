
import { useState, useMemo } from 'react';

interface UsePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  initialPage?: number;
}

interface UsePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  storageKey?: string;
}

export interface PaginationResult<T = any> {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  pageSize: number;
  totalItems: number;
  offset: number;
  startIndex: number;
  endIndex: number;
  paginatedItems: T[];
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  canGoToNextPage: boolean;
  canGoToPreviousPage: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  changePageSize: (size: number) => void;
  pageSizeOptions: number[];
}

// Overloaded function signatures
export function usePagination<T>(
  items: T[],
  options?: UsePaginationOptions
): PaginationResult<T>;

export function usePagination(props: UsePaginationProps): PaginationResult;

export function usePagination<T>(
  itemsOrProps: T[] | UsePaginationProps,
  options?: UsePaginationOptions
): PaginationResult<T> {
  // Handle both function signatures
  const isLegacyInterface = !Array.isArray(itemsOrProps) && 'totalItems' in itemsOrProps;
  
  const items = isLegacyInterface ? [] as T[] : itemsOrProps as T[];
  const totalItems = isLegacyInterface ? (itemsOrProps as UsePaginationProps).totalItems : items.length;
  const defaultPageSize = isLegacyInterface ? (itemsOrProps as UsePaginationProps).itemsPerPage : (options?.defaultPageSize || 10);
  const initialPage = isLegacyInterface ? (itemsOrProps as UsePaginationProps).initialPage || 1 : 1;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const pageSizeOptions = options?.pageSizeOptions || [10, 25, 50, 100];

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const offset = (currentPage - 1) * pageSize;
  const startIndex = offset;
  const endIndex = Math.min(offset + pageSize, totalItems);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const canGoToNextPage = currentPage < totalPages;
  const canGoToPreviousPage = currentPage > 1;

  // Get paginated items for array-based usage
  const paginatedItems = isLegacyInterface ? [] as T[] : items.slice(offset, offset + pageSize);

  return useMemo(() => ({
    currentPage,
    totalPages,
    itemsPerPage: pageSize,
    pageSize,
    totalItems,
    offset,
    startIndex,
    endIndex,
    paginatedItems,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    canGoToNextPage,
    canGoToPreviousPage,
    hasNextPage: canGoToNextPage,
    hasPreviousPage: canGoToPreviousPage,
    changePageSize,
    pageSizeOptions
  }), [
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    offset,
    startIndex,
    endIndex,
    paginatedItems,
    canGoToNextPage,
    canGoToPreviousPage,
    pageSizeOptions
  ]);
}
