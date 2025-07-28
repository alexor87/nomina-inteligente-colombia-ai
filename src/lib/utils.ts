
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  // ✅ VALIDACIÓN DEFENSIVA
  if (!Number.isFinite(value) || value === null || value === undefined) {
    console.warn('⚠️ formatCurrency recibió valor inválido:', value);
    return '$0';
  }
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
