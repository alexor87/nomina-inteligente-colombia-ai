
/**
 * ✅ GESTOR DE ESTADO DE NÓMINA - ARQUITECTURA CRÍTICA
 * Manejo centralizado de estados de períodos de nómina
 * Estados normalizados: draft, active, closed
 */

export type PayrollPeriodStatus = 'draft' | 'active' | 'closed';

export interface StateTransition {
  from: PayrollPeriodStatus;
  to: PayrollPeriodStatus;
  allowed: boolean;
  reason?: string;
}

export class PayrollStateManager {
  
  /**
   * Validar si una transición de estado es permitida
   */
  static validateStateTransition(
    currentState: PayrollPeriodStatus, 
    newState: PayrollPeriodStatus
  ): StateTransition {
    const transition: StateTransition = {
      from: currentState,
      to: newState,
      allowed: false
    };

    // Definir transiciones permitidas
    const allowedTransitions: Record<PayrollPeriodStatus, PayrollPeriodStatus[]> = {
      draft: ['active', 'closed'],
      active: ['closed'],
      closed: [] // Los períodos cerrados no pueden cambiar de estado
    };

    if (allowedTransitions[currentState].includes(newState)) {
      transition.allowed = true;
    } else {
      transition.reason = this.getTransitionErrorReason(currentState, newState);
    }

    return transition;
  }

  /**
   * Normalizar estado desde diferentes fuentes
   */
  static normalizeState(rawState: string): PayrollPeriodStatus {
    const stateMap: Record<string, PayrollPeriodStatus> = {
      // Draft variants
      'borrador': 'draft',
      'draft': 'draft',
      'nuevo': 'draft',
      
      // Active variants  
      'activo': 'active',
      'active': 'active',
      'en_proceso': 'active',
      'processing': 'active',
      'procesada': 'active',
      
      // Closed variants
      'cerrado': 'closed',
      'closed': 'closed',
      'cerrada': 'closed',
      'completed': 'closed',
      'finalizado': 'closed'
    };

    return stateMap[rawState.toLowerCase()] || 'draft';
  }

  /**
   * Verificar si un período puede ser editado
   */
  static canEditPeriod(state: PayrollPeriodStatus): boolean {
    return state === 'draft' || state === 'active';
  }

  /**
   * Verificar si un período puede ser cerrado
   */
  static canClosePeriod(state: PayrollPeriodStatus): boolean {
    return state === 'draft' || state === 'active';
  }

  /**
   * Obtener color del estado para UI
   */
  static getStateColor(state: PayrollPeriodStatus): string {
    const colors = {
      draft: 'blue',
      active: 'yellow', 
      closed: 'green'
    };
    return colors[state];
  }

  /**
   * Obtener label del estado para UI
   */
  static getStateLabel(state: PayrollPeriodStatus): string {
    const labels = {
      draft: 'Borrador',
      active: 'Activo',
      closed: 'Cerrado'
    };
    return labels[state];
  }

  private static getTransitionErrorReason(
    from: PayrollPeriodStatus, 
    to: PayrollPeriodStatus
  ): string {
    if (from === 'closed') {
      return 'Los períodos cerrados no pueden modificarse';
    }
    
    if (from === 'active' && to === 'draft') {
      return 'Un período activo no puede volver a borrador';
    }

    return `Transición no permitida de ${from} a ${to}`;
  }
}
