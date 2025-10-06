import { GuidedFlow, FlowState, FlowType, ValidationRule } from '../types/GuidedFlow';
import { employeeManagementFlow } from '../flows/employeeManagementFlow';

export class GuidedFlowManager {
  private static instance: GuidedFlowManager;
  private flows: Map<FlowType, GuidedFlow> = new Map();
  private activeFlows: Map<string, FlowState> = new Map();

  private constructor() {
    // Register all available flows
    this.registerFlow(employeeManagementFlow);
  }

  static getInstance(): GuidedFlowManager {
    if (!GuidedFlowManager.instance) {
      GuidedFlowManager.instance = new GuidedFlowManager();
    }
    return GuidedFlowManager.instance;
  }

  registerFlow(flow: GuidedFlow): void {
    this.flows.set(flow.id, flow);
    console.log(`✅ Flow registered: ${flow.name}`);
  }

  startFlow(flowId: FlowType): FlowState {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    const flowState: FlowState = {
      flowId,
      currentStep: flow.initialStep,
      accumulatedData: {},
      history: [],
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };

    const sessionId = `${flowId}_${Date.now()}`;
    this.activeFlows.set(sessionId, flowState);

    console.log(`🚀 Flow started: ${flow.name}`, flowState);
    return flowState;
  }

  getCurrentStep(flowState: FlowState): any {
    const flow = this.flows.get(flowState.flowId);
    if (!flow) return null;

    const step = flow.steps[flowState.currentStep];
    if (!step) return null;

    // Interpolate message if it's a function
    const message = typeof step.message === 'function' 
      ? step.message(flowState.accumulatedData)
      : step.message;

    // Process quick replies to replace 'custom' values with actual dates
    const quickReplies = step.quickReplies?.map(reply => {
      if (reply.value === 'custom') return reply;
      // For date quick replies, ensure they have current date
      if (step.id === 'start_date' && reply.label === '📅 Hoy') {
        return {
          ...reply,
          value: new Date().toISOString().split('T')[0]
        };
      }
      return reply;
    });

    return {
      ...step,
      message,
      quickReplies
    };
  }

  async advance(
    flowState: FlowState, 
    userInput: string
  ): Promise<{ 
    flowState: FlowState; 
    currentStep: any; 
    validationError?: string 
  }> {
    const flow = this.flows.get(flowState.flowId);
    if (!flow) {
      throw new Error(`Flow ${flowState.flowId} not found`);
    }

    const currentStep = flow.steps[flowState.currentStep];
    if (!currentStep) {
      throw new Error(`Step ${flowState.currentStep} not found in flow ${flowState.flowId}`);
    }

    // Validate input if step has validation rules
    if (currentStep.validationRules && userInput !== 'cancel') {
      const validationError = this.validateInput(userInput, currentStep.validationRules);
      if (validationError) {
        return {
          flowState,
          currentStep: this.getCurrentStep(flowState),
          validationError
        };
      }
    }

    // Store data from current step
    if (userInput && userInput !== 'cancel' && currentStep.type !== 'greeting') {
      // Map step IDs to data keys
      const dataKey = currentStep.id;
      flowState.accumulatedData[dataKey] = userInput;
    }

    // Add current step to history
    flowState.history.push(flowState.currentStep);

    // Determine next step
    const nextStepId = typeof currentStep.nextStep === 'function'
      ? currentStep.nextStep(flowState.accumulatedData, userInput)
      : currentStep.nextStep;

    flowState.currentStep = nextStepId;
    flowState.lastUpdatedAt = new Date().toISOString();

    console.log(`➡️ Advanced to step: ${nextStepId}`, {
      data: flowState.accumulatedData,
      history: flowState.history
    });

    return {
      flowState,
      currentStep: this.getCurrentStep(flowState)
    };
  }

  goBack(flowState: FlowState): FlowState | null {
    if (flowState.history.length === 0) {
      return null;
    }

    const previousStep = flowState.history.pop();
    if (!previousStep) return null;

    flowState.currentStep = previousStep;
    flowState.lastUpdatedAt = new Date().toISOString();

    console.log(`⬅️ Went back to step: ${previousStep}`);
    return flowState;
  }

  cancelFlow(flowState: FlowState): void {
    const sessionId = Array.from(this.activeFlows.entries())
      .find(([_, state]) => state === flowState)?.[0];
    
    if (sessionId) {
      this.activeFlows.delete(sessionId);
      console.log(`❌ Flow cancelled: ${flowState.flowId}`);
    }
  }

  completeFlow(flowState: FlowState): void {
    const sessionId = Array.from(this.activeFlows.entries())
      .find(([_, state]) => state === flowState)?.[0];
    
    if (sessionId) {
      this.activeFlows.delete(sessionId);
      console.log(`✅ Flow completed: ${flowState.flowId}`, {
        data: flowState.accumulatedData,
        duration: new Date().getTime() - new Date(flowState.startedAt).getTime()
      });
    }
  }

  private validateInput(input: string, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!input || input.trim() === '') {
            return rule.message;
          }
          break;

        case 'minLength':
          if (input.length < rule.value) {
            return rule.message;
          }
          break;

        case 'maxLength':
          if (input.length > rule.value) {
            return rule.message;
          }
          break;

        case 'min':
          if (Number(input) < rule.value) {
            return rule.message;
          }
          break;

        case 'max':
          if (Number(input) > rule.value) {
            return rule.message;
          }
          break;

        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
            return rule.message;
          }
          break;

        case 'pattern':
          if (!rule.value.test(input)) {
            return rule.message;
          }
          break;

        case 'custom':
          if (rule.validator && !rule.validator(input)) {
            return rule.message;
          }
          break;
      }
    }

    return null;
  }

  async executeFlowAction(flowState: FlowState): Promise<any> {
    // This will be called when execution step is reached
    // Here we'll integrate with the actual backend to create the employee
    console.log(`🎯 Executing flow action for ${flowState.flowId}`, flowState.accumulatedData);
    
    // TODO: Implement actual backend call based on flow type
    // For now, return success simulation
    return {
      success: true,
      data: flowState.accumulatedData
    };
  }
}
