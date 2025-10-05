// Frontend-Backend Synchronization Tests

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { ConversationStateManager, ConversationState, FlowType } from '../core/conversation-state-manager.ts';
import { StateResponseBuilder } from '../core/state-response-builder.ts';
import { createMockContext } from './test-helpers.ts';

Deno.test('Frontend-Backend Sync - Metadata Complete Transfer', () => {
  const stateManager = new ConversationStateManager();
  const responseBuilder = new StateResponseBuilder();
  
  let context = stateManager.createNewContext(
    FlowType.EMPLOYEE_CREATE,
    'test-company-123',
    'test-user-456'
  );
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  const response = responseBuilder.buildStateResponse(context.currentState, context);
  
  // Verify metadata structure
  assertExists(response.structuredResponse);
  assertExists(response.structuredResponse.conversationState);
  assertEquals(response.structuredResponse.conversationState, ConversationState.EMPLOYEE_CREATE_START);
  assertExists(response.structuredResponse.quickReplies);
  
  console.log('✅ Frontend-Backend Sync - Metadata Complete Transfer: PASSED');
});

Deno.test('Frontend-Backend Sync - ConversationState Preservation', () => {
  const stateManager = new ConversationStateManager();
  
  // Simulate frontend sending metadata with conversationState
  const incomingMetadata = {
    conversationState: ConversationState.EMPLOYEE_CREATE_SALARY,
    lastAssistantState: ConversationState.EMPLOYEE_CREATE_START,
  };
  
  // Backend should respect and continue from this state
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, incomingMetadata.conversationState);
  
  assertEquals(context.currentState, ConversationState.EMPLOYEE_CREATE_SALARY);
  
  console.log('✅ Frontend-Backend Sync - ConversationState Preservation: PASSED');
});

Deno.test('Frontend-Backend Sync - QuickReplies Generation', () => {
  const responseBuilder = new StateResponseBuilder();
  const context = createMockContext(
    FlowType.EMPLOYEE_CREATE,
    ConversationState.EMPLOYEE_CREATE_START
  );
  
  const quickReplies = responseBuilder.buildQuickRepliesForState(
    ConversationState.EMPLOYEE_CREATE_START,
    context
  );
  
  assertExists(quickReplies);
  assertEquals(Array.isArray(quickReplies), true);
  assertEquals(quickReplies.length > 0, true);
  
  // Verify quick reply structure
  const firstReply = quickReplies[0];
  assertExists(firstReply.value);
  assertExists(firstReply.label);
  
  console.log('✅ Frontend-Backend Sync - QuickReplies Generation: PASSED');
});

Deno.test('Frontend-Backend Sync - ExecutableActions Generation', () => {
  const stateManager = new ConversationStateManager();
  const responseBuilder = new StateResponseBuilder();
  
  // Create complete employee context
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_READY);
  
  context = stateManager.updateData(context, 'fullName', 'Test Employee');
  context = stateManager.updateData(context, 'documentType', 'CC');
  context = stateManager.updateData(context, 'documentNumber', '123456');
  context = stateManager.updateData(context, 'baseSalary', 2500000);
  context = stateManager.updateData(context, 'position', 'Developer');
  
  const response = responseBuilder.buildStateResponse(context.currentState, context);
  
  assertExists(response.structuredResponse);
  assertExists(response.structuredResponse.executableActions);
  assertEquals(response.structuredResponse.executableActions.length > 0, true);
  
  const action = response.structuredResponse.executableActions[0];
  assertEquals(action.type, 'create');
  assertEquals(action.entity, 'employee');
  assertExists(action.payload);
  
  console.log('✅ Frontend-Backend Sync - ExecutableActions Generation: PASSED');
});

Deno.test('Frontend-Backend Sync - Session Recovery from Serialized Context', () => {
  const stateManager = new ConversationStateManager();
  
  // Simulate a session that was interrupted
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY);
  context = stateManager.updateData(context, 'fullName', 'Recovered User');
  context = stateManager.updateData(context, 'documentType', 'CC');
  
  // Serialize context (as if stored in frontend localStorage or backend DB)
  const serialized = stateManager.serialize(context);
  
  // Simulate new session - recover from serialized state
  const recoveredContext = stateManager.deserialize(serialized);
  
  assertEquals(recoveredContext.currentState, ConversationState.EMPLOYEE_CREATE_SALARY);
  assertEquals(recoveredContext.accumulatedData.fullName, 'Recovered User');
  assertEquals(recoveredContext.flowType, FlowType.EMPLOYEE_CREATE);
  
  console.log('✅ Frontend-Backend Sync - Session Recovery from Serialized Context: PASSED');
});

