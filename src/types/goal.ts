// Types and interfaces for the enhanced goal creation system

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  progress: number;
  startDate?: string;
  endDate?: string;
  finishDate?: string;
  tasks?: GoalTask[];
  aiGenerated?: boolean;
  lastUpdated?: string;
  context?: GoalContext;
}

export interface GoalTask {
  id: string;
  title: string;
  description?: string;
  timeline?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[]; // IDs of tasks this task depends on
}

export interface GoalContext {
  category?: string;
  clarificationHistory: ClarificationEntry[];
  missingElements: string[];
  confidenceLevel: number;
  lastAnalysis?: GoalAnalysis;
  lastUpdated?: string;
}

export interface ClarificationEntry {
  id: string;
  timestamp: string;
  type: 'question' | 'answer' | 'suggestion' | 'feedback';
  content: string;
  metadata?: Record<string, any>;
}

export interface GoalAnalysis {
  completeness: number;
  needsClarification: boolean;
  insights: string;
  suggestedQuestions: QuestionWithOptions[];
  suggestedTasks?: TaskSuggestion[];
}

export interface QuestionWithOptions {
  id: string;
  text: string;
  type: 'choice' | 'yes_no' | 'multiple_choice' | 'text';
  purpose: string;
  options: QuestionOption[];
  priority: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  emoji: string;
  tasks: TaskSuggestion[];
}

export interface TaskSuggestion {
  title: string;
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

export type GoalClarificationState = {
  stage: 'initial' | 'analysis' | 'clarification' | 'planning' | 'refinement';
  completedSteps: string[];
  selectedOptions: Record<string, string>; // questionId -> optionId
  collectedInfo: Record<string, any>;
  context: GoalContext;
}

// Event types for state management
export type GoalEvent = 
  | { type: 'GOAL_INPUT'; payload: string }
  | { type: 'ANALYSIS_COMPLETE'; payload: GoalAnalysis }
  | { type: 'OPTION_SELECTED'; payload: { questionId: string; optionId: string } }
  | { type: 'TASKS_GENERATED'; payload: GoalTask[] }
  | { type: 'TASKS_UPDATED'; payload: GoalTask[] }
  | { type: 'RESET' };

// State machine types
export type GoalState = {
  currentStage: GoalClarificationState['stage'];
  goal: Partial<Goal>;
  analysis: GoalAnalysis | null;
  selectedOptions: Record<string, string>;
  context: GoalContext;
}

// Logging types for debugging
export interface GoalStateLog {
  timestamp: string;
  event: GoalEvent;
  previousState: GoalState;
  nextState: GoalState;
  metadata?: Record<string, any>;
} 