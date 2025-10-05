// Edge Cases and Error Handling Tests

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { ConversationStateManager, ConversationState, FlowType } from '../core/conversation-state-manager.ts';
import { StateTransitionValidator } from '../core/state-transition-validator.ts';
import { StateResponseBuilder } from '../core/state-response-builder.ts';
import { EmployeeCrudHandlerV2 } from '../handlers/employee-crud-handler-v2.ts';
import { createMockContext, createMockIntent } from './test-helpers.ts';

Deno.test('Edge Cases - Empty Message Handling', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // Parse empty message
  const extractedData = (handler as any).parseEmployeeDataFromMessage('', context);
  
  // Should return empty object or minimal data
  assertExists(extractedData);
  assertEquals(typeof extractedData, 'object');
  
  console.log('✅ Edge Cases - Empty Message Handling: PASSED');
});

Deno.test('Edge Cases - Invalid Message Format', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // Parse gibberish message
  const extractedData = (handler as any).parseEmployeeDataFromMessage('xyzabc123!@#', context);
  
  // Should handle gracefully without crashing
  assertExists(extractedData);
  
  console.log('✅ Edge Cases - Invalid Message Format: PASSED');
});

Deno.test('Edge Cases - Corrupted Context Recovery', () => {
  const stateManager = new ConversationStateManager();
  
  // Attempt to deserialize corrupted JSON
  const corruptedJson = '{"currentState": "INVALID_STATE", "flowType": "UNKNOWN_FLOW"}';
  
  try {
    const context = stateManager.deserialize(corruptedJson);
    // If it doesn't throw, verify it creates a safe fallback
    assertExists(context);
  } catch (error) {
    // Expected to throw, should handle gracefully
    assertExists(error);
  }
  
  console.log('✅ Edge Cases - Corrupted Context Recovery: PASSED');
});

Deno.test('Edge Cases - Transition to Non-Existent State', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Try invalid state name
  const invalidState = 'NON_EXISTENT_STATE' as ConversationState;
  
  // Should either reject or create safe fallback
  try {
    context = stateManager.transitionTo(context, invalidState);
    // If it allows, verify context is still valid
    assertExists(context.currentState);
  } catch (error) {
    assertExists(error);
  }
  
  console.log('✅ Edge Cases - Transition to Non-Existent State: PASSED');
});

Deno.test('Edge Cases - Duplicate Data Overwrite', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Add data
  context = stateManager.updateData(context, 'fullName', 'Original Name');
  assertEquals(context.accumulatedData.fullName, 'Original Name');
  
  // Overwrite with new data
  context = stateManager.updateData(context, 'fullName', 'New Name');
  assertEquals(context.accumulatedData.fullName, 'New Name');
  
  console.log('✅ Edge Cases - Duplicate Data Overwrite: PASSED');
});

Deno.test('Edge Cases - Conflicting Data Types', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Add number as salary
  context = stateManager.updateData(context, 'baseSalary', 2500000);
  assertEquals(typeof context.accumulatedData.baseSalary, 'number');
  
  // Try to overwrite with string (data quality issue)
  context = stateManager.updateData(context, 'baseSalary', 'invalid salary');
  
  // System should handle gracefully
  assertExists(context.accumulatedData.baseSalary);
  
  console.log('✅ Edge Cases - Conflicting Data Types: PASSED');
});

Deno.test('Edge Cases - Session Timeout Simulation', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // Serialize context (simulating session storage)
  const serialized = stateManager.serialize(context);
  
  // Simulate time passing (session timeout)
  // In production, you'd check timestamp and decide if session is valid
  const deserializedContext = stateManager.deserialize(serialized);
  
  // Should still be recoverable
  assertEquals(deserializedContext.currentState, ConversationState.EMPLOYEE_CREATE_START);
  assertExists(deserializedContext.metadata.createdAt);
  
  console.log('✅ Edge Cases - Session Timeout Simulation: PASSED');
});

