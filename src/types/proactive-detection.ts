/**
 * Sistema de Detección Proactiva de Problemas
 * Detecta y alerta sobre problemas antes de que se conviertan en críticos
 */

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertCategory {
  EMPLOYEE_DATA = 'employee_data',
  PAYROLL = 'payroll',
  DEADLINES = 'deadlines',
  COMPLIANCE = 'compliance',
  AFFILIATIONS = 'affiliations',
  BENEFITS = 'benefits'
}

export enum AlertType {
  // Employee Data
  INCOMPLETE_EMPLOYEE_DATA = 'incomplete_employee_data',
  MISSING_AFFILIATIONS = 'missing_affiliations',
  INVALID_BANK_INFO = 'invalid_bank_info',
  
  // Payroll
  PAYROLL_PERIOD_NOT_CALCULATED = 'payroll_period_not_calculated',
  PENDING_NOVEDADES = 'pending_novedades',
  INCONSISTENT_CALCULATIONS = 'inconsistent_calculations',
  
  // Deadlines
  CONTRACT_EXPIRING_SOON = 'contract_expiring_soon',
  PAYMENT_DEADLINE_APPROACHING = 'payment_deadline_approaching',
  SOCIAL_SECURITY_DUE = 'social_security_due',
  
  // Compliance
  MISSING_LEGAL_DOCUMENTS = 'missing_legal_documents',
  OUTDATED_CONFIGURATIONS = 'outdated_configurations',
  
  // Benefits
  VACATION_BALANCE_HIGH = 'vacation_balance_high',
  SEVERANCE_DUE = 'severance_due',
  ANNIVERSARY_APPROACHING = 'anniversary_approaching'
}

export interface ProactiveAlert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedEntities: {
    employees?: string[];  // Employee IDs
    periods?: string[];    // Period IDs
    count: number;
  };
  recommendation: string;
  actionRequired: boolean;
  dueDate?: string;
  detectedAt: string;
  metadata?: Record<string, any>;
}

export interface ProactiveDetectionResult {
  alerts: ProactiveAlert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  scanTimestamp: string;
}

export interface DetectionRule {
  type: AlertType;
  category: AlertCategory;
  severity: AlertSeverity;
  condition: (context: any) => Promise<boolean>;
  generateAlert: (context: any) => Promise<ProactiveAlert>;
}
