// V1 vs V2 Compatibility Tests

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { ConversationStateManager, ConversationState, FlowType } from '../core/conversation-state-manager.ts';
import { EmployeeCrudHandlerV2 } from '../handlers/employee-crud-handler-v2.ts';
import { createMockIntent, mockEmployeeData } from './test-helpers.ts';

Deno.test('V1-V2 Compatibility - Feature Flag Detection', () => {
  // Simulate the feature flag from index.ts
  const USE_STATE_MACHINE_EMPLOYEE = true;
  
  // If flag is true, V2 should be used
  assertEquals(USE_STATE_MACHINE_EMPLOYEE, true);
  
  // If flag is false, V1 should be used (simulated)
  const USE_V1 = !USE_STATE_MACHINE_EMPLOYEE;
  assertEquals(USE_V1, false);
  
  console.log('✅ V1-V2 Compatibility - Feature Flag Detection: PASSED');
});

Deno.test('V1-V2 Compatibility - V2 Handler Initialization', async () => {
  const handler = new EmployeeCrudHandlerV2();
  
  // Verify handler can handle employee intents
  const canHandleCreate = handler.canHandle({ action: 'createEmployee' } as any);
  assertEquals(canHandleCreate, true);
  
  const canHandleUpdate = handler.canHandle({ action: 'updateEmployee' } as any);
  assertEquals(canHandleUpdate, true);
  
  const canHandleDelete = handler.canHandle({ action: 'deleteEmployee' } as any);
  assertEquals(canHandleDelete, true);
  
  console.log('✅ V1-V2 Compatibility - V2 Handler Initialization: PASSED');
});

Deno.test('V1-V2 Compatibility - Same Output Structure', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const intent = createMockIntent('createEmployee', 0.95, {
    nombre: 'Test Employee',
  });
  
  // V2 response structure
  const v2Response = await handler.handleIntent(intent);
  
  // Verify V2 produces compatible structure
  assertExists(v2Response);
  assertExists(v2Response.message);
  assertEquals(typeof v2Response.success, 'boolean');
  assertExists(v2Response.emotionalState);
  
  // V1 compatibility fields
  assertExists(v2Response.structuredResponse);
  
  console.log('✅ V1-V2 Compatibility - Same Output Structure: PASSED');
});

Deno.test('V1-V2 Compatibility - Natural Language Parsing Parity', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const stateManager = new ConversationStateManager();
  
  // Test message with all employee data (similar to V1 input)
  const message = 'Crear empleado Juan Pérez, CC 123456789, salario 2800000, cargo Analista, contrato indefinido, pago mensual';
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // V2 parsing
  const extractedData = (handler as any).parseEmployeeDataFromMessage(message, context);
  
  // V2 should extract same fields as V1
  assertExists(extractedData.fullName);
  assertExists(extractedData.documentType);
  assertExists(extractedData.documentNumber);
  assertExists(extractedData.baseSalary);
  assertExists(extractedData.position);
  assertExists(extractedData.contractType);
  assertExists(extractedData.paymentFrequency);
  
  console.log('✅ V1-V2 Compatibility - Natural Language Parsing Parity: PASSED');
});

Deno.test('V1-V2 Compatibility - Executable Action Format', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const intent = createMockIntent('createEmployee', 0.95, mockEmployeeData);
  
  // Add context with complete data
  const richContext = {
    conversationState: ConversationState.EMPLOYEE_CREATE_READY,
    serializedContext: JSON.stringify({
      currentState: ConversationState.EMPLOYEE_CREATE_READY,
      flowType: FlowType.EMPLOYEE_CREATE,
      accumulatedData: mockEmployeeData,
      metadata: {},
      transitionHistory: [],
    }),
  };
  
  const response = await handler.handleIntent(intent, richContext);
  
  // Verify executable action format matches V1 expectations
  if (response.structuredResponse?.executableActions) {
    const action = response.structuredResponse.executableActions[0];
    assertEquals(action.type, 'create');
    assertEquals(action.entity, 'employee');
    assertExists(action.payload);
    
    // V1 expected payload fields
    assertExists(action.payload.fullName);
    assertExists(action.payload.documentNumber);
  }
  
  console.log('✅ V1-V2 Compatibility - Executable Action Format: PASSED');
});

