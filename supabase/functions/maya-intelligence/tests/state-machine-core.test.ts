// Core State Machine Tests

import { assertEquals, assertExists, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { ConversationStateManager, ConversationState, FlowType } from '../core/conversation-state-manager.ts';
import { StateTransitionValidator } from '../core/state-transition-validator.ts';
import { createMockContext } from './test-helpers.ts';

Deno.test('State Machine Core - Context Creation', () => {
  const stateManager = new ConversationStateManager();
  
  const context = stateManager.createNewContext(
    FlowType.EMPLOYEE_CREATE,
    'company-123',
    'user-456',
    'session-789'
  );
  
  assertExists(context);
  assertEquals(context.currentState, ConversationState.IDLE);
  assertEquals(context.flowType, FlowType.EMPLOYEE_CREATE);
  assertEquals(context.metadata.companyId, 'company-123');
  assertEquals(context.metadata.userId, 'user-456');
  assertEquals(context.sessionId, 'session-789');
  assertExists(context.accumulatedData);
  assertExists(context.transitionHistory);
  
  console.log('✅ State Machine Core - Context Creation: PASSED');
});

Deno.test('State Machine Core - Valid State Transitions', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // IDLE -> EMPLOYEE_CREATE_START
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  assertEquals(context.currentState, ConversationState.EMPLOYEE_CREATE_START);
  assertEquals(context.transitionHistory.length, 1);
  
  // EMPLOYEE_CREATE_START -> EMPLOYEE_CREATE_SALARY
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY);
  assertEquals(context.currentState, ConversationState.EMPLOYEE_CREATE_SALARY);
  assertEquals(context.transitionHistory.length, 2);
  
  console.log('✅ State Machine Core - Valid State Transitions: PASSED');
});

Deno.test('State Machine Core - Invalid State Transitions', () => {
  const validation = StateTransitionValidator.validateTransition(
    ConversationState.EMPLOYEE_CREATE_START,
    ConversationState.EMPLOYEE_CREATE_READY
  );
  
  assertEquals(validation.isValid, false);
  assertExists(validation.errors);
  assertEquals(validation.errors!.length > 0, true);
  
  console.log('✅ State Machine Core - Invalid State Transitions: PASSED');
});

Deno.test('State Machine Core - Data Accumulation', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Add multiple data points
  context = stateManager.updateData(context, 'fullName', 'John Doe');
  context = stateManager.updateData(context, 'baseSalary', 3000000);
  context = stateManager.updateData(context, 'position', 'Manager');
  
  // Verify data accumulation
  assertEquals(context.accumulatedData.fullName, 'John Doe');
  assertEquals(context.accumulatedData.baseSalary, 3000000);
  assertEquals(context.accumulatedData.position, 'Manager');
  assertEquals(Object.keys(context.accumulatedData).length, 3);
  
  console.log('✅ State Machine Core - Data Accumulation: PASSED');
});

Deno.test('State Machine Core - Data Retrieval', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.updateData(context, 'testField', 'testValue');
  
  const value = stateManager.getData(context, 'testField');
  assertEquals(value, 'testValue');
  
  const missingValue = stateManager.getData(context, 'nonExistent');
  assertEquals(missingValue, undefined);
  
  console.log('✅ State Machine Core - Data Retrieval: PASSED');
});

Deno.test('State Machine Core - Next State Suggestion', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // With minimal data, should suggest staying or moving to next step
  const nextState = stateManager.getNextState(context);
  assertExists(nextState);
  
  console.log('✅ State Machine Core - Next State Suggestion: PASSED');
});

Deno.test('State Machine Core - Flow Completion Detection', () => {
  const stateManager = new ConversationStateManager();
  
  // Create context at different states
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  assertEquals(stateManager.isFlowComplete(context), false);
  
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  assertEquals(stateManager.isFlowComplete(context), false);
  
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_POSITION);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_CONFIRMATION);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_READY);
  assertEquals(stateManager.isFlowComplete(context), true);
  
  console.log('✅ State Machine Core - Flow Completion Detection: PASSED');
});

