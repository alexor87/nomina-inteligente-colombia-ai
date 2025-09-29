// ============================================================================
// MAYA Context Manager - Professional Architecture
// ============================================================================

import { RichContext, DashboardData, EmployeeData } from './types.ts';

export class ContextManager {
  
  static buildContextualInfo(richContext?: RichContext): string {
    if (!richContext) {
      return '• No hay información de contexto disponible';
    }
    
    return `📍 **INFORMACIÓN ACTUAL:**
• Página: ${richContext.currentPage || 'Dashboard'} (${richContext.pageType || 'unknown'})
• Empresa ID: ${richContext.companyId || 'N/A'}
• Última actualización: ${richContext.timestamp || new Date().toISOString()}

${this.buildMetricsSection(richContext.dashboardData)}

${this.buildEmployeeSection(richContext.employeeData)}

${this.buildTrendsSection(richContext.dashboardData)}`;
  }
  
  private static buildMetricsSection(dashboardData?: DashboardData): string {
    if (!dashboardData?.metrics) {
      return '📊 **MÉTRICAS:** No disponibles';
    }
    
    const metrics = dashboardData.metrics;
    return `📊 **MÉTRICAS GENERALES:**
• Total empleados: ${metrics.totalEmployees || 0}
• Empleados activos: ${metrics.activeEmployees || 0}
• Nómina mensual: $${metrics.monthlyPayroll?.toLocaleString() || '0'}
• Nóminas pendientes: ${metrics.pendingPayroll || 0}`;
  }
  
  private static buildEmployeeSection(employeeData?: EmployeeData): string {
    if (!employeeData || !employeeData.allEmployees?.length) {
      return '👥 **EMPLEADOS:** No hay información disponible';
    }
    
    const avgSalary = Math.round(employeeData.avgSalary || 0);
    let section = `👥 **EMPLEADOS (${employeeData.totalCount || 0} total):**
• Salario promedio: $${avgSalary.toLocaleString()}
• Empleados inactivos: ${employeeData.inactiveCount || 0}`;
    
    // Add employee list (limit to 10 for readability)
    if (employeeData.allEmployees.length > 0) {
      section += '\n\n📋 **LISTA DE EMPLEADOS:**';
      const displayEmployees = employeeData.allEmployees.slice(0, 10);
      displayEmployees.forEach(emp => {
        section += `\n• ${emp.name} | ${emp.position} | ${emp.department} | $${emp.salary?.toLocaleString() || 'N/A'}`;
      });
      
      if (employeeData.allEmployees.length > 10) {
        section += `\n• ... y ${employeeData.allEmployees.length - 10} empleados más`;
      }
    }
    
    // Add department breakdown
    if (employeeData.byDepartment) {
      section += '\n\n🏢 **POR DEPARTAMENTO:**';
      Object.entries(employeeData.byDepartment).forEach(([dept, info]) => {
        section += `\n• ${dept}: ${info.count} empleados ($${info.totalSalary?.toLocaleString()})`;
      });
    }
    
    // Add recent hires
    if (employeeData.recentHires?.length) {
      section += '\n\n🆕 **CONTRATACIONES RECIENTES:**';
      employeeData.recentHires.slice(0, 5).forEach(hire => {
        section += `\n• ${hire.name} (${hire.position}) - ${hire.hireDate}`;
      });
    }
    
    return section;
  }
  
  private static buildTrendsSection(dashboardData?: DashboardData): string {
    if (!dashboardData?.payrollTrends?.length) {
      return '📈 **TENDENCIAS:** No disponibles';
    }
    
    let section = '📈 **TENDENCIAS DE NÓMINA:**';
    dashboardData.payrollTrends.slice(0, 6).forEach(trend => {
      const avg = Math.round(trend.avgPerEmployee || 0);
      section += `\n• ${trend.month}: $${trend.total?.toLocaleString()} (${trend.employeeCount} emp, prom: $${avg.toLocaleString()})`;
    });
    
    if (dashboardData.efficiencyMetrics?.length) {
      section += '\n\n⚡ **EFICIENCIA:**';
      dashboardData.efficiencyMetrics.slice(0, 3).forEach(metric => {
        const change = metric.change > 0 ? `+${metric.change}` : metric.change;
        section += `\n• ${metric.metric}: ${metric.value}${metric.unit} (${change}%)`;
      });
    }
    
    if (dashboardData.recentActivity?.length) {
      section += '\n\n🕐 **ACTIVIDAD RECIENTE:**';
      dashboardData.recentActivity.slice(0, 3).forEach(activity => {
        section += `\n• ${activity.action} por ${activity.user} (${activity.type})`;
      });
    }
    
    return section;
  }
  
  static extractEmployeeFromContext(richContext?: RichContext, employeeName?: string): any {
    if (!richContext?.employeeData?.allEmployees || !employeeName) {
      return null;
    }
    
    const searchName = employeeName.toLowerCase();
    return richContext.employeeData.allEmployees.find(emp => 
      emp.name.toLowerCase().includes(searchName) ||
      searchName.includes(emp.name.toLowerCase())
    );
  }
  
  static getAvailableEmployeeNames(richContext?: RichContext): string[] {
    if (!richContext?.employeeData?.allEmployees) {
      return [];
    }
    
    return richContext.employeeData.allEmployees.map(emp => emp.name);
  }
  
  static buildContextString(data: any): string {
    const { phase, employeeCount, periodName, hasErrors, validationResults, errorType } = data;
    let contextStr = `Fase: ${phase}`;
    if (periodName) contextStr += `, Período: ${periodName}`;
    if (employeeCount) contextStr += `, Empleados: ${employeeCount}`;
    if (hasErrors) contextStr += `, Estado: Con errores`;
    if (validationResults) contextStr += `, Validación: ${validationResults.hasIssues ? 'Con problemas' : 'Exitosa'}`;
    if (errorType) contextStr += `, Tipo error: ${errorType}`;
    return contextStr;
  }
}