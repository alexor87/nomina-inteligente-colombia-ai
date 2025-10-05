// E2E Tests for Employee Create Flow (V2 State Machine)

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { ConversationStateManager, ConversationState, FlowType } from '../core/conversation-state-manager.ts';
import { StateTransitionValidator } from '../core/state-transition-validator.ts';
import { StateResponseBuilder } from '../core/state-response-builder.ts';
import { EmployeeCrudHandlerV2 } from '../handlers/employee-crud-handler-v2.ts';
import { 
  createMockContext, 
  createMockIntent, 
  mockEmployeeData,
  assertValidTransition,
  extractExecutableAction 
} from './test-helpers.ts';

Deno.test('Employee Create V2 - Happy Path Complete Flow', async () => {
  const stateManager = new ConversationStateManager();
  
  // Step 1: Start creation
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE, 'test-company', 'test-user');
  assertEquals(context.currentState, ConversationState.IDLE);
  
  // Step 2: Transition to start
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  assertEquals(context.currentState, ConversationState.EMPLOYEE_CREATE_START);
  
  // Step 3: Add employee data progressively
  context = stateManager.updateData(context, 'fullName', mockEmployeeData.fullName);
  context = stateManager.updateData(context, 'documentType', mockEmployeeData.documentType);
  context = stateManager.updateData(context, 'documentNumber', mockEmployeeData.documentNumber);
  
  // Step 4: Validate we can transition to salary
  const validation = StateTransitionValidator.validateTransition(
    ConversationState.EMPLOYEE_CREATE_START,
    ConversationState.EMPLOYEE_CREATE_SALARY
  );
  assertEquals(validation.isValid, true);
  
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_SALARY);
  context = stateManager.updateData(context, 'baseSalary', mockEmployeeData.baseSalary);
  
  // Step 5: Add position and contract details
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_POSITION);
  context = stateManager.updateData(context, 'position', mockEmployeeData.position);
  context = stateManager.updateData(context, 'contractType', mockEmployeeData.contractType);
  context = stateManager.updateData(context, 'paymentFrequency', mockEmployeeData.paymentFrequency);
  
  // Step 6: Transition to confirmation
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_CONFIRMATION);
  assertEquals(context.currentState, ConversationState.EMPLOYEE_CREATE_CONFIRMATION);
  
  // Step 7: Verify all data is present
  assertEquals(context.accumulatedData.fullName, mockEmployeeData.fullName);
  assertEquals(context.accumulatedData.documentNumber, mockEmployeeData.documentNumber);
  assertEquals(context.accumulatedData.baseSalary, mockEmployeeData.baseSalary);
  
  // Step 8: Transition to ready
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_READY);
  assertEquals(stateManager.isFlowComplete(context), true);
  
  console.log('✅ Employee Create V2 - Happy Path Complete Flow: PASSED');
});

Deno.test('Employee Create V2 - Natural Language Data Extraction', async () => {
  const handler = new EmployeeCrudHandlerV2();
  const stateManager = new ConversationStateManager();
  
  // Simulate natural language message
  const message = 'Quiero crear un empleado llamado Juan Pérez, con CC 9876543210, salario de 3500000 y cargo de Diseñador';
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // Parse data from message
  const extractedData = (handler as any).parseEmployeeDataFromMessage(message, context);
  
  // Verify extraction
  assertExists(extractedData.fullName);
  assertExists(extractedData.documentType);
  assertExists(extractedData.documentNumber);
  assertExists(extractedData.baseSalary);
  assertExists(extractedData.position);
  
  console.log('✅ Employee Create V2 - Natural Language Data Extraction: PASSED');
});

Deno.test('Employee Create V2 - Missing Data Prompts', async () => {
  const stateManager = new ConversationStateManager();
  const responseBuilder = new StateResponseBuilder();
  
  // Create context with partial data
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  context = stateManager.updateData(context, 'fullName', 'Ana García');
  
  // Try to move forward without required fields
  const validation = StateTransitionValidator.validateRequiredFields(
    ConversationState.EMPLOYEE_CREATE_SALARY,
    context
  );
  
  assertEquals(validation.isValid, false);
  assertExists(validation.missingFields);
  assertEquals(validation.missingFields!.length > 0, true);
  
  // Build response for missing fields
  const response = responseBuilder.buildMissingFieldsResponse(
    validation.missingFields!,
    context.currentState
  );
  
  assertExists(response.message);
  assertEquals(response.success, true);
  
  console.log('✅ Employee Create V2 - Missing Data Prompts: PASSED');
});

