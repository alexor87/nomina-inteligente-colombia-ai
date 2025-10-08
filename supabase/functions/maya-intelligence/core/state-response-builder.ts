/**
 * ✅ STATE RESPONSE BUILDER - Enterprise-Grade Response Construction
 * 
 * Construye respuestas contextuales basadas en el estado actual
 * Genera Quick Replies, mensajes y executable actions apropiados
 * 
 * @version 2.0.0
 * @phase Phase-1-Infrastructure
 */

import { ConversationState, FlowType, ConversationContext, ConversationStateManager } from './conversation-state-manager.ts';
import { HandlerResponse, EmotionalState, ExecutableAction } from './types.ts';

/**
 * Opción de respuesta rápida
 */
export interface QuickReplyOption {
  value: string;
  label: string;
  icon?: string;
}

/**
 * Mensajes predefinidos por estado
 */
const STATE_MESSAGES: Record<ConversationState, string> = {
  // Estados generales
  [ConversationState.IDLE]: '👋 ¿En qué puedo ayudarte hoy?',
  [ConversationState.ERROR]: '❌ Ha ocurrido un error. ¿Quieres intentarlo de nuevo?',

  // Employee Create Flow
  [ConversationState.EMPLOYEE_CREATE_START]: '👤 Perfecto, voy a ayudarte a crear un nuevo empleado.',
  [ConversationState.AWAITING_EMPLOYEE_NAME]: '📝 ¿Cuál es el nombre completo del empleado?',
  [ConversationState.AWAITING_DOC_TYPE]: '📋 Entendido, vamos a registrar a **{employeeName}**. ¿Qué tipo de documento tiene?',
  [ConversationState.AWAITING_ID_NUMBER]: '🆔 ¿Cuál es el número de {tipoDocumento}?',
  [ConversationState.AWAITING_CONTRACT_TYPE]: '📄 ¿Qué tipo de contrato tendrá **{employeeName}**?',
  [ConversationState.AWAITING_PAYMENT_FREQUENCY]: '📅 ¿Con qué periodicidad se le pagará?',
  [ConversationState.AWAITING_SALARY]: '💰 ¿Cuál será el salario base de **{employeeName}**?',
  [ConversationState.AWAITING_POSITION]: '💼 ¿Cuál será el cargo de **{employeeName}**?',
  [ConversationState.EMPLOYEE_CREATE_READY]: '✅ Perfecto! Tengo toda la información necesaria para crear a **{employeeName}**.',

  // Employee Update Flow
  [ConversationState.EMPLOYEE_UPDATE_START]: '✏️ Voy a ayudarte a actualizar la información de un empleado.',
  [ConversationState.AWAITING_EMPLOYEE_IDENTIFIER]: '🔍 ¿Qué empleado deseas actualizar?',
  [ConversationState.AWAITING_UPDATE_FIELD]: '📝 ¿Qué campo deseas actualizar de **{employeeName}**?',
  [ConversationState.AWAITING_UPDATE_VALUE]: '💾 ¿Cuál es el nuevo valor para {fieldToUpdate}?',
  [ConversationState.EMPLOYEE_UPDATE_READY]: '✅ Perfecto! Voy a actualizar {fieldToUpdate} de **{employeeName}**.',

  // Employee Delete Flow
  [ConversationState.EMPLOYEE_DELETE_START]: '🗑️ Voy a ayudarte a eliminar un empleado.',
  [ConversationState.EMPLOYEE_DELETE_CONFIRM]: '⚠️ ¿Estás seguro de que deseas eliminar a **{employeeName}**? Esta acción no se puede deshacer.',
  [ConversationState.EMPLOYEE_DELETE_READY]: '✅ Empleado **{employeeName}** eliminado correctamente.',

  // Voucher Flow
  [ConversationState.VOUCHER_START]: '📧 Voy a ayudarte a enviar un comprobante de nómina.',
  [ConversationState.VOUCHER_IDENTIFY_EMPLOYEE]: '👤 ¿A qué empleado deseas enviarle el comprobante?',
  [ConversationState.VOUCHER_IDENTIFY_PERIOD]: '📅 ¿De qué período es el comprobante?',
  [ConversationState.VOUCHER_CONFIRM_EMAIL]: '📧 ¿A qué correo deseas enviar el comprobante de **{employeeName}**?',
  [ConversationState.VOUCHER_READY]: '✅ Comprobante enviado correctamente a **{email}**.',

  // Payroll Flow
  [ConversationState.PAYROLL_LIQUIDATE_START]: '💼 Voy a ayudarte a liquidar la nómina.',
  [ConversationState.PAYROLL_IDENTIFY_PERIOD]: '📅 ¿Qué período deseas liquidar?',
  [ConversationState.PAYROLL_CONFIRM_EMPLOYEES]: '👥 ¿Deseas liquidar todos los empleados del período **{periodName}**?',
  [ConversationState.PAYROLL_LIQUIDATE_READY]: '✅ La nómina del período **{periodName}** está lista para liquidar.',

  // Vacation Flow
  [ConversationState.VACATION_REGISTER_START]: '🏖️ Voy a ayudarte a registrar vacaciones.',
  [ConversationState.VACATION_IDENTIFY_EMPLOYEE]: '👤 ¿A qué empleado deseas registrarle vacaciones?',
  [ConversationState.VACATION_IDENTIFY_DATES]: '📅 ¿Cuáles son las fechas de las vacaciones de **{employeeName}**?',
  [ConversationState.VACATION_REGISTER_READY]: '✅ Vacaciones registradas correctamente para **{employeeName}**.'
};

