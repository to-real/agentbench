// AgentBench 自动化测试引擎类型定义
export interface TestScript {
  id: string
  name: string
  description: string
  targetAgent: string
  category: 'code_generation' | 'problem_solving' | 'interaction'
  difficulty: 1 | 2 | 3 | 4 | 5
  estimatedTime: number // 预估执行时间（秒）
  steps: TestStep[]
  successCriteria: SuccessCriteria[]
  tags: string[]
}

export interface TestStep {
  id: string
  name: string
  type: 'navigate' | 'click' | 'type' | 'wait' | 'verify' | 'extract' | 'screenshot'
  selector?: string
  value?: string
  timeout?: number
  expected?: string
  description: string
  retryCount?: number
  retryDelay?: number
}

export interface SuccessCriteria {
  id: string
  type: 'text_contains' | 'element_exists' | 'code_runs' | 'response_time' | 'no_errors'
  target: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_exists'
  value: string | number
  weight: number // 权重，用于计算最终得分
}

export interface TestExecution {
  id: string
  scriptId: string
  sessionId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  startTime: number
  endTime?: number
  currentStep: number
  steps: StepExecution[]
  scores: TestScores
  evidence: Evidence[]
  errors: TestError[]
  metadata: ExecutionMetadata
}

export interface StepExecution {
  stepId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime?: number
  endTime?: number
  result?: any
  error?: string
  screenshots?: string[]
  networkLogs?: NetworkLog[]
  consoleLogs?: ConsoleLog[]
}

export interface TestScores {
  core_delivery_capability: {
    first_try_success_rate: ScoreValue
    first_try_completion_rate: ScoreValue
    first_try_usability: ScoreValue
  }
  cognition_planning_capability: {
    problem_understanding: ScoreValue
    planning_ability: ScoreValue
    requirement_clarification: ScoreValue
  }
  interaction_communication_capability: {
    communication_clarity: ScoreValue
    feedback_response: ScoreValue
  }
  efficiency_resourcefulness_capability: {
    code_efficiency: ScoreValue
    resource_optimization: ScoreValue
  }
  engineering_scalability_capability: {
    code_quality: ScoreValue
    maintainability: ScoreValue
    scalability: ScoreValue
    error_handling: ScoreValue
    documentation: ScoreValue
  }
}

export interface ScoreValue {
  value: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
  factors: string[]
  evidence: string[]
}

export interface Evidence {
  id: string
  type: 'screenshot' | 'video' | 'network_log' | 'console_log' | 'code_snippet'
  url?: string
  data?: any
  timestamp: number
  stepId: string
  importance: number
  analysis?: EvidenceAnalysis
}

export interface EvidenceAnalysis {
  quality: number
  relevance: number
  tags: string[]
  summary: string
  insights: string[]
}

export interface TestError {
  id: string
  stepId: string
  type: 'timeout' | 'element_not_found' | 'network_error' | 'script_error' | 'validation_error'
  message: string
  stack?: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ExecutionMetadata {
  userAgent: string
  viewport: { width: number; height: number }
  networkConditions: {
    offline: boolean
    latency: number
    downloadThroughput: number
    uploadThroughput: number
  }
  environment: 'development' | 'testing' | 'production'
  version: string
}

export interface NetworkLog {
  url: string
  method: string
  status: number
  type: string
  timestamp: number
  duration: number
  size: number
  requestId: string
}

export interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
  source: string
  line?: number
}

export interface TestEvent {
  type: 'start' | 'step_start' | 'step_complete' | 'error' | 'screenshot' | 'network_request' | 'console_log'
  timestamp: number
  sessionId: string
  stepId?: string
  data: any
}

export interface AIAnalysis {
  type: 'realtime' | 'step_complete' | 'final'
  scores: Partial<TestScores>
  insights: string[]
  suggestions: string[]
  confidence: number
  requiresEvidence: boolean
  nextActions: string[]
}

export interface TestResult {
  executionId: string
  scriptId: string
  sessionId: string
  status: 'completed' | 'failed' | 'timeout'
  startTime: number
  endTime: number
  duration: number
  totalSteps: number
  completedSteps: number
  successRate: number
  scores: TestScores
  evidence: Evidence[]
  errors: TestError[]
  summary: {
    overall_score: number
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  }
  metadata: ExecutionMetadata
}

// 测试引擎接口
export interface TestEngine {
  executeScript(script: TestScript, sessionId: string): Promise<TestResult>
  pauseExecution(sessionId: string): Promise<void>
  resumeExecution(sessionId: string): Promise<void>
  stopExecution(sessionId: string): Promise<void>
  getExecutionStatus(sessionId: string): Promise<TestExecution>
  takeScreenshot(): Promise<string>
  getCurrentUrl(): Promise<string>
  getPageContent(): Promise<string>
}

// 监控器接口
export interface Monitor {
  startMonitoring(sessionId: string): void
  stopMonitoring(sessionId: string): void
  recordEvent(event: TestEvent): void
  getEvents(sessionId: string): TestEvent[]
  clearEvents(sessionId: string): void
}

// AI分析器接口
export interface AIAnalyzer {
  analyzeEvent(event: TestEvent, context: TestExecutionContext): Promise<AIAnalysis>
  analyzeStep(step: StepExecution, context: TestExecutionContext): Promise<AIAnalysis>
  analyzeFinalResult(result: TestResult): Promise<AIAnalysis>
}

// 证据收集器接口
export interface EvidenceCollector {
  collectEvidence(event: TestEvent, analysis: AIAnalysis): Promise<Evidence[]>
  processEvidence(evidence: Evidence[]): Promise<ProcessedEvidence[]>
}

export interface ProcessedEvidence {
  original: Evidence
  analysis: EvidenceAnalysis
  relevanceScore: number
  tags: string[]
  summary: string
}

// 评分引擎接口
export interface ScoringEngine {
  calculateStepScore(step: StepExecution, analysis: AIAnalysis): Promise<Partial<TestScores>>
  calculateFinalScore(execution: TestExecution): Promise<TestScores>
  adjustScoreBasedOnContext(score: TestScores, context: TestExecutionContext): TestScores
}

export interface TestExecutionContext {
  sessionId: string
  scriptId: string
  currentStep: number
  totalSteps: number
  startTime: number
  agentName: string
  testCategory: string
  previousEvents: TestEvent[]
  currentUrl: string
  pageContent: string
}