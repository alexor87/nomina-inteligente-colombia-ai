import { GuidedFlow, FlowType, FlowStepType } from '../types/GuidedFlow';

export const reportsGenerationFlow: GuidedFlow = {
  id: FlowType.REPORTS_GENERATE,
  name: 'Generación de Reportes',
  description: 'Genera reportes con insights automáticos',
  icon: '📊',
  initialStep: 'greeting',
  completedStep: 'result',
  steps: {
    greeting: {
      id: 'greeting',
      type: FlowStepType.GREETING,
      dataKey: 'report_type',
      message: '📊 ¡Perfecto! Voy a ayudarte a generar un reporte con insights automáticos.\n\n¿Qué tipo de reporte necesitas?',
      quickReplies: [
        { label: '💰 Resumen de nómina', value: 'payroll_summary', icon: '💰' },
        { label: '📈 Costos laborales', value: 'labor_cost', icon: '📈' },
        { label: '🏥 Seguridad social', value: 'social_security', icon: '🏥' },
        { label: '📋 Historial de novedades', value: 'novelty_history', icon: '📋' }
      ],
      nextStep: 'period_selection',
      canGoBack: false
    },
    period_selection: {
      id: 'period_selection',
      type: FlowStepType.SELECT,
      dataKey: 'period',
      message: (data) => `Excelente, vamos a generar un reporte de **${data.report_type}**.\n\n¿De qué período?`,
      quickReplies: (data) => {
        const now = new Date();
        const currentMonth = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        
        return [
          { label: `📅 ${currentMonth}`, value: 'current_month', icon: '📅' },
          { label: `📆 ${lastMonth}`, value: 'last_month', icon: '📆' },
          { label: '📊 Trimestre actual', value: 'current_quarter', icon: '📊' },
          { label: '📈 Año actual', value: 'current_year', icon: '📈' },
          { label: '🔧 Personalizado', value: 'custom', icon: '🔧' }
        ];
      },
      nextStep: (data, input) => {
        return input === 'custom' ? 'custom_period' : 'additional_filters';
      },
      canGoBack: true
    },
    custom_period: {
      id: 'custom_period',
      type: FlowStepType.INPUT,
      dataKey: 'period',
      message: '📅 Indícame el período en lenguaje natural.\n\nEjemplos:\n- "Enero a marzo 2024"\n- "Últimos 6 meses"\n- "Q1 2024"',
      inputPlaceholder: 'Ej: Enero a marzo 2024',
      inputType: 'text',
      nextStep: 'additional_filters',
      canGoBack: true
    },
    additional_filters: {
      id: 'additional_filters',
      type: FlowStepType.SELECT,
      dataKey: 'filter_type',
      message: '🎯 ¿Quieres aplicar filtros adicionales?',
      quickReplies: [
        { label: '👥 Por empleados', value: 'employees', icon: '👥' },
        { label: '🏢 Por centro de costos', value: 'cost_center', icon: '🏢' },
        { label: '📝 Por tipo de contrato', value: 'contract_type', icon: '📝' },
        { label: '✅ Sin filtros, continuar', value: 'none', icon: '✅' }
      ],
      nextStep: (data, input) => {
        if (input === 'none') return 'preview';
        return 'filter_selection';
      },
      canGoBack: true,
      canSkip: true,
      skipToStep: 'preview'
    },
    filter_selection: {
      id: 'filter_selection',
      type: FlowStepType.INPUT,
      dataKey: 'filter_values',
      message: (data) => {
        const filterLabels: Record<string, string> = {
          employees: '👥 Escribe los nombres de los empleados separados por coma',
          cost_center: '🏢 Escribe los centros de costos separados por coma',
          contract_type: '📝 Escribe los tipos de contrato separados por coma'
        };
        return filterLabels[data.filter_type] || 'Ingresa los filtros';
      },
      inputPlaceholder: 'Ej: Juan Pérez, María López',
      inputType: 'text',
      nextStep: 'preview',
      canGoBack: true
    },
    preview: {
      id: 'preview',
      type: FlowStepType.PREVIEW,
      message: (data) => {
        const reportLabels: Record<string, string> = {
          payroll_summary: 'Resumen de nómina',
          labor_cost: 'Costos laborales',
          social_security: 'Seguridad social',
          novelty_history: 'Historial de novedades'
        };
        
        const filterInfo = data.filter_type && data.filter_values
          ? `${data.filter_type}: ${data.filter_values}`
          : 'Ninguno';
        
        return `📋 **Resumen del reporte:**\n\n` +
               `• **Tipo:** ${reportLabels[data.report_type] || data.report_type}\n` +
               `• **Período:** ${data.period}\n` +
               `• **Filtros:** ${filterInfo}\n\n` +
               `¿Generar el reporte con análisis automático?`;
      },
      quickReplies: [
        { label: '✅ Sí, generar', value: 'confirm', icon: '✅' },
        { label: '✏️ Modificar', value: 'back', icon: '✏️' },
        { label: '❌ Cancelar', value: 'cancel', icon: '❌' }
      ],
      nextStep: (data, input) => {
        if (input === 'confirm') return 'execution';
        if (input === 'back') return 'greeting';
        return 'result';
      },
      canGoBack: true
    },
    execution: {
      id: 'execution',
      type: FlowStepType.EXECUTION,
      message: '⚙️ Generando reporte y analizando datos...\n\nEsto tomará unos segundos.',
      nextStep: 'result',
      canGoBack: false
    },
    result: {
      id: 'result',
      type: FlowStepType.RESULT,
      message: (data) => {
        if (!data.success) {
          return `❌ No pude generar el reporte.\n\n${data.error || 'Ocurrió un error inesperado.'}`;
        }

        return `✅ **Reporte generado exitosamente**\n\n` +
               `📊 **${data.reportTitle}**\n` +
               `${data.summary || ''}\n\n` +
               `🎯 **Insights principales:**\n${data.insights || 'Analizando datos...'}\n\n` +
               `¿Qué quieres hacer ahora?`;
      },
      quickReplies: (data) => {
        if (!data.success) {
          return [
            { label: '🔄 Intentar de nuevo', value: 'retry', icon: '🔄' },
            { label: '🏠 Volver al inicio', value: 'home', icon: '🏠' }
          ];
        }

        return [
          { label: '📥 Exportar Excel', value: 'export_excel', icon: '📥' },
          { label: '📄 Exportar PDF', value: 'export_pdf', icon: '📄' },
          { label: '🔍 Ver detalle', value: 'view_detail', icon: '🔍' },
          { label: '📈 Comparar períodos', value: 'compare', icon: '📈' },
          { label: '🔧 Otro reporte', value: 'new', icon: '🔧' }
        ];
      },
      nextStep: (data, input) => {
        if (input === 'retry' || input === 'new') return 'greeting';
        return 'result'; // Stay on result for actions
      },
      canGoBack: false
    }
  }
};
