
import { DashboardMetrics } from '@/types';

export interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  actionRequired: boolean;
  dueDate?: string;
}

export interface RecentEmployee {
  id: string;
  name: string;
  position: string;
  dateAdded: string;
  status: 'activo' | 'pendiente' | 'inactivo';
  avatar?: string;
}

export interface DashboardActivity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'payroll' | 'employee' | 'report' | 'payment';
}

export class DashboardService {
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // En producción, estos datos vendrían de Supabase con queries reales
    return {
      totalEmpleados: 24,
      nominasProcesadas: 18,
      alertasLegales: 3,
      gastosNomina: 48500000,
      tendenciaMensual: 5.2
    };
  }

  static async getDashboardAlerts(): Promise<DashboardAlert[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      {
        id: '1',
        type: 'warning',
        title: '3 empleados sin afiliación ARL',
        description: 'Revisa y actualiza las afiliaciones',
        priority: 'high',
        icon: '⚠️',
        actionRequired: true
      },
      {
        id: '2',
        type: 'error',
        title: '2 contratos vencen este mes',
        description: 'Renueva antes del 25 de enero',
        priority: 'high',
        icon: '🚨',
        actionRequired: true,
        dueDate: '2025-01-25'
      },
      {
        id: '3',
        type: 'info',
        title: 'Actualización legal disponible',
        description: 'Nuevas tarifas 2024 del salario mínimo',
        priority: 'medium',
        icon: 'ℹ️',
        actionRequired: false
      }
    ];
  }

  static async getRecentEmployees(): Promise<RecentEmployee[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return [
      {
        id: '1',
        name: 'María García',
        position: 'Desarrolladora',
        dateAdded: '2025-01-15',
        status: 'activo'
      },
      {
        id: '2',
        name: 'Carlos López',
        position: 'Contador',
        dateAdded: '2025-01-12',
        status: 'activo'
      },
      {
        id: '3',
        name: 'Ana Rodríguez',
        position: 'Diseñadora',
        dateAdded: '2025-01-08',
        status: 'pendiente'
      }
    ];
  }

  static async getDashboardActivity(): Promise<DashboardActivity[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
      {
        id: '1',
        action: 'Procesó nómina de enero',
        user: 'admin@empresa.com',
        timestamp: '2025-01-25T16:45:00Z',
        type: 'payroll'
      },
      {
        id: '2',
        action: 'Agregó nuevo empleado',
        user: 'rrhh@empresa.com',
        timestamp: '2025-01-25T15:30:00Z',
        type: 'employee'
      },
      {
        id: '3',
        action: 'Exportó reporte de costos laborales',
        user: 'contador@empresa.com',
        timestamp: '2025-01-25T14:20:00Z',
        type: 'report'
      },
      {
        id: '4',
        action: 'Procesó pagos bancarios',
        user: 'admin@empresa.com',
        timestamp: '2025-01-25T13:15:00Z',
        type: 'payment'
      }
    ];
  }

  static async getPayrollSummary(): Promise<{
    totalPaid: number;
    employeesPaid: number;
    pendingPayments: number;
    totalDeductions: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      totalPaid: 45200000,
      employeesPaid: 22,
      pendingPayments: 2,
      totalDeductions: 8450000
    };
  }

  static async getComplianceStatus(): Promise<{
    socialSecurityUpToDate: boolean;
    taxDeclarationsUpToDate: boolean;
    laborCertificatesUpToDate: boolean;
    nextDeadline: string;
    nextDeadlineType: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 450));
    
    return {
      socialSecurityUpToDate: true,
      taxDeclarationsUpToDate: false,
      laborCertificatesUpToDate: true,
      nextDeadline: '2025-02-15',
      nextDeadlineType: 'Declaración de retenciones'
    };
  }
}
