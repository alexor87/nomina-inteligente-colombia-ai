import { ReportInsight } from '@/types/insights';

/**
 * TIPOS ESPECÍFICOS PARA MAYA - MÓDULO DE REPORTES
 * 
 * Estos tipos encapsulan toda la lógica de reportes de Maya
 * sin contaminar los tipos globales del sistema.
 */

export interface MayaReportRequest {
  reportType: string;
  period: string;
  periodId?: string;
  companyId: string;
  filters?: {
    employeeIds?: string[];
    costCenters?: string[];
    contractTypes?: string[];
  };
  includeComparison?: boolean;
}

export interface MayaReportResult {
  success: boolean;
  reportType: string;
  narrative: string;
  insights: ReportInsight[];
  reportData: any;
  executableActions?: string[];
}

export interface PeriodResolution {
  periodId: string;
  periodName: string;
}

export interface ReportFilters {
  periodId?: string;
  employeeIds?: string[];
  costCenters?: string[];
  contractTypes?: string[];
}
