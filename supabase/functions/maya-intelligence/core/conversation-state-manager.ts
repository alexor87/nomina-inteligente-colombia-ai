/**
 * ✅ CONVERSATION STATE MANAGER - Enterprise-Grade State Machine
 * 
 * Gestión centralizada de estados conversacionales para flujos multi-paso
 * Elimina la necesidad de "parsing" de mensajes anteriores
 * 
 * @version 2.0.0
 * @phase Phase-1-Infrastructure
 */

import { MayaLogger } from './types.ts';

/**
 * Estados del sistema conversacional
 * Cada estado representa un punto específico en un flujo
 */
export enum ConversationState {
  // Estados generales
  IDLE = 'IDLE',
  ERROR = 'ERROR',
  
  // Estados de creación de empleado
  EMPLOYEE_CREATE_START = 'EMPLOYEE_CREATE_START',
  AWAITING_EMPLOYEE_NAME = 'AWAITING_EMPLOYEE_NAME',
  AWAITING_DOC_TYPE = 'AWAITING_DOC_TYPE',
  AWAITING_ID_NUMBER = 'AWAITING_ID_NUMBER',
  AWAITING_CONTRACT_TYPE = 'AWAITING_CONTRACT_TYPE',
  AWAITING_PAYMENT_FREQUENCY = 'AWAITING_PAYMENT_FREQUENCY',
  AWAITING_SALARY = 'AWAITING_SALARY',
  AWAITING_POSITION = 'AWAITING_POSITION',
  EMPLOYEE_CREATE_READY = 'EMPLOYEE_CREATE_READY',
  
  // Estados de actualización de empleado
  EMPLOYEE_UPDATE_START = 'EMPLOYEE_UPDATE_START',
  AWAITING_EMPLOYEE_IDENTIFIER = 'AWAITING_EMPLOYEE_IDENTIFIER',
  AWAITING_UPDATE_FIELD = 'AWAITING_UPDATE_FIELD',
  AWAITING_UPDATE_VALUE = 'AWAITING_UPDATE_VALUE',
  EMPLOYEE_UPDATE_READY = 'EMPLOYEE_UPDATE_READY',
  
  // Estados de eliminación
  EMPLOYEE_DELETE_START = 'EMPLOYEE_DELETE_START',
  EMPLOYEE_DELETE_CONFIRM = 'EMPLOYEE_DELETE_CONFIRM',
  EMPLOYEE_DELETE_READY = 'EMPLOYEE_DELETE_READY',
  
  // Estados de envío de comprobantes
  VOUCHER_START = 'VOUCHER_START',
  VOUCHER_IDENTIFY_EMPLOYEE = 'VOUCHER_IDENTIFY_EMPLOYEE',
  VOUCHER_IDENTIFY_PERIOD = 'VOUCHER_IDENTIFY_PERIOD',
  VOUCHER_CONFIRM_EMAIL = 'VOUCHER_CONFIRM_EMAIL',
  VOUCHER_READY = 'VOUCHER_READY',
  
  // Estados de liquidación de nómina
  PAYROLL_LIQUIDATE_START = 'PAYROLL_LIQUIDATE_START',
  PAYROLL_IDENTIFY_PERIOD = 'PAYROLL_IDENTIFY_PERIOD',
  PAYROLL_CONFIRM_EMPLOYEES = 'PAYROLL_CONFIRM_EMPLOYEES',
  PAYROLL_LIQUIDATE_READY = 'PAYROLL_LIQUIDATE_READY',
  
  // Estados de registro de vacaciones
  VACATION_REGISTER_START = 'VACATION_REGISTER_START',
  VACATION_IDENTIFY_EMPLOYEE = 'VACATION_IDENTIFY_EMPLOYEE',
  VACATION_IDENTIFY_DATES = 'VACATION_IDENTIFY_DATES',
  VACATION_REGISTER_READY = 'VACATION_REGISTER_READY',
}

/**
 * Tipos de flujos conversacionales
 */