Deno.test('Frontend-Backend Sync - Emotional State Propagation', () => {
  const responseBuilder = new StateResponseBuilder();
  const context = createMockContext(
    FlowType.EMPLOYEE_CREATE,
    ConversationState.EMPLOYEE_CREATE_CONFIRMATION
  );
  
  const response = responseBuilder.buildStateResponse(context.currentState, context);
  
  assertExists(response.emotionalState);
  assertEquals(typeof response.emotionalState, 'string');
  
  console.log('✅ Frontend-Backend Sync - Emotional State Propagation: PASSED');
});

Deno.test('Frontend-Backend Sync - Field Name Tracking', () => {
  const stateManager = new ConversationStateManager();
  const responseBuilder = new StateResponseBuilder();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  const response = responseBuilder.buildStateResponse(context.currentState, context);
  
  // Should include fieldName for frontend to know what data to collect
  assertExists(response.structuredResponse);
  assertExists(response.structuredResponse.fieldName);
  
  console.log('✅ Frontend-Backend Sync - Field Name Tracking: PASSED');
});

Deno.test('Frontend-Backend Sync - Progress Indicator Sync', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  const progress = stateManager.getFlowProgress(context);
  
  // Frontend should be able to show progress bar based on this
  assertEquals(typeof progress, 'number');
  assertEquals(progress >= 0 && progress <= 100, true);
  
  console.log('✅ Frontend-Backend Sync - Progress Indicator Sync: PASSED');
});

Deno.test('Frontend-Backend Sync - Context Metadata Integrity', () => {
  const stateManager = new ConversationStateManager();
  
  const companyId = 'company-abc-123';
  const userId = 'user-xyz-789';
  const sessionId = 'session-def-456';
  
  const context = stateManager.createNewContext(
    FlowType.EMPLOYEE_CREATE,
    companyId,
    userId,
    sessionId
  );
  
  // Verify metadata is preserved
  assertEquals(context.metadata.companyId, companyId);
  assertEquals(context.metadata.userId, userId);
  assertEquals(context.sessionId, sessionId);
  assertExists(context.metadata.createdAt);
  assertExists(context.metadata.lastUpdatedAt);
  
  console.log('✅ Frontend-Backend Sync - Context Metadata Integrity: PASSED');
});

Deno.test('Frontend-Backend Sync - Transition History for Debugging', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START, 'user');
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY, 'system');
  
  // Frontend can use this for debugging or showing user journey
  assertEquals(context.transitionHistory.length, 2);
  
  const transitions = context.transitionHistory;
  assertEquals(transitions[0].triggeredBy, 'user');
  assertEquals(transitions[1].triggeredBy, 'system');
  
  console.log('✅ Frontend-Backend Sync - Transition History for Debugging: PASSED');
});

Deno.test('Frontend-Backend Sync - Accumulated Data Sync', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Simulate multiple turns adding data
  context = stateManager.updateData(context, 'fullName', 'Maria Garcia');
  context = stateManager.updateData(context, 'baseSalary', 3200000);
  
  // Serialize and send to frontend
  const serialized = stateManager.serialize(context);
  
  // Frontend receives and deserializes
  const frontendContext = stateManager.deserialize(serialized);
  
  // Verify all accumulated data is present
  assertEquals(frontendContext.accumulatedData.fullName, 'Maria Garcia');
  assertEquals(frontendContext.accumulatedData.baseSalary, 3200000);
  
  console.log('✅ Frontend-Backend Sync - Accumulated Data Sync: PASSED');
});

Deno.test('Frontend-Backend Sync - Prompt Message Interpolation', () => {
  const stateManager = new ConversationStateManager();
  const responseBuilder = new StateResponseBuilder();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.updateData(context, 'fullName', 'Pedro Sanchez');
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY);
  
  const message = responseBuilder.buildPromptMessage(context.currentState, context);
  
  // Message should interpolate employee name
  assertExists(message);
  assertEquals(message.includes('Pedro Sanchez'), true);
  
  console.log('✅ Frontend-Backend Sync - Prompt Message Interpolation: PASSED');
});