/**
 * Quick Replies por estado
 */
const STATE_QUICK_REPLIES: Record<ConversationState, QuickReplyOption[]> = {
  // Estados sin quick replies (texto libre)
  [ConversationState.IDLE]: [],
  [ConversationState.ERROR]: [
    { value: 'reintentar', label: 'Reintentar', icon: '🔄' },
    { value: 'cancelar', label: 'Cancelar', icon: '❌' }
  ],

  // Employee Create
  [ConversationState.EMPLOYEE_CREATE_START]: [],
  [ConversationState.AWAITING_EMPLOYEE_NAME]: [],
  [ConversationState.AWAITING_DOC_TYPE]: [
    { value: 'CC', label: 'Cédula de Ciudadanía', icon: '🆔' },
    { value: 'CE', label: 'Cédula de Extranjería', icon: '🌍' },
    { value: 'TI', label: 'Tarjeta de Identidad', icon: '🎫' },
    { value: 'PA', label: 'Pasaporte', icon: '📘' },
    { value: 'NIT', label: 'NIT', icon: '🏢' }
  ],
  [ConversationState.AWAITING_ID_NUMBER]: [],
  [ConversationState.AWAITING_CONTRACT_TYPE]: [
    { value: 'indefinido', label: 'Indefinido', icon: '♾️' },
    { value: 'término fijo', label: 'Término Fijo', icon: '📅' },
    { value: 'obra o labor', label: 'Obra o Labor', icon: '🔨' },
    { value: 'aprendizaje', label: 'Aprendizaje', icon: '🎓' },
    { value: 'prestación de servicios', label: 'Prestación de Servicios', icon: '🤝' }
  ],
  [ConversationState.AWAITING_PAYMENT_FREQUENCY]: [
    { value: 'quincenal', label: 'Quincenal', icon: '📅' },
    { value: 'mensual', label: 'Mensual', icon: '📆' }
  ],
  [ConversationState.AWAITING_SALARY]: [],
  [ConversationState.AWAITING_POSITION]: [],
  [ConversationState.EMPLOYEE_CREATE_READY]: [
    { value: 'confirmar', label: 'Confirmar', icon: '✅' },
    { value: 'cancelar', label: 'Cancelar', icon: '❌' }
  ],

  // Employee Update
  [ConversationState.EMPLOYEE_UPDATE_START]: [],
  [ConversationState.AWAITING_EMPLOYEE_IDENTIFIER]: [],
  [ConversationState.AWAITING_UPDATE_FIELD]: [
    { value: 'salario', label: 'Salario', icon: '💰' },
    { value: 'cargo', label: 'Cargo', icon: '💼' },
    { value: 'contrato', label: 'Tipo de Contrato', icon: '📄' },
    { value: 'periodicidad', label: 'Periodicidad de Pago', icon: '📅' }
  ],
  [ConversationState.AWAITING_UPDATE_VALUE]: [],
  [ConversationState.EMPLOYEE_UPDATE_READY]: [
    { value: 'confirmar', label: 'Confirmar', icon: '✅' },
    { value: 'cancelar', label: 'Cancelar', icon: '❌' }
  ],

  // Employee Delete
  [ConversationState.EMPLOYEE_DELETE_START]: [],
  [ConversationState.EMPLOYEE_DELETE_CONFIRM]: [
    { value: 'confirmar', label: 'Sí, eliminar', icon: '✅' },
    { value: 'cancelar', label: 'No, cancelar', icon: '❌' }
  ],
  [ConversationState.EMPLOYEE_DELETE_READY]: [],

  // Voucher
  [ConversationState.VOUCHER_START]: [],
  [ConversationState.VOUCHER_IDENTIFY_EMPLOYEE]: [],
  [ConversationState.VOUCHER_IDENTIFY_PERIOD]: [],
  [ConversationState.VOUCHER_CONFIRM_EMAIL]: [],
  [ConversationState.VOUCHER_READY]: [],

  // Payroll
  [ConversationState.PAYROLL_LIQUIDATE_START]: [],
  [ConversationState.PAYROLL_IDENTIFY_PERIOD]: [],
  [ConversationState.PAYROLL_CONFIRM_EMPLOYEES]: [
    { value: 'todos', label: 'Todos los empleados', icon: '👥' },
    { value: 'seleccionar', label: 'Seleccionar empleados', icon: '✅' }
  ],
  [ConversationState.PAYROLL_LIQUIDATE_READY]: [
    { value: 'confirmar', label: 'Liquidar Nómina', icon: '✅' },
    { value: 'cancelar', label: 'Cancelar', icon: '❌' }
  ],

  // Vacation
  [ConversationState.VACATION_REGISTER_START]: [],
  [ConversationState.VACATION_IDENTIFY_EMPLOYEE]: [],
  [ConversationState.VACATION_IDENTIFY_DATES]: [],
  [ConversationState.VACATION_REGISTER_READY]: [
    { value: 'confirmar', label: 'Confirmar', icon: '✅' },
    { value: 'cancelar', label: 'Cancelar', icon: '❌' }
  ]
};

