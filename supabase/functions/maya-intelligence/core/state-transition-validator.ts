/**
 * ✅ STATE TRANSITION VALIDATOR - Enterprise-Grade State Machine Validation
 * 
 * Valida transiciones entre estados y campos requeridos
 * Proporciona razones claras de rechazo y sugerencias
 * 
 * @version 2.0.0
 * @phase Phase-1-Infrastructure
 */

import { ConversationState, FlowType, ConversationContext } from './conversation-state-manager.ts';

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  missingFields?: string[];
  reason?: string;
  suggestions?: string[];
}

/**
 * Matriz de transiciones permitidas
 * Define qué estados pueden transicionar a cuáles
 */
const TRANSITION_MATRIX: Record<ConversationState, ConversationState[]> = {
  // Estados generales
  [ConversationState.IDLE]: [
    ConversationState.EMPLOYEE_CREATE_START,
    ConversationState.EMPLOYEE_UPDATE_START,
    ConversationState.EMPLOYEE_DELETE_START,
    ConversationState.VOUCHER_START,
    ConversationState.PAYROLL_LIQUIDATE_START,
    ConversationState.VACATION_REGISTER_START
  ],

  [ConversationState.ERROR]: [
    ConversationState.IDLE,
    ConversationState.EMPLOYEE_CREATE_START,
    ConversationState.AWAITING_EMPLOYEE_NAME
  ],

  // Employee Create Flow
  [ConversationState.EMPLOYEE_CREATE_START]: [
    ConversationState.AWAITING_EMPLOYEE_NAME,
    ConversationState.AWAITING_DOC_TYPE,
    ConversationState.IDLE,
    ConversationState.ERROR
  ],

  [ConversationState.AWAITING_EMPLOYEE_NAME]: [
    ConversationState.AWAITING_DOC_TYPE,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.AWAITING_DOC_TYPE]: [
    ConversationState.AWAITING_ID_NUMBER,
    ConversationState.AWAITING_CONTRACT_TYPE,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.AWAITING_ID_NUMBER]: [
    ConversationState.AWAITING_CONTRACT_TYPE,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.AWAITING_CONTRACT_TYPE]: [
    ConversationState.AWAITING_PAYMENT_FREQUENCY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.AWAITING_PAYMENT_FREQUENCY]: [
    ConversationState.AWAITING_SALARY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.AWAITING_SALARY]: [
    ConversationState.AWAITING_POSITION,
    ConversationState.EMPLOYEE_CREATE_READY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.AWAITING_POSITION]: [
    ConversationState.EMPLOYEE_CREATE_READY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.EMPLOYEE_CREATE_READY]: [
    ConversationState.IDLE
  ],

  // Employee Update Flow
  [ConversationState.EMPLOYEE_UPDATE_START]: [
    ConversationState.AWAITING_EMPLOYEE_IDENTIFIER,
    ConversationState.AWAITING_UPDATE_FIELD,
    ConversationState.IDLE,
    ConversationState.ERROR
  ],

  [ConversationState.AWAITING_EMPLOYEE_IDENTIFIER]: [
    ConversationState.AWAITING_UPDATE_FIELD,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.AWAITING_UPDATE_FIELD]: [
    ConversationState.AWAITING_UPDATE_VALUE,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.AWAITING_UPDATE_VALUE]: [
    ConversationState.EMPLOYEE_UPDATE_READY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.EMPLOYEE_UPDATE_READY]: [
    ConversationState.IDLE
  ],

  // Employee Delete Flow
  [ConversationState.EMPLOYEE_DELETE_START]: [
    ConversationState.EMPLOYEE_DELETE_CONFIRM,
    ConversationState.IDLE,
    ConversationState.ERROR
  ],

  [ConversationState.EMPLOYEE_DELETE_CONFIRM]: [
    ConversationState.EMPLOYEE_DELETE_READY,
    ConversationState.IDLE,
    ConversationState.ERROR
  ],

  [ConversationState.EMPLOYEE_DELETE_READY]: [
    ConversationState.IDLE
  ],

  // Voucher Flow
  [ConversationState.VOUCHER_START]: [
    ConversationState.VOUCHER_IDENTIFY_EMPLOYEE,
    ConversationState.VOUCHER_IDENTIFY_PERIOD,
    ConversationState.IDLE,
    ConversationState.ERROR
  ],

  [ConversationState.VOUCHER_IDENTIFY_EMPLOYEE]: [
    ConversationState.VOUCHER_IDENTIFY_PERIOD,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.VOUCHER_IDENTIFY_PERIOD]: [
    ConversationState.VOUCHER_CONFIRM_EMAIL,
    ConversationState.VOUCHER_READY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.VOUCHER_CONFIRM_EMAIL]: [
    ConversationState.VOUCHER_READY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.VOUCHER_READY]: [
    ConversationState.IDLE
  ],

  // Payroll Liquidate Flow
  [ConversationState.PAYROLL_LIQUIDATE_START]: [
    ConversationState.PAYROLL_IDENTIFY_PERIOD,
    ConversationState.IDLE,
    ConversationState.ERROR
  ],

  [ConversationState.PAYROLL_IDENTIFY_PERIOD]: [
    ConversationState.PAYROLL_CONFIRM_EMPLOYEES,
    ConversationState.PAYROLL_LIQUIDATE_READY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.PAYROLL_CONFIRM_EMPLOYEES]: [
    ConversationState.PAYROLL_LIQUIDATE_READY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.PAYROLL_LIQUIDATE_READY]: [
    ConversationState.IDLE
  ],

  // Vacation Flow
  [ConversationState.VACATION_REGISTER_START]: [
    ConversationState.VACATION_IDENTIFY_EMPLOYEE,
    ConversationState.IDLE,
    ConversationState.ERROR
  ],

  [ConversationState.VACATION_IDENTIFY_EMPLOYEE]: [
    ConversationState.VACATION_IDENTIFY_DATES,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.VACATION_IDENTIFY_DATES]: [
    ConversationState.VACATION_REGISTER_READY,
    ConversationState.ERROR,
    ConversationState.IDLE
  ],

  [ConversationState.VACATION_REGISTER_READY]: [
    ConversationState.IDLE
  ]
};

/**
 * Campos requeridos por estado
 */
const REQUIRED_FIELDS_BY_STATE: Record<ConversationState, string[]> = {
  // Estados generales
  [ConversationState.IDLE]: [],
  [ConversationState.ERROR]: [],

  // Employee Create
  [ConversationState.EMPLOYEE_CREATE_START]: [],
  [ConversationState.AWAITING_EMPLOYEE_NAME]: [],
  [ConversationState.AWAITING_DOC_TYPE]: ['employeeName'],
  [ConversationState.AWAITING_ID_NUMBER]: ['employeeName', 'tipoDocumento'],
  [ConversationState.AWAITING_CONTRACT_TYPE]: ['employeeName', 'tipoDocumento', 'cedula'],
  [ConversationState.AWAITING_PAYMENT_FREQUENCY]: ['employeeName', 'tipoDocumento', 'cedula', 'tipoContrato'],
  [ConversationState.AWAITING_SALARY]: ['employeeName', 'tipoDocumento', 'cedula', 'tipoContrato', 'periodicidadPago'],
  [ConversationState.AWAITING_POSITION]: ['employeeName', 'tipoDocumento', 'cedula', 'tipoContrato', 'periodicidadPago', 'salario_base'],
  [ConversationState.EMPLOYEE_CREATE_READY]: ['employeeName', 'tipoDocumento', 'cedula', 'tipoContrato', 'periodicidadPago', 'salario_base'],

  // Employee Update
  [ConversationState.EMPLOYEE_UPDATE_START]: [],
  [ConversationState.AWAITING_EMPLOYEE_IDENTIFIER]: [],
  [ConversationState.AWAITING_UPDATE_FIELD]: ['employeeId'],
  [ConversationState.AWAITING_UPDATE_VALUE]: ['employeeId', 'fieldToUpdate'],
  [ConversationState.EMPLOYEE_UPDATE_READY]: ['employeeId', 'fieldToUpdate', 'newValue'],

  // Employee Delete
  [ConversationState.EMPLOYEE_DELETE_START]: [],
  [ConversationState.EMPLOYEE_DELETE_CONFIRM]: ['employeeId'],
  [ConversationState.EMPLOYEE_DELETE_READY]: ['employeeId', 'confirmed'],

  // Voucher
  [ConversationState.VOUCHER_START]: [],
  [ConversationState.VOUCHER_IDENTIFY_EMPLOYEE]: [],
  [ConversationState.VOUCHER_IDENTIFY_PERIOD]: ['employeeId'],
  [ConversationState.VOUCHER_CONFIRM_EMAIL]: ['employeeId', 'periodId'],
  [ConversationState.VOUCHER_READY]: ['employeeId', 'periodId', 'email'],

  // Payroll
  [ConversationState.PAYROLL_LIQUIDATE_START]: [],
  [ConversationState.PAYROLL_IDENTIFY_PERIOD]: [],
  [ConversationState.PAYROLL_CONFIRM_EMPLOYEES]: ['periodId'],
  [ConversationState.PAYROLL_LIQUIDATE_READY]: ['periodId', 'employeeIds'],

  // Vacation
  [ConversationState.VACATION_REGISTER_START]: [],
  [ConversationState.VACATION_IDENTIFY_EMPLOYEE]: [],
  [ConversationState.VACATION_IDENTIFY_DATES]: ['employeeId'],
  [ConversationState.VACATION_REGISTER_READY]: ['employeeId', 'startDate', 'endDate']
};

/**
 * Validador de transiciones de estado
 */
export class StateTransitionValidator {

  /**
   * Validar si una transición es permitida
   */
  static validateTransition(
    fromState: ConversationState,
    toState: ConversationState
  ): ValidationResult {
    const allowedTransitions = TRANSITION_MATRIX[fromState] || [];
    
    if (allowedTransitions.includes(toState)) {
      return {
        isValid: true
      };
    }

    return {
      isValid: false,
      reason: this.explainTransitionError(fromState, toState),
      suggestions: this.getSuggestions(fromState)
    };
  }

  /**
   * Obtener transiciones válidas desde un estado
   */
  static getValidTransitions(state: ConversationState): ConversationState[] {
    return TRANSITION_MATRIX[state] || [];
  }

  /**
   * Validar campos requeridos para un estado
   */
  static validateRequiredFields(
    state: ConversationState,
    context: ConversationContext
  ): ValidationResult {
    const requiredFields = this.getRequiredFields(state);
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = context.accumulatedData[field];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length === 0) {
      return { isValid: true };
    }

    return {
      isValid: false,
      missingFields,
      reason: `Faltan campos requeridos: ${missingFields.join(', ')}`,
      errors: missingFields.map(field => `Campo requerido faltante: ${field}`)
    };
  }

  /**
   * Obtener campos requeridos para un estado
   */
  static getRequiredFields(state: ConversationState): string[] {
    return REQUIRED_FIELDS_BY_STATE[state] || [];
  }

  /**
   * Sugerir próxima transición basada en datos disponibles
   */
  static suggestNextTransition(
    currentState: ConversationState,
    availableData: Record<string, any>
  ): ConversationState | null {
    const validTransitions = this.getValidTransitions(currentState);

    // Filtrar ERROR e IDLE, buscar progreso
    const progressTransitions = validTransitions.filter(
      state => state !== ConversationState.ERROR && state !== ConversationState.IDLE
    );

    // Devolver la primera transición de progreso
    for (const nextState of progressTransitions) {
      const requiredFields = this.getRequiredFields(nextState);
      const hasAllFields = requiredFields.every(
        field => availableData[field] !== undefined && availableData[field] !== null && availableData[field] !== ''
      );

      if (hasAllFields) {
        return nextState;
      }
    }

    // Si no hay transición con datos completos, devolver la primera transición de progreso
    return progressTransitions[0] || null;
  }

  /**
   * Verificar si un flujo está completo
   */
  static isFlowComplete(
    flowType: FlowType,
    currentState: ConversationState
  ): boolean {
    const terminalStates: Record<FlowType, ConversationState[]> = {
      [FlowType.NONE]: [ConversationState.IDLE],
      [FlowType.EMPLOYEE_CREATE]: [ConversationState.EMPLOYEE_CREATE_READY],
      [FlowType.EMPLOYEE_UPDATE]: [ConversationState.EMPLOYEE_UPDATE_READY],
      [FlowType.EMPLOYEE_DELETE]: [ConversationState.EMPLOYEE_DELETE_READY],
      [FlowType.VOUCHER_SEND]: [ConversationState.VOUCHER_READY],
      [FlowType.PAYROLL_LIQUIDATE]: [ConversationState.PAYROLL_LIQUIDATE_READY],
      [FlowType.VACATION_REGISTER]: [ConversationState.VACATION_REGISTER_READY],
      [FlowType.DATABASE_QUERY]: [ConversationState.IDLE]
    };

    return terminalStates[flowType]?.includes(currentState) ?? false;
  }

  /**
   * Obtener estado terminal de un flujo
   */
  static getTerminalState(flowType: FlowType): ConversationState {
    const terminalStates: Record<FlowType, ConversationState> = {
      [FlowType.NONE]: ConversationState.IDLE,
      [FlowType.EMPLOYEE_CREATE]: ConversationState.EMPLOYEE_CREATE_READY,
      [FlowType.EMPLOYEE_UPDATE]: ConversationState.EMPLOYEE_UPDATE_READY,
      [FlowType.EMPLOYEE_DELETE]: ConversationState.EMPLOYEE_DELETE_READY,
      [FlowType.VOUCHER_SEND]: ConversationState.VOUCHER_READY,
      [FlowType.PAYROLL_LIQUIDATE]: ConversationState.PAYROLL_LIQUIDATE_READY,
      [FlowType.VACATION_REGISTER]: ConversationState.VACATION_REGISTER_READY,
      [FlowType.DATABASE_QUERY]: ConversationState.IDLE
    };

    return terminalStates[flowType] ?? ConversationState.IDLE;
  }

  /**
   * Explicar por qué una transición es inválida
   */
  static explainTransitionError(
    fromState: ConversationState,
    toState: ConversationState
  ): string {
    // Casos específicos
    if (fromState === ConversationState.EMPLOYEE_CREATE_READY && toState !== ConversationState.IDLE) {
      return 'El flujo de creación ya está completo. Debes confirmar o cancelar.';
    }

    if (fromState === ConversationState.IDLE && toState === ConversationState.ERROR) {
      return 'No puedes ir a ERROR desde IDLE directamente.';
    }

    // Saltos de estados
    const allowedTransitions = this.getValidTransitions(fromState);
    if (allowedTransitions.length === 0) {
      return `El estado ${fromState} no tiene transiciones válidas definidas.`;
    }

    return `No puedes transicionar de ${fromState} a ${toState}. Transiciones válidas: ${allowedTransitions.join(', ')}`;
  }

  /**
   * Obtener sugerencias de próximos pasos
   */
  private static getSuggestions(fromState: ConversationState): string[] {
    const validTransitions = this.getValidTransitions(fromState);
    
    return validTransitions
      .filter(state => state !== ConversationState.ERROR)
      .map(state => `Puedes ir a: ${state}`);
  }

  /**
   * Validar flujo completo
   */
  static validateCompleteFlow(
    flowType: FlowType,
    context: ConversationContext
  ): ValidationResult {
    const terminalState = this.getTerminalState(flowType);
    
    if (context.state !== terminalState) {
      return {
        isValid: false,
        reason: `El flujo no está completo. Estado actual: ${context.state}, Estado esperado: ${terminalState}`
      };
    }

    const requiredFields = this.getRequiredFields(terminalState);
    return this.validateRequiredFields(terminalState, context);
  }

  /**
   * Verificar si se puede cancelar desde un estado
   */
  static canCancel(state: ConversationState): boolean {
    const validTransitions = this.getValidTransitions(state);
    return validTransitions.includes(ConversationState.IDLE);
  }

  /**
   * Verificar si un estado es terminal (no tiene más progreso)
   */
  static isTerminalState(state: ConversationState): boolean {
    const validTransitions = this.getValidTransitions(state);
    
    // Un estado es terminal si solo puede ir a IDLE o no tiene transiciones
    return validTransitions.length === 0 || 
           (validTransitions.length === 1 && validTransitions[0] === ConversationState.IDLE);
  }
}