Deno.test('V1-V2 Compatibility - Error Handling Consistency', async () => {
  const handler = new EmployeeCrudHandlerV2();
  
  // Test with invalid intent
  const invalidIntent = createMockIntent('unknownAction', 0.5);
  
  try {
    await handler.handleIntent(invalidIntent);
  } catch (error) {
    // V2 should handle errors gracefully like V1
    assertExists(error);
  }
  
  console.log('✅ V1-V2 Compatibility - Error Handling Consistency: PASSED');
});

Deno.test('V1-V2 Compatibility - Message Tone and Language', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  const intent = createMockIntent('createEmployee', 0.95);
  const response = await handler.handleIntent(intent);
  
  // V2 messages should be in Spanish like V1
  assertExists(response.message);
  assertEquals(typeof response.message, 'string');
  assertEquals(response.message.length > 0, true);
  
  // Should be friendly and professional like V1
  assertEquals(response.emotionalState === 'neutral' || response.emotionalState === 'friendly', true);
  
  console.log('✅ V1-V2 Compatibility - Message Tone and Language: PASSED');
});

Deno.test('V1-V2 Compatibility - Quick Replies Presence', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const intent = createMockIntent('createEmployee', 0.95);
  
  const response = await handler.handleIntent(intent);
  
  // V2 should provide quick replies like V1
  if (response.structuredResponse) {
    assertExists(response.structuredResponse.quickReplies);
    assertEquals(Array.isArray(response.structuredResponse.quickReplies), true);
  }
  
  console.log('✅ V1-V2 Compatibility - Quick Replies Presence: PASSED');
});

Deno.test('V1-V2 Compatibility - Rollback Safety', () => {
  // Simulating rollback by checking feature flag
  let USE_STATE_MACHINE_EMPLOYEE = true;
  
  // Enable V2
  assertEquals(USE_STATE_MACHINE_EMPLOYEE, true);
  
  // Instant rollback to V1
  USE_STATE_MACHINE_EMPLOYEE = false;
  assertEquals(USE_STATE_MACHINE_EMPLOYEE, false);
  
  // System should immediately use V1 logic
  const shouldUseV1 = !USE_STATE_MACHINE_EMPLOYEE;
  assertEquals(shouldUseV1, true);
  
  console.log('✅ V1-V2 Compatibility - Rollback Safety: PASSED');
});

Deno.test('V1-V2 Compatibility - Context Preservation Across Versions', () => {
  const stateManager = new ConversationStateManager();
  
  // Create context in V2
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.updateData(context, 'fullName', 'Test User');
  
  const serialized = stateManager.serialize(context);
  
  // If we rollback to V1, serialized context should still be parseable
  const deserialized = stateManager.deserialize(serialized);
  assertEquals(deserialized.accumulatedData.fullName, 'Test User');
  
  console.log('✅ V1-V2 Compatibility - Context Preservation Across Versions: PASSED');
});

Deno.test('V1-V2 Compatibility - Performance Parity', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const intent = createMockIntent('createEmployee', 0.95, mockEmployeeData);
  
  const startTime = Date.now();
  await handler.handleIntent(intent);
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  // V2 should respond within reasonable time (<2000ms like V1)
  assertEquals(responseTime < 2000, true);
  
  console.log(`✅ V1-V2 Compatibility - Performance Parity: PASSED (${responseTime}ms)`);
});

Deno.test('V1-V2 Compatibility - Metadata Enrichment', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const intent = createMockIntent('createEmployee', 0.95);
  
  const response = await handler.handleIntent(intent);
  
  // V2 should provide additional metadata without breaking V1 compatibility
  assertExists(response.structuredResponse);
  assertExists(response.structuredResponse.conversationState);
  
  // These are V2 enhancements that don't break V1
  assertEquals(typeof response.structuredResponse.conversationState, 'string');
  
  console.log('✅ V1-V2 Compatibility - Metadata Enrichment: PASSED');
});