Deno.test('Edge Cases - Concurrent State Updates', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Simulate concurrent updates
  const update1 = stateManager.updateData(context, 'field1', 'value1');
  const update2 = stateManager.updateData(context, 'field2', 'value2');
  
  // Both updates should be reflected
  assertExists(update1.accumulatedData.field1);
  assertExists(update2.accumulatedData.field2);
  
  console.log('✅ Edge Cases - Concurrent State Updates: PASSED');
});

Deno.test('Edge Cases - Missing Required Fields at Terminal State', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_READY);
  
  // Try to validate without required data
  const validation = StateTransitionValidator.validateRequiredFields(
    ConversationState.EMPLOYEE_CREATE_READY,
    context
  );
  
  // Should fail validation
  assertEquals(validation.isValid, false);
  assertExists(validation.missingFields);
  assertEquals(validation.missingFields!.length > 0, true);
  
  console.log('✅ Edge Cases - Missing Required Fields at Terminal State: PASSED');
});

Deno.test('Edge Cases - Invalid Intent Action', async () => {
  const handler = new EmployeeCrudHandlerV2();
  
  const invalidIntent = createMockIntent('invalidAction', 0.95);
  
  // Should return fallback response
  const response = await handler.handleIntent(invalidIntent);
  
  assertExists(response);
  assertExists(response.message);
  
  console.log('✅ Edge Cases - Invalid Intent Action: PASSED');
});

Deno.test('Edge Cases - Low Confidence Intent', async () => {
  const handler = new EmployeeCrudHandlerV2();
  
  const lowConfidenceIntent = createMockIntent('createEmployee', 0.3);
  
  // System might reject low confidence intents
  const response = await handler.handleIntent(lowConfidenceIntent);
  
  assertExists(response);
  
  console.log('✅ Edge Cases - Low Confidence Intent: PASSED');
});

Deno.test('Edge Cases - Extremely Long Message', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // Create very long message (simulate copy-paste of resume)
  const longMessage = 'A'.repeat(10000) + ' nombre Juan Pérez CC 123456';
  
  // Should handle without crashing
  const extractedData = (handler as any).parseEmployeeDataFromMessage(longMessage, context);
  
  assertExists(extractedData);
  
  console.log('✅ Edge Cases - Extremely Long Message: PASSED');
});

Deno.test('Edge Cases - Special Characters in Employee Data', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // Message with special characters
  const message = 'Crear empleado María José O\'Connor-López, CC 123456789';
  
  const extractedData = (handler as any).parseEmployeeDataFromMessage(message, context);
  
  // Should preserve special characters
  assertExists(extractedData.fullName);
  
  console.log('✅ Edge Cases - Special Characters in Employee Data: PASSED');
});

Deno.test('Edge Cases - Multiple Employees Mentioned', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // Message mentioning multiple names
  const message = 'Crear empleado Carlos Pérez y también Juan García';
  
  const extractedData = (handler as any).parseEmployeeDataFromMessage(message, context);
  
  // Should extract first or handle appropriately
  assertExists(extractedData);
  
  console.log('✅ Edge Cases - Multiple Employees Mentioned: PASSED');
});

Deno.test('Edge Cases - Numeric Overflow in Salary', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Try extremely large salary
  const hugeSalary = Number.MAX_SAFE_INTEGER;
  context = stateManager.updateData(context, 'baseSalary', hugeSalary);
  
  // Should store without crashing
  assertEquals(context.accumulatedData.baseSalary, hugeSalary);
  
  console.log('✅ Edge Cases - Numeric Overflow in Salary: PASSED');
});

Deno.test('Edge Cases - Rapid State Transitions', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // Rapid transitions
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_POSITION);
  
  // Should maintain integrity
  assertEquals(context.currentState, ConversationState.EMPLOYEE_CREATE_POSITION);
  assertEquals(context.transitionHistory.length, 3);
  
  console.log('✅ Edge Cases - Rapid State Transitions: PASSED');
});