/**
 * Constructor de respuestas basado en estado
 */
export class StateResponseBuilder {

  /**
   * Construir respuesta completa para un estado
   */
  static buildStateResponse(
    state: ConversationState,
    context: ConversationContext,
    additionalMessage?: string
  ): HandlerResponse {
    const message = this.buildPromptMessage(state, context);
    const quickReplies = this.buildQuickRepliesForState(state, context);
    const emotionalState = this.getEmotionalStateForState(state);
    
    let response: HandlerResponse = {
      response: additionalMessage ? `${additionalMessage}\n\n${message}` : message,
      emotionalState,
      requiresFollowUp: !this.isTerminalState(state),
      conversationState: ConversationStateManager.serialize(context)
    };

    // Agregar quick replies si existen
    if (quickReplies.length > 0) {
      response.quickReplies = quickReplies;
    }

    // Si es estado READY, agregar executable action
    if (this.isReadyState(state)) {
      response.actions = [this.buildExecutableActionFromContext(context.flowType, context)];
    }

    return response;
  }

  /**
   * Construir Quick Replies para un estado
   */
  static buildQuickRepliesForState(
    state: ConversationState,
    context: ConversationContext
  ): QuickReplyOption[] {
    return STATE_QUICK_REPLIES[state] || [];
  }

  /**
   * Construir mensaje de prompt
   */
  static buildPromptMessage(
    state: ConversationState,
    context: ConversationContext
  ): string {
    let message = STATE_MESSAGES[state] || '¿En qué puedo ayudarte?';

    // Interpolar variables del contexto
    const data = context.accumulatedData;
    message = message.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });

    return message;
  }

  /**
   * Construir acción ejecutable desde contexto
   */
  static buildExecutableActionFromContext(
    flowType: FlowType,
    context: ConversationContext
  ): ExecutableAction {
    const data = context.accumulatedData;

    switch (flowType) {
      case FlowType.EMPLOYEE_CREATE:
        return {
          type: 'CREATE_EMPLOYEE',
          method: 'createEmployee',
          parameters: {
            nombre_completo: data.employeeName,
            tipo_documento: data.tipoDocumento,
            cedula: data.cedula,
            tipo_contrato: data.tipoContrato,
            periodicidad_pago: data.periodicidadPago,
            salario_base: data.salario_base,
            cargo: data.cargo || 'Sin especificar'
          },
          requiresConfirmation: true,
          confirmationMessage: `¿Confirmas crear empleado **${data.employeeName}** con salario $${data.salario_base}?`
        };

      case FlowType.EMPLOYEE_UPDATE:
        return {
          type: 'UPDATE_EMPLOYEE',
          method: 'updateEmployee',
          parameters: {
            employeeId: data.employeeId,
            field: data.fieldToUpdate,
            value: data.newValue
          },
          requiresConfirmation: true,
          confirmationMessage: `¿Confirmas actualizar ${data.fieldToUpdate} de **${data.employeeName}**?`
        };

      case FlowType.EMPLOYEE_DELETE:
        return {
          type: 'DELETE_EMPLOYEE',
          method: 'deleteEmployee',
          parameters: {
            employeeId: data.employeeId
          },
          requiresConfirmation: true,
          confirmationMessage: `⚠️ ¿Confirmas eliminar a **${data.employeeName}**? Esta acción no se puede deshacer.`
        };

      case FlowType.VOUCHER_SEND:
        return {
          type: 'SEND_VOUCHER',
          method: 'sendVoucher',
          parameters: {
            employeeId: data.employeeId,
            periodId: data.periodId,
            email: data.email
          },
          requiresConfirmation: false
        };

      case FlowType.PAYROLL_LIQUIDATE:
        return {
          type: 'LIQUIDATE_PAYROLL',
          method: 'liquidatePayroll',
          parameters: {
            periodId: data.periodId,
            employeeIds: data.employeeIds || 'all'
          },
          requiresConfirmation: true,
          confirmationMessage: `¿Confirmas liquidar nómina del período **${data.periodName}**?`
        };

      case FlowType.VACATION_REGISTER:
        return {
          type: 'REGISTER_VACATION',
          method: 'registerVacation',
          parameters: {
            employeeId: data.employeeId,
            startDate: data.startDate,
            endDate: data.endDate
          },
          requiresConfirmation: true,
          confirmationMessage: `¿Confirmas registrar vacaciones para **${data.employeeName}**?`
        };

      default:
        return {
          type: 'UNKNOWN',
          method: 'unknown',
          parameters: {},
          requiresConfirmation: false
        };
    }
  }

  /**
   * Construir respuesta de error de transición
   */
  static buildTransitionErrorResponse(
    fromState: ConversationState,
    toState: ConversationState,
    reason: string
  ): HandlerResponse {
    return {
      response: `❌ No puedo realizar esa acción ahora.\n\n${reason}`,
      emotionalState: 'concerned',
      requiresFollowUp: true,
      quickReplies: [
        { value: 'reintentar', label: 'Reintentar', icon: '🔄' },
        { value: 'cancelar', label: 'Cancelar', icon: '❌' }
      ]
    };
  }

  /**
   * Construir respuesta de campos faltantes
   */
  static buildMissingFieldsResponse(
    state: ConversationState,
    missingFields: string[]
  ): HandlerResponse {
    const fieldLabels: Record<string, string> = {
      employeeName: 'Nombre del empleado',
      tipoDocumento: 'Tipo de documento',
      cedula: 'Número de cédula',
      tipoContrato: 'Tipo de contrato',
      periodicidadPago: 'Periodicidad de pago',
      salario_base: 'Salario base',
      cargo: 'Cargo',
      employeeId: 'Identificación del empleado',
      periodId: 'Período',
      email: 'Correo electrónico'
    };

    const missingLabels = missingFields.map(field => fieldLabels[field] || field);

    return {
      response: `📋 Para continuar, necesito la siguiente información:\n\n${missingLabels.map(label => `• ${label}`).join('\n')}`,
      emotionalState: 'analyzing',
      requiresFollowUp: true
    };
  }

  /**
   * Construir respuesta de confirmación
   */
  static buildConfirmationResponse(
    action: ExecutableAction,
    context: ConversationContext
  ): HandlerResponse {
    return {
      response: action.confirmationMessage || '¿Confirmas esta acción?',
      emotionalState: 'neutral',
      requiresFollowUp: true,
      actions: [action],
      quickReplies: [
        { value: 'confirmar', label: 'Confirmar', icon: '✅' },
        { value: 'cancelar', label: 'Cancelar', icon: '❌' }
      ],
      conversationState: ConversationStateManager.serialize(context) // ✅ Serialize properly
    };
  }

  /**
   * Construir respuesta de cancelación
   */
  static buildCancellationResponse(flowType: FlowType): HandlerResponse {
    const flowLabels: Record<FlowType, string> = {
      [FlowType.NONE]: 'operación',
      [FlowType.EMPLOYEE_CREATE]: 'creación de empleado',
      [FlowType.EMPLOYEE_UPDATE]: 'actualización de empleado',
      [FlowType.EMPLOYEE_DELETE]: 'eliminación de empleado',
      [FlowType.VOUCHER_SEND]: 'envío de comprobante',
      [FlowType.PAYROLL_LIQUIDATE]: 'liquidación de nómina',
      [FlowType.VACATION_REGISTER]: 'registro de vacaciones',
      [FlowType.DATABASE_QUERY]: 'consulta',
      [FlowType.REPORTS_GENERATE]: 'generación de reporte',
      [FlowType.WHAT_IF_SIMULATION]: 'simulación What-If',
      [FlowType.PROACTIVE_SCAN]: 'escaneo proactivo'
    };

    return {
      response: `❌ He cancelado la ${flowLabels[flowType]}. ¿En qué más puedo ayudarte?`,
      emotionalState: 'neutral',
      requiresFollowUp: false
    };
  }

  /**
   * Build response for interruptions during active flows
   */
  static buildInterruptionResponse(
    interruptionType: 'greeting' | 'query',
    context: ConversationContext,
    userMessage: string
  ): { message: string; quickReplies: QuickReplyOption[] } {
    const currentStatePrompt = this.buildStateResponse(context.state, context);
    
    if (interruptionType === 'greeting') {
      const greetings = ['¡Hola!', '¡Hola! 👋', '¡Hey!', 'Hola'];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      return {
        message: `${randomGreeting} ${currentStatePrompt.message}`,
        quickReplies: currentStatePrompt.quickReplies || []
      };
    }
    
    // For 'query' type, this is handled separately in the main flow
    return {
      message: currentStatePrompt.message,
      quickReplies: currentStatePrompt.quickReplies || []
    };
  }

  /**
   * Obtener emotional state apropiado para un estado
   */
  private static getEmotionalStateForState(state: ConversationState): EmotionalState {
    if (state === ConversationState.ERROR) return 'concerned';
    if (this.isReadyState(state)) return 'celebrating';
    if (state === ConversationState.IDLE) return 'neutral';
    return 'analyzing';
  }

  /**
   * Verificar si es un estado "ready"
   */
  private static isReadyState(state: ConversationState): boolean {
    return state.toString().endsWith('_READY');
  }

  /**
   * Verificar si es un estado terminal
   */
  private static isTerminalState(state: ConversationState): boolean {
    return this.isReadyState(state) || state === ConversationState.IDLE;
  }
}