export enum FlowType {
  NONE = 'NONE',
  EMPLOYEE_CREATE = 'EMPLOYEE_CREATE',
  EMPLOYEE_UPDATE = 'EMPLOYEE_UPDATE',
  EMPLOYEE_DELETE = 'EMPLOYEE_DELETE',
  VOUCHER_SEND = 'VOUCHER_SEND',
  PAYROLL_LIQUIDATE = 'PAYROLL_LIQUIDATE',
  VACATION_REGISTER = 'VACATION_REGISTER',
  DATABASE_QUERY = 'DATABASE_QUERY',
}

/**
 * Contexto de conversación - contiene todo el estado actual
 */
export interface ConversationContext {
  state: ConversationState;
  flowType: FlowType;
  accumulatedData: Record<string, any>;
  metadata: {
    startedAt: string;
    lastTransition: string;
    transitionCount: number;
    userId?: string;
    companyId?: string;
    sessionId?: string;
  };
  history: StateTransitionRecord[];
}

/**
 * Registro de transición de estado
 */
export interface StateTransitionRecord {
  fromState: ConversationState;
  toState: ConversationState;
  timestamp: string;
  triggeredBy?: string;
  reason?: string;
}

/**
 * Gestor centralizado de estados conversacionales
 */
export class ConversationStateManager {
  
  /**
   * Crear nuevo contexto conversacional
   */
  static createNewContext(
    flowType: FlowType,
    companyId?: string,
    userId?: string,
    sessionId?: string
  ): ConversationContext {
    const now = new Date().toISOString();
    
    return {
      state: ConversationState.IDLE,
      flowType,
      accumulatedData: {},
      metadata: {
        startedAt: now,
        lastTransition: now,
        transitionCount: 0,
        userId,
        companyId,
        sessionId
      },
      history: []
    };
  }

  /**
   * Transicionar a un nuevo estado
   */
  static transitionTo(
    context: ConversationContext,
    newState: ConversationState,
    triggeredBy?: string,
    reason?: string
  ): ConversationContext {
    const now = new Date().toISOString();
    
    const transitionRecord: StateTransitionRecord = {
      fromState: context.state,
      toState: newState,
      timestamp: now,
      triggeredBy,
      reason
    };

    return {
      ...context,
      state: newState,
      metadata: {
        ...context.metadata,
        lastTransition: now,
        transitionCount: context.metadata.transitionCount + 1
      },
      history: [...context.history, transitionRecord]
    };
  }

  /**
   * Verificar si una transición es posible (delega a validator)
   */
  static canTransition(
    fromState: ConversationState,
    toState: ConversationState
  ): boolean {
    // Esta función delega al StateTransitionValidator en producción
    // Por ahora, implementación básica
    return true;
  }

  /**
   * Actualizar datos acumulados
   */
  static updateData(
    context: ConversationContext,
    fieldName: string,
    value: any
  ): ConversationContext {
    return {
      ...context,
      accumulatedData: {
        ...context.accumulatedData,
        [fieldName]: value
      }
    };
  }

  /**
   * Actualizar múltiples campos a la vez
   */
  static updateMultipleData(
    context: ConversationContext,
    data: Record<string, any>
  ): ConversationContext {
    return {
      ...context,
      accumulatedData: {
        ...context.accumulatedData,
        ...data
      }
    };
  }

  /**
   * Obtener un dato específico
   */
  static getData(context: ConversationContext, fieldName: string): any {
    return context.accumulatedData[fieldName];
  }

  /**
   * Obtener todos los datos acumulados
   */
  static getAllData(context: ConversationContext): Record<string, any> {
    return { ...context.accumulatedData };
  }

  /**
   * Verificar si todos los campos requeridos están completos
   */
  static isDataComplete(
    context: ConversationContext,
    requiredFields: string[]
  ): boolean {
    return requiredFields.every(field => {
      const value = context.accumulatedData[field];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * Obtener campos faltantes
   */
  static getMissingFields(
    context: ConversationContext,
    requiredFields: string[]
  ): string[] {
    return requiredFields.filter(field => {
      const value = context.accumulatedData[field];
      return value === undefined || value === null || value === '';
    });
  }

  /**
   * Obtener siguiente estado lógico basado en datos disponibles
   * Esta función se usa para "auto-advance" cuando sea apropiado
   */
  static getNextState(context: ConversationContext): ConversationState | null {
    const { state, flowType, accumulatedData } = context;

    // Employee Create Flow
    if (flowType === FlowType.EMPLOYEE_CREATE) {
      switch (state) {
        case ConversationState.IDLE:
          return ConversationState.EMPLOYEE_CREATE_START;
        
        case ConversationState.EMPLOYEE_CREATE_START:
          return accumulatedData.employeeName 
            ? ConversationState.AWAITING_DOC_TYPE 
            : ConversationState.AWAITING_EMPLOYEE_NAME;
        
        case ConversationState.AWAITING_EMPLOYEE_NAME:
          return ConversationState.AWAITING_DOC_TYPE;
        
        case ConversationState.AWAITING_DOC_TYPE:
          return ConversationState.AWAITING_ID_NUMBER;
        
        case ConversationState.AWAITING_ID_NUMBER:
          return ConversationState.AWAITING_CONTRACT_TYPE;
        
        case ConversationState.AWAITING_CONTRACT_TYPE:
          return ConversationState.AWAITING_PAYMENT_FREQUENCY;
        
        case ConversationState.AWAITING_PAYMENT_FREQUENCY:
          return ConversationState.AWAITING_SALARY;
        
        case ConversationState.AWAITING_SALARY:
          return ConversationState.EMPLOYEE_CREATE_READY;
        
        default:
          return null;
      }
    }

    // Voucher Flow
    if (flowType === FlowType.VOUCHER_SEND) {
      switch (state) {
        case ConversationState.IDLE:
          return ConversationState.VOUCHER_START;
        
        case ConversationState.VOUCHER_START:
          return accumulatedData.employeeId 
            ? ConversationState.VOUCHER_IDENTIFY_PERIOD 
            : ConversationState.VOUCHER_IDENTIFY_EMPLOYEE;
        
        case ConversationState.VOUCHER_IDENTIFY_EMPLOYEE:
          return ConversationState.VOUCHER_IDENTIFY_PERIOD;
        
        case ConversationState.VOUCHER_IDENTIFY_PERIOD:
          return ConversationState.VOUCHER_CONFIRM_EMAIL;
        
        case ConversationState.VOUCHER_CONFIRM_EMAIL:
          return ConversationState.VOUCHER_READY;
        
        default:
          return null;
      }
    }

    // Payroll Flow
    if (flowType === FlowType.PAYROLL_LIQUIDATE) {
      switch (state) {
        case ConversationState.IDLE:
          return ConversationState.PAYROLL_LIQUIDATE_START;
        
        case ConversationState.PAYROLL_LIQUIDATE_START:
          return ConversationState.PAYROLL_IDENTIFY_PERIOD;
        
        case ConversationState.PAYROLL_IDENTIFY_PERIOD:
          return ConversationState.PAYROLL_CONFIRM_EMPLOYEES;
        
        case ConversationState.PAYROLL_CONFIRM_EMPLOYEES:
          return ConversationState.PAYROLL_LIQUIDATE_READY;
        
        default:
          return null;
      }
    }

    return null;
  }

  /**
   * Serializar contexto a JSON string
   */
  static serialize(context: ConversationContext): string {
    try {
      return JSON.stringify(context);
    } catch (error) {
      console.error('Error serializing context:', error);
      return JSON.stringify(this.createNewContext(FlowType.NONE));
    }
  }

  /**
   * Deserializar contexto desde JSON string
   */
  static deserialize(serialized: string): ConversationContext {
    try {
      const context = JSON.parse(serialized);
      
      // Validar estructura básica
      if (!context.state || !context.flowType || !context.accumulatedData) {
        throw new Error('Invalid context structure');
      }
      
      return context;
    } catch (error) {
      console.error('Error deserializing context:', error);
      return this.createNewContext(FlowType.NONE);
    }
  }

  /**
   * Resetear contexto a IDLE
   */
  static reset(context: ConversationContext): ConversationContext {
    return {
      ...context,
      state: ConversationState.IDLE,
      flowType: FlowType.NONE,
      accumulatedData: {},
      metadata: {
        ...context.metadata,
        lastTransition: new Date().toISOString(),
        transitionCount: context.metadata.transitionCount + 1
      }
    };
  }

  /**
   * Verificar si está en un flujo específico
   */
  static isInFlow(context: ConversationContext, flowType: FlowType): boolean {
    return context.flowType === flowType && context.state !== ConversationState.IDLE;
  }

  /**
   * Calcular progreso del flujo (0-100%)
   */
  static getFlowProgress(context: ConversationContext): number {
    const { state, flowType } = context;

    // Employee Create: 7 pasos
    if (flowType === FlowType.EMPLOYEE_CREATE) {
      const stateOrder = [
        ConversationState.EMPLOYEE_CREATE_START,
        ConversationState.AWAITING_EMPLOYEE_NAME,
        ConversationState.AWAITING_DOC_TYPE,
        ConversationState.AWAITING_ID_NUMBER,
        ConversationState.AWAITING_CONTRACT_TYPE,
        ConversationState.AWAITING_PAYMENT_FREQUENCY,
        ConversationState.AWAITING_SALARY,
        ConversationState.EMPLOYEE_CREATE_READY
      ];
      
      const currentIndex = stateOrder.indexOf(state);
      if (currentIndex === -1) return 0;
      
      return Math.round((currentIndex / (stateOrder.length - 1)) * 100);
    }

    // Voucher: 4 pasos
    if (flowType === FlowType.VOUCHER_SEND) {
      const stateOrder = [
        ConversationState.VOUCHER_START,
        ConversationState.VOUCHER_IDENTIFY_EMPLOYEE,
        ConversationState.VOUCHER_IDENTIFY_PERIOD,
        ConversationState.VOUCHER_CONFIRM_EMAIL,
        ConversationState.VOUCHER_READY
      ];
      
      const currentIndex = stateOrder.indexOf(state);
      if (currentIndex === -1) return 0;
      
      return Math.round((currentIndex / (stateOrder.length - 1)) * 100);
    }

    return 0;
  }

  /**
   * Verificar si el flujo está completo
   */
  static isFlowComplete(context: ConversationContext): boolean {
    const { state, flowType } = context;

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

    return terminalStates[flowType]?.includes(state) ?? false;
  }

  /**
   * Obtener estado inicial para un tipo de flujo
   */
  static getInitialStateForFlow(flowType: FlowType): ConversationState {
    const initialStates: Record<FlowType, ConversationState> = {
      [FlowType.NONE]: ConversationState.IDLE,
      [FlowType.EMPLOYEE_CREATE]: ConversationState.EMPLOYEE_CREATE_START,
      [FlowType.EMPLOYEE_UPDATE]: ConversationState.EMPLOYEE_UPDATE_START,
      [FlowType.EMPLOYEE_DELETE]: ConversationState.EMPLOYEE_DELETE_START,
      [FlowType.VOUCHER_SEND]: ConversationState.VOUCHER_START,
      [FlowType.PAYROLL_LIQUIDATE]: ConversationState.PAYROLL_LIQUIDATE_START,
      [FlowType.VACATION_REGISTER]: ConversationState.VACATION_REGISTER_START,
      [FlowType.DATABASE_QUERY]: ConversationState.IDLE
    };

    return initialStates[flowType] ?? ConversationState.IDLE;
  }

  /**
   * Helper para logging de debug
   */
  static logContext(context: ConversationContext, logger?: MayaLogger): void {
    const logData = {
      state: context.state,
      flowType: context.flowType,
      progress: this.getFlowProgress(context),
      dataKeys: Object.keys(context.accumulatedData),
      transitionCount: context.metadata.transitionCount,
      lastTransition: context.metadata.lastTransition
    };

    if (logger) {
      logger.info('ConversationContext', logData);
    } else {
      console.log('[ConversationStateManager]', JSON.stringify(logData, null, 2));
    }
  }
}