Deno.test('Employee Create V2 - State Transition Validation', async () => {
  // Test valid transition
  const validTransition = StateTransitionValidator.validateTransition(
    ConversationState.EMPLOYEE_CREATE_START,
    ConversationState.EMPLOYEE_CREATE_SALARY
  );
  assertEquals(validTransition.isValid, true);
  
  // Test invalid transition (skip steps)
  const invalidTransition = StateTransitionValidator.validateTransition(
    ConversationState.EMPLOYEE_CREATE_START,
    ConversationState.EMPLOYEE_CREATE_READY
  );
  assertEquals(invalidTransition.isValid, false);
  assertExists(invalidTransition.errors);
  
  console.log('✅ Employee Create V2 - State Transition Validation: PASSED');
});

Deno.test('Employee Create V2 - Confirmation and Execution', async () => {
  const stateManager = new ConversationStateManager();
  const responseBuilder = new StateResponseBuilder();
  
  // Create complete context
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  
  // Add all required data
  Object.entries(mockEmployeeData).forEach(([key, value]) => {
    context = stateManager.updateData(context, key, value);
  });
  
  // Transition to confirmation
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_CONFIRMATION);
  
  // Build confirmation response
  const confirmationResponse = responseBuilder.buildConfirmationResponse(context);
  assertExists(confirmationResponse.message);
  assertExists(confirmationResponse.structuredResponse?.quickReplies);
  
  // Simulate user confirmation
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_READY);
  
  // Build executable action
  const executableAction = responseBuilder.buildExecutableActionFromContext(
    FlowType.EMPLOYEE_CREATE,
    context
  );
  
  assertExists(executableAction);
  assertEquals(executableAction.type, 'create');
  assertEquals(executableAction.entity, 'employee');
  assertExists(executableAction.payload);
  
  console.log('✅ Employee Create V2 - Confirmation and Execution: PASSED');
});

Deno.test('Employee Create V2 - Cancellation at Any State', async () => {
  const stateManager = new ConversationStateManager();
  const responseBuilder = new StateResponseBuilder();
  
  // Test cancellation from different states
  const testStates = [
    ConversationState.EMPLOYEE_CREATE_START,
    ConversationState.EMPLOYEE_CREATE_SALARY,
    ConversationState.EMPLOYEE_CREATE_POSITION,
  ];
  
  for (const state of testStates) {
    let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
    context = stateManager.transitionTo(context, state);
    
    // Check if cancellation is allowed
    const canCancel = StateTransitionValidator.canCancel(state);
    assertEquals(canCancel, true);
    
    // Perform cancellation
    context = stateManager.transitionTo(context, ConversationState.IDLE, 'user', 'cancelar');
    assertEquals(context.currentState, ConversationState.IDLE);
    
    // Build cancellation response
    const response = responseBuilder.buildCancellationResponse('Operación cancelada');
    assertExists(response.message);
  }
  
  console.log('✅ Employee Create V2 - Cancellation at Any State: PASSED');
});

Deno.test('Employee Create V2 - Flow Progress Calculation', () => {
  const stateManager = new ConversationStateManager();
  
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  
  // At IDLE, progress should be 0
  let progress = stateManager.getFlowProgress(context);
  assertEquals(progress, 0);
  
  // At START, progress should increase
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  progress = stateManager.getFlowProgress(context);
  assertEquals(progress > 0, true);
  
  // At READY, progress should be 100
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_CONFIRMATION);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_READY);
  progress = stateManager.getFlowProgress(context);
  assertEquals(progress, 100);
  
  console.log('✅ Employee Create V2 - Flow Progress Calculation: PASSED');
});

Deno.test('Employee Create V2 - Context Serialization/Deserialization', () => {
  const stateManager = new ConversationStateManager();
  
  // Create and populate context
  let context = stateManager.createNewContext(FlowType.EMPLOYEE_CREATE);
  context = stateManager.transitionTo(context, ConversationState.EMPLOYEE_CREATE_START);
  context = stateManager.updateData(context, 'fullName', 'Test Employee');
  context = stateManager.updateData(context, 'baseSalary', 2000000);
  
  // Serialize
  const serialized = stateManager.serialize(context);
  assertExists(serialized);
  assertEquals(typeof serialized, 'string');
  
  // Deserialize
  const deserialized = stateManager.deserialize(serialized);
  assertEquals(deserialized.currentState, context.currentState);
  assertEquals(deserialized.flowType, context.flowType);
  assertEquals(deserialized.accumulatedData.fullName, 'Test Employee');
  assertEquals(deserialized.accumulatedData.baseSalary, 2000000);
  
  console.log('✅ Employee Create V2 - Context Serialization/Deserialization: PASSED');
});