Deno.test('State Machine Core - Transition History Tracking', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START, 'system', 'flow_start');
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY, 'user', 'data_provided');
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_POSITION, 'system', 'auto_progress');
  
  assertEquals(context.transitionHistory.length, 3);
  
  const lastTransition = context.transitionHistory[context.transitionHistory.length - 1];
  assertEquals(lastTransition.toState, ConversationState.EMPLOYEE_CREATE_POSITION);
  assertEquals(lastTransition.triggeredBy, 'system');
  assertEquals(lastTransition.reason, 'auto_progress');
  assertExists(lastTransition.timestamp);
  
  console.log('✅ State Machine Core - Transition History Tracking: PASSED');
});

Deno.test('State Machine Core - Required Fields Validation', () => {
  const context = createMockContext(
    FlowType.EMPLOYEE_CREATE,
    ConversationState.EMPLOYEE_CREATE_START,
    {
      fullName: 'Test User',
      documentType: 'CC',
    }
  );
  
  // Validate required fields for EMPLOYEE_CREATE_SALARY state
  const validation = StateTransitionValidator.validateRequiredFields(
    ConversationState.EMPLOYEE_CREATE_SALARY,
    context
  );
  
  // Should fail because documentNumber is missing
  assertEquals(validation.isValid, false);
  assertExists(validation.missingFields);
  assertEquals(validation.missingFields!.includes('documentNumber'), true);
  
  console.log('✅ State Machine Core - Required Fields Validation: PASSED');
});

Deno.test('State Machine Core - Terminal State Detection', () => {
  const isTerminalReady = StateTransitionValidator.isTerminalState(ConversationState.EMPLOYEE_CREATE_READY);
  assertEquals(isTerminalReady, true);
  
  const isTerminalStart = StateTransitionValidator.isTerminalState(ConversationState.EMPLOYEE_CREATE_START);
  assertEquals(isTerminalStart, false);
  
  const isTerminalIdle = StateTransitionValidator.isTerminalState(ConversationState.IDLE);
  assertEquals(isTerminalIdle, false);
  
  console.log('✅ State Machine Core - Terminal State Detection: PASSED');
});

Deno.test('State Machine Core - Get Terminal State for Flow', () => {
  const terminalState = StateTransitionValidator.getTerminalState(FlowType.EMPLOYEE_CREATE);
  assertEquals(terminalState, ConversationState.EMPLOYEE_CREATE_READY);
  
  console.log('✅ State Machine Core - Get Terminal State for Flow: PASSED');
});

Deno.test('State Machine Core - Cancellation Permission', () => {
  // Most states should allow cancellation
  const canCancelStart = StateTransitionValidator.canCancel(ConversationState.EMPLOYEE_CREATE_START);
  assertEquals(canCancelStart, true);
  
  const canCancelSalary = StateTransitionValidator.canCancel(ConversationState.EMPLOYEE_CREATE_SALARY);
  assertEquals(canCancelSalary, true);
  
  // Terminal state shouldn't need cancellation (already done)
  const canCancelReady = StateTransitionValidator.canCancel(ConversationState.EMPLOYEE_CREATE_READY);
  assertEquals(canCancelReady, false);
  
  console.log('✅ State Machine Core - Cancellation Permission: PASSED');
});

Deno.test('State Machine Core - Flow Progress Percentage', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Test progress at different stages
  let progress = stateManager.getFlowProgress(context);
  assertEquals(progress, 0);
  
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  progress = stateManager.getFlowProgress(context);
  assertEquals(progress > 0 && progress < 100, true);
  
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY);
  const midProgress = stateManager.getFlowProgress(context);
  assertEquals(midProgress > progress, true);
  
  console.log('✅ State Machine Core - Flow Progress Percentage: PASSED');
});

Deno.test('State Machine Core - Suggest Next Transition', () => {
  const availableData = {
    fullName: 'Test User',
    documentType: 'CC',
    documentNumber: '123456',
  };
  
  const suggestion = StateTransitionValidator.suggestNextTransition(
    ConversationState.EMPLOYEE_CREATE_START,
    availableData
  );
  
  assertExists(suggestion);
  
  console.log('✅ State Machine Core - Suggest Next Transition: PASSED');
});
