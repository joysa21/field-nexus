export interface AgentLog {
  agent: string;
  timestamp: string;
  decision: string;
  reasoning: string;
}

export interface Alert {
  type: 'skill_gap' | 'overload' | 'critical_unassigned' | 'reallocation';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AgentState {
  rawInput: string;
  issues: any[];
  volunteers: any[];
  assignments: any[];
  alerts: Alert[];
  agentLogs: AgentLog[];
  currentStep: string;
  isComplete: boolean;
}

// TODO: implement each agent

export const runIngestionAgent = async (state: AgentState): Promise<AgentState> => {
  // Will use Gemini to detect input type and clean text
  return {
    ...state,
    currentStep: 'ingestion',
    agentLogs: [
      ...state.agentLogs,
      {
        agent: 'Ingestion Agent',
        timestamp: new Date().toISOString(),
        decision: 'Stub — not yet implemented',
        reasoning: 'Placeholder',
      },
    ],
  };
};

export const runExtractionAgent = async (state: AgentState): Promise<AgentState> => {
  // TODO: Will call Gemini to extract issues from raw text
  return {
    ...state,
    currentStep: 'extraction',
    agentLogs: [
      ...state.agentLogs,
      {
        agent: 'Extraction Agent',
        timestamp: new Date().toISOString(),
        decision: 'Stub — not yet implemented',
        reasoning: 'Placeholder',
      },
    ],
  };
};

export const runScoringAgent = async (state: AgentState): Promise<AgentState> => {
  // TODO: Will compute priority scores using formula
  return {
    ...state,
    currentStep: 'scoring',
    agentLogs: [
      ...state.agentLogs,
      {
        agent: 'Scoring Agent',
        timestamp: new Date().toISOString(),
        decision: 'Stub — not yet implemented',
        reasoning: 'Placeholder',
      },
    ],
  };
};

export const runGapDetectionAgent = async (state: AgentState): Promise<AgentState> => {
  // TODO: Will detect skill gaps and capacity alerts
  return {
    ...state,
    currentStep: 'gap_detection',
    agentLogs: [
      ...state.agentLogs,
      {
        agent: 'Gap Detection Agent',
        timestamp: new Date().toISOString(),
        decision: 'Stub — not yet implemented',
        reasoning: 'Placeholder',
      },
    ],
  };
};

export const runMatchingAgent = async (state: AgentState): Promise<AgentState> => {
  // TODO: Will assign volunteers to issues
  return {
    ...state,
    currentStep: 'matching',
    agentLogs: [
      ...state.agentLogs,
      {
        agent: 'Matching Agent',
        timestamp: new Date().toISOString(),
        decision: 'Stub — not yet implemented',
        reasoning: 'Placeholder',
      },
    ],
  };
};

export const runReallocationAgent = async (state: AgentState): Promise<AgentState> => {
  // TODO: Will rebalance overloaded volunteers
  return {
    ...state,
    currentStep: 'reallocation',
    agentLogs: [
      ...state.agentLogs,
      {
        agent: 'Reallocation Agent',
        timestamp: new Date().toISOString(),
        decision: 'Stub — not yet implemented',
        reasoning: 'Placeholder',
      },
    ],
  };
};

export const runReportAgent = async (state: AgentState): Promise<AgentState> => {
  // TODO: Will generate final summary
  return {
    ...state,
    currentStep: 'complete',
    isComplete: true,
    agentLogs: [
      ...state.agentLogs,
      {
        agent: 'Report Agent',
        timestamp: new Date().toISOString(),
        decision: 'Stub — not yet implemented',
        reasoning: 'Placeholder',
      },
    ],
  };
};

// Main orchestrator — calls all agents in sequence
export const runOrchestrator = async (
  rawInput: string,
  volunteers: any[],
  onStepComplete?: (state: AgentState) => void
): Promise<AgentState> => {
  let state: AgentState = {
    rawInput,
    issues: [],
    volunteers,
    assignments: [],
    alerts: [],
    agentLogs: [],
    currentStep: 'starting',
    isComplete: false,
  };

  state = await runIngestionAgent(state);
  onStepComplete?.(state);

  state = await runExtractionAgent(state);
  onStepComplete?.(state);

  state = await runScoringAgent(state);
  onStepComplete?.(state);

  state = await runGapDetectionAgent(state);
  onStepComplete?.(state);

  state = await runMatchingAgent(state);
  onStepComplete?.(state);

  if (state.alerts.some((a) => a.type === 'overload')) {
    state = await runReallocationAgent(state);
    onStepComplete?.(state);
  }

  state = await runReportAgent(state);
  onStepComplete?.(state);

  return state;
};
