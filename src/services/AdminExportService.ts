import * as XLSX from 'xlsx';
import { CompanyWithSubscription, SaaSMetrics, SubscriptionEvent } from '@/services/SuperAdminService';

const downloadWorkbook = (wb: XLSX.WorkBook, fileName: string) => {
  XLSX.writeFile(wb, fileName);
};

export const AdminExportService = {
  exportCompaniesToExcel(companies: CompanyWithSubscription[]) {
    const data = companies.map(c => ({
      'Razón Social': c.razon_social,
      'NIT': c.nit,
      'Email': c.email,
      'Plan': c.subscription?.plan_type || c.plan || 'N/A',
      'Estado': c.subscription?.status || c.estado || 'N/A',
      'Empleados': c.employee_count,
      'Máx Empleados': c.subscription?.max_employees ?? 'N/A',
      'Máx Nóminas/Mes': c.subscription?.max_payrolls_per_month ?? 'N/A',
      'Trial Expira': c.subscription?.trial_ends_at
        ? new Date(c.subscription.trial_ends_at).toLocaleDateString('es-CO')
        : '—',
      'Fecha Registro': new Date(c.created_at).toLocaleDateString('es-CO'),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    downloadWorkbook(wb, `empresas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportSubscriptionEventsToExcel(events: SubscriptionEvent[]) {
    const data = events.map(e => ({
      'Empresa': e.company_name || 'Desconocida',
      'Plan Anterior': e.previous_plan || 'N/A',
      'Nuevo Plan': e.new_plan,
      'Estado Anterior': e.previous_status || 'N/A',
      'Nuevo Estado': e.new_status,
      'Razón': e.reason,
      'Fecha': new Date(e.created_at).toLocaleString('es-CO'),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Eventos');
    downloadWorkbook(wb, `eventos_suscripcion_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportDashboardMetricsToExcel(metrics: SaaSMetrics) {
    const kpis = [
      { 'Métrica': 'Total Empresas', 'Valor': metrics.totalCompanies },
      { 'Métrica': 'Activas', 'Valor': metrics.activeCompanies },
      { 'Métrica': 'En Trial', 'Valor': metrics.trialCompanies },
      { 'Métrica': 'Suspendidas', 'Valor': metrics.suspendedCompanies },
      { 'Métrica': 'Total Empleados', 'Valor': metrics.totalEmployees },
      { 'Métrica': 'MRR', 'Valor': metrics.mrr },
      { 'Métrica': 'Trials por Vencer', 'Valor': metrics.expiringTrials },
      { 'Métrica': 'Churn Rate (%)', 'Valor': metrics.churnRate ?? 0 },
      { 'Métrica': 'ARPU', 'Valor': metrics.arpu ?? 0 },
      { 'Métrica': 'Conversión Trial→Pago (%)', 'Valor': metrics.trialConversion ?? 0 },
    ];
    const wsKpis = XLSX.utils.json_to_sheet(kpis);
    const wsPlan = XLSX.utils.json_to_sheet(metrics.planDistribution.map(p => ({
      'Plan': p.name, 'Empresas': p.value,
    })));
    const wsRevenue = XLSX.utils.json_to_sheet((metrics.revenuePerPlan || []).map(p => ({
      'Plan': p.name, 'Revenue': p.revenue,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsKpis, 'KPIs');
    XLSX.utils.book_append_sheet(wb, wsPlan, 'Distribución');
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue por Plan');
    downloadWorkbook(wb, `metricas_dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportBillingToExcel(records: any[], period: string) {
    const data = records.map(r => ({
      'Empresa': r.company_name || r.company_id,
      'Plan': r.plan_type || 'N/A',
      'Monto': r.amount,
      'Estado': r.status,
      'Vencimiento': r.due_date,
      'Fecha Pago': r.paid_at ? new Date(r.paid_at).toLocaleDateString('es-CO') : '—',
      'Método': r.payment_method || '—',
      'Referencia': r.payment_reference || '—',
      'Notas': r.notes || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturación');
    downloadWorkbook(wb, `facturacion_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },
};
