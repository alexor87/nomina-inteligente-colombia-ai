// Test Helpers and Utilities for Maya Intelligence Tests

import { ConversationContext, ConversationState, FlowType } from '../core/conversation-state-manager.ts';

/**
 * Creates a mock conversation context for testing
 */
export function createMockContext(
  flowType: FlowType = FlowType.EMPLOYEE_CREATE,
  state: ConversationState = ConversationState.IDLE,
  data: Record<string, any> = {}
): ConversationContext {
  return {
    sessionId: 'test-session-' + Date.now(),
    currentState: state,
    flowType: flowType,
    accumulatedData: data,
    metadata: {
      companyId: 'test-company-123',
      userId: 'test-user-456',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    },
    transitionHistory: [],
  };
}

/**
 * Mock intent object for testing
 */
export function createMockIntent(
  action: string,
  confidence: number = 0.95,
  parameters: Record<string, any> = {},
  entities: Array<{ type: string; value: string; field?: string }> = []
) {
  return {
    action,
    confidence,
    parameters,
    entities,
    context: {
      lastMessage: 'Test message',
      conversationHistory: [],
    },
  };
}

/**
 * Mock company data for testing
 */
export const mockCompanyData = {
  id: 'test-company-123',
  name: 'Test Company S.A.S',
  settings: {
    currency: 'COP',
    timezone: 'America/Bogota',
  },
};

/**
 * Mock employee data for testing
 */
export const mockEmployeeData = {
  fullName: 'Carlos López',
  documentType: 'CC',
  documentNumber: '1234567890',
  position: 'Desarrollador',
  baseSalary: 2500000,
  contractType: 'indefinido',
  paymentFrequency: 'mensual',
};

/**
 * Asserts that a conversation state transition is valid
 */
export function assertValidTransition(
  fromState: ConversationState,
  toState: ConversationState,
  context: ConversationContext
): void {
  const lastTransition = context.transitionHistory[context.transitionHistory.length - 1];
  
  if (!lastTransition) {
    throw new Error('No transition found in history');
  }
  
  if (lastTransition.fromState !== fromState) {
    throw new Error(`Expected fromState ${fromState}, got ${lastTransition.fromState}`);
  }
  
  if (lastTransition.toState !== toState) {
    throw new Error(`Expected toState ${toState}, got ${lastTransition.toState}`);
  }
}

/**
 * Asserts that required fields are present in accumulated data
 */
export function assertRequiredFields(
  context: ConversationContext,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!(field in context.accumulatedData)) {
      throw new Error(`Required field ${field} missing in accumulated data`);
    }
  }
}

/**
 * Simulates a multi-turn conversation
 */
export function simulateConversation(messages: string[]): Array<{ role: string; content: string }> {
  const conversation: Array<{ role: string; content: string }> = [];
  
  for (let i = 0; i < messages.length; i++) {
    conversation.push({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: messages[i],
    });
  }
  
  return conversation;
}

/**
 * Waits for a specified time (for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts executable action from response
 */
export function extractExecutableAction(response: any): any | null {
  if (response.structuredResponse?.executableActions && response.structuredResponse.executableActions.length > 0) {
    return response.structuredResponse.executableActions[0];
  }
  return null;
}

/**
 * Validates response structure
 */
export function validateResponseStructure(response: any): boolean {
  return (
    response &&
    typeof response === 'object' &&
    'message' in response &&
    'success' in response
  );
}
