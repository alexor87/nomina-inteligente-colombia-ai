// ============================================================================
// MAYA Response Builder - Professional Architecture
// ============================================================================

import { HandlerResponse, EmotionalState, ExecutableAction } from './types.ts';

export class ResponseBuilder {
  
  static buildExecutableResponse(
    message: string, 
    actions: ExecutableAction[], 
    emotionalState: EmotionalState = 'neutral'
  ): HandlerResponse {
    return {
      hasExecutableAction: true,
      response: this.formatMessage(message),
      actions,
      emotionalState,
      requiresFollowUp: false
    };
  }
  
  static buildConversationalResponse(
    message: string, 
    emotionalState: EmotionalState = 'neutral'
  ): HandlerResponse {
    return {
      hasExecutableAction: false,
      response: this.formatMessage(message),
      emotionalState,
      requiresFollowUp: false
    };
  }
  
  static buildErrorResponse(
    message: string, 
    suggestion?: string
  ): HandlerResponse {
    let fullMessage = `❌ **ERROR:** ${message}`;
    if (suggestion) {
      fullMessage += `\n\n💡 **SUGERENCIA:** ${suggestion}`;
    }
    
    return {
      hasExecutableAction: false,
      response: this.formatMessage(fullMessage),
      emotionalState: 'concerned',
      requiresFollowUp: true
    };
  }
  
  static buildClarificationResponse(
    question: string, 
    options?: string[]
  ): HandlerResponse {
    let message = `🤔 ${question}`;
    
    if (options && options.length > 0) {
      message += '\n\n**Opciones disponibles:**';
      options.forEach((option, index) => {
        message += `\n${index + 1}. ${option}`;
      });
    }
    
    return {
      hasExecutableAction: false,
      response: this.formatMessage(message),
      emotionalState: 'thinking',
      requiresFollowUp: true
    };
  }
  
  static buildSuccessResponse(
    message: string, 
    nextSteps?: string[]
  ): HandlerResponse {
    let fullMessage = `✅ ${message}`;
    
    if (nextSteps && nextSteps.length > 0) {
      fullMessage += '\n\n**Siguientes pasos:**';
      nextSteps.forEach((step, index) => {
        fullMessage += `\n${index + 1}. ${step}`;
      });
    }
    
    return {
      hasExecutableAction: false,
      response: this.formatMessage(fullMessage),
      emotionalState: 'celebrating',
      requiresFollowUp: false
    };
  }
  
  static buildProgressResponse(
    message: string, 
    progress?: number
  ): HandlerResponse {
    let fullMessage = `⏳ ${message}`;
    
    if (progress !== undefined) {
      const progressBar = this.createProgressBar(progress);
      fullMessage += `\n\n${progressBar} ${Math.round(progress)}%`;
    }
    
    return {
      hasExecutableAction: false,
      response: this.formatMessage(fullMessage),
      emotionalState: 'analyzing',
      requiresFollowUp: false
    };
  }
  
  private static formatMessage(message: string): string {
    // Ensure proper spacing and formatting
    return message
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/\s{2,}/g, ' ') // Remove excessive spaces
      .trim();
  }
  
  private static createProgressBar(progress: number): string {
    const total = 10;
    const filled = Math.round((progress / 100) * total);
    const empty = total - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
  
  // Template Messages
  static readonly Messages = {
    EMPLOYEE_NOT_FOUND: (query: string) => 
      `No pude encontrar ningún empleado con "${query}". ¿Podrías verificar el nombre?`,
    
    MULTIPLE_EMPLOYEES_FOUND: (employees: string[]) => 
      `Encontré varios empleados. ¿Te refieres a alguno de estos?\n${employees.map((name, i) => `${i + 1}. ${name}`).join('\n')}`,
    
    PERIOD_NOT_SPECIFIED: () => 
      '¿Para qué período necesitas el desprendible? Por ejemplo: "enero 2024" o "período actual"',
    
    CONFIRMATION_REQUIRED: (action: string) => 
      `⚠️ Esta acción ${action} es irreversible. ¿Estás seguro de continuar?`,
    
    PROCESSING_STARTED: (action: string) => 
      `🚀 Iniciando ${action}... Te notificaré cuando termine.`,
    
    INSUFFICIENT_DATA: (missing: string[]) => 
      `Necesito más información para continuar:\n${missing.map(item => `• ${item}`).join('\n')}`,
    
    FEATURE_NOT_AVAILABLE: (feature: string) => 
      `La funcionalidad "${feature}" aún no está disponible. ¿Hay algo más en lo que pueda ayudarte?`,
    
    GENERIC_ERROR: () => 
      'Disculpa, ocurrió un error inesperado. Por favor intenta de nuevo o contacta soporte técnico.',

    DATA_INSIGHTS_INTRO: (metric: string) =>
      `📊 Analicemos ${metric} de tu empresa...`,

    QUERY_EXECUTING: () =>
      '🔍 Consultando la base de datos...',

    NO_DATA_FOUND: (query: string) =>
      `No encontré datos para "${query}". ¿Quieres que ajuste los criterios de búsqueda?`,

    VISUAL_DATA_READY: (recordCount: number) =>
      `✨ Encontré ${recordCount} registros. Aquí tienes el análisis visual:`
  };
  
  // Common Action Builders
  static createVoucherAction(employeeId: string, employeeName: string, periodId?: string, periodName?: string): ExecutableAction {
    return {
      id: `send_voucher_${employeeId}_${Date.now()}`,
      type: 'send_voucher',
      label: `Enviar desprendible a ${employeeName}`,
      description: `Generar y enviar desprendible de nómina${periodName ? ` del ${periodName}` : ''}`,
      parameters: {
        employeeId,
        employeeName,
        email: undefined, // Will be filled by executor
        periodId,
        periodName
      },
      requiresConfirmation: false,
      icon: '📄'
    };
  }
  
  static createMassVoucherAction(employeeCount: number, periodId?: string, periodName?: string): ExecutableAction {
    return {
      id: `send_voucher_all_${Date.now()}`,
      type: 'send_voucher_all',
      label: `Enviar desprendibles masivos (${employeeCount} empleados)`,
      description: `Generar y enviar desprendibles a todos los empleados${periodName ? ` del ${periodName}` : ''}`,
      parameters: {
        periodId,
        periodName,
        employeeCount
      },
      requiresConfirmation: true,
      icon: '📧'
    };
  }
  
  static createSearchAction(query: string, filter?: string): ExecutableAction {
    return {
      id: `search_employee_${Date.now()}`,
      type: 'search_employee',
      label: `Buscar empleado: "${query}"`,
      description: `Buscar información de empleado${filter ? ` por ${filter}` : ''}`,
      parameters: {
        query,
        filter: filter || 'name'
      },
      requiresConfirmation: false,
      icon: '🔍'
    };
  }

  // New 2027 Conversational UI Action Creators
  static createInlinePeriodAction(employeeId: string, employeeName: string, periodId: string, periodName: string, isPrimary: boolean = false): ExecutableAction {
    return {
      id: `send_voucher_${employeeId}_${periodId}_${Date.now()}`,
      type: 'send_voucher',
      label: isPrimary ? `${periodName} (sugerido)` : periodName,
      description: `Generar desprendible para ${periodName}`,
      parameters: {
        employeeId,
        employeeName,
        periodId,
        periodName
      },
      requiresConfirmation: false,
      icon: '📄'
    };
  }

  static createExpandPeriodsAction(employeeId: string, employeeName: string): ExecutableAction {
    return {
      id: `expand_periods_${employeeId}_${Date.now()}`,
      type: 'expand_periods',
      label: 'Ver más períodos',
      description: `Mostrar períodos adicionales para ${employeeName}`,
      parameters: {
        employeeId,
        employeeName
      },
      requiresConfirmation: false,
      icon: '📅'
    };
  }

  static buildSmartExpansionResponse(employeeName: string, periodActions: ExecutableAction[]): HandlerResponse {
    const message = `Aquí tienes más opciones para **${employeeName}**:`;
    
    return {
      hasExecutableAction: true,
      response: this.formatMessage(message),
      actions: periodActions,
      emotionalState: 'helpful',
      requiresFollowUp: false
    };
  }

  // Advanced Data Visualization Response Builders
  static buildDataAnalysisResponse(
    title: string,
    insights: string[],
    visualData?: any,
    emotionalState: EmotionalState = 'analyzing'
  ): HandlerResponse {
    let message = `📊 **${title}**\n\n`;
    
    insights.forEach((insight, index) => {
      message += `${index + 1}. ${insight}\n`;
    });

    if (visualData) {
      message += '\n🎯 **Datos clave encontrados** - ver visualización abajo';
    }

    return {
      hasExecutableAction: false,
      response: this.formatMessage(message),
      emotionalState,
      requiresFollowUp: false
    };
  }

  static buildMetricsResponse(
    title: string,
    metrics: Array<{label: string, value: any, unit?: string, change?: number}>,
    emotionalState: EmotionalState = 'celebrating'
  ): HandlerResponse {
    let message = `📈 **${title}**\n\n`;

    metrics.forEach(metric => {
      const changeIcon = metric.change ? (metric.change > 0 ? '📈' : '📉') : '';
      const changeText = metric.change ? ` (${metric.change > 0 ? '+' : ''}${metric.change.toFixed(1)}%)` : '';
      const unit = metric.unit ? ` ${metric.unit}` : '';
      
      message += `▶️ **${metric.label}:** ${metric.value}${unit} ${changeIcon}${changeText}\n`;
    });

    return {
      hasExecutableAction: false,
      response: this.formatMessage(message),
      emotionalState,
      requiresFollowUp: false
    };
  }

  static buildChartResponse(
    title: string, 
    description: string,
    chartType: 'bar' | 'line' | 'pie' = 'bar',
    emotionalState: EmotionalState = 'helpful'
  ): HandlerResponse {
    const chartIcon = chartType === 'pie' ? '🥧' : chartType === 'line' ? '📈' : '📊';
    const message = `${chartIcon} **${title}**\n\n${description}`;

    return {
      hasExecutableAction: false,
      response: this.formatMessage(message),
      emotionalState,
      requiresFollowUp: false
    };
  }

  static buildQueryProcessingResponse(queryType: string): HandlerResponse {
    const message = `🔍 Analizando ${queryType}... un momento por favor`;

    return {
      hasExecutableAction: false,
      response: message,
      emotionalState: 'analyzing',
      requiresFollowUp: false
    };
  }

  // Confirm Voucher Send with explicit email
  static createConfirmVoucherAction(
    employeeId: string, 
    employeeName: string, 
    email: string,
    periodId?: string, 
    periodName?: string
  ): ExecutableAction {
    return {
      id: `confirm_send_voucher_${employeeId}_${Date.now()}`,
      type: 'confirm_send_voucher',
      label: `Sí, enviar a ${email}`,
      description: `Enviar comprobante${periodName ? ` del ${periodName}` : ''} al email ${email}`,
      parameters: {
        employeeId,
        employeeName,
        email,
        periodId,
        periodName
      },
      requiresConfirmation: false,
      icon: '📧'
    };
  }

  // ============================================================================
  // QUICK REPLIES SUPPORT (2028 UX Pattern)
  // ============================================================================

  static buildQuickReplyResponse(
    question: string,
    fieldName: string,
    options: any[],
    conversationState?: Record<string, any>,
    emotionalState: EmotionalState = 'thinking'
  ): any {
    return {
      hasExecutableAction: false,
      response: this.formatMessage(`🤔 ${question}`),
      quickReplies: options,
      fieldName,
      conversationState,
      emotionalState,
      requiresFollowUp: true
    };
  }

  static readonly StructuredFields = {
    tipoDocumento: {
      question: '¿Qué tipo de documento tiene el empleado?',
      options: [
        { value: 'CC', label: 'Cédula de Ciudadanía', icon: '🪪' },
        { value: 'CE', label: 'Cédula de Extranjería', icon: '🌍' },
        { value: 'TI', label: 'Tarjeta de Identidad', icon: '👶' },
        { value: 'PA', label: 'Pasaporte', icon: '✈️' },
        { value: 'RC', label: 'Registro Civil', icon: '📋' },
        { value: 'NIT', label: 'NIT', icon: '🏢' }
      ]
    },
    tipoContrato: {
      question: '¿Qué tipo de contrato tendrá?',
      options: [
        { value: 'indefinido', label: 'Indefinido', icon: '♾️' },
        { value: 'fijo', label: 'Término Fijo', icon: '📅' },
        { value: 'obra', label: 'Obra o Labor', icon: '🏗️' },
        { value: 'aprendizaje', label: 'Aprendizaje', icon: '🎓' }
      ]
    },
    periodicidadPago: {
      question: '¿Con qué frecuencia se le pagará?',
      options: [
        { value: 'quincenal', label: 'Quincenal', icon: '📆' },
        { value: 'mensual', label: 'Mensual', icon: '📅' }
      ]
    }
  };
}