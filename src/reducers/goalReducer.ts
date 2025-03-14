import { 
  GoalState, 
  GoalEvent, 
  GoalClarificationState,
  GoalContext,
  Question,
  GoalAnalysis,
  ClarificationEntry
} from '@/types/goal';

const initialContext: GoalContext = {
  clarificationHistory: [],
  missingElements: [],
  confidenceLevel: 0
};

export const initialState: GoalState = {
  currentStage: 'initial',
  goal: {},
  analysis: null,
  questions: [],
  context: initialContext
};

// Helper function to create a new clarification entry
const createEntry = (
  type: ClarificationEntry['type'],
  content: string,
  metadata?: Record<string, any>
): ClarificationEntry => ({
  id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date().toISOString(),
  type,
  content,
  metadata
});

// Helper function to update context with new entry
const updateContext = (
  context: GoalContext,
  entry: ClarificationEntry,
  analysis?: GoalAnalysis | null
): GoalContext => ({
  ...context,
  clarificationHistory: [...context.clarificationHistory, entry],
  ...(analysis && {
    category: analysis.category,
    missingElements: analysis.missingElements,
    confidenceLevel: analysis.confidence,
    lastAnalysis: analysis
  })
});

export function goalReducer(state: GoalState, event: GoalEvent): GoalState {
  console.log('[GoalReducer] Processing event:', event.type, event.payload);
  
  switch (event.type) {
    case 'GOAL_INPUT': {
      // User has provided initial goal input
      const entry = createEntry('answer', event.payload);
      const newContext = updateContext(state.context, entry);
      
      return {
        ...state,
        currentStage: 'analysis',
        goal: { ...state.goal, title: event.payload },
        context: newContext
      };
    }
    
    case 'ANALYSIS_COMPLETE': {
      const analysis = event.payload;
      const entry = createEntry('suggestion', 
        `Analysis completed with confidence level: ${analysis.confidence}`,
        { analysis }
      );
      const newContext = updateContext(state.context, entry, analysis);
      
      // Determine next stage based on completeness
      const nextStage: GoalClarificationState['stage'] = 
        analysis.completeness > 80 ? 'planning' : 'clarification';
      
      return {
        ...state,
        currentStage: nextStage,
        analysis,
        questions: analysis.suggestedQuestions,
        context: newContext
      };
    }
    
    case 'QUESTION_ANSWERED': {
      const { questionId, answer } = event.payload;
      const question = state.questions.find(q => q.id === questionId);
      
      if (!question) {
        console.error('Question not found:', questionId);
        return state;
      }
      
      const entry = createEntry('answer', answer, { questionId, question });
      const newContext = updateContext(state.context, entry);
      
      // Remove answered question from the list
      const remainingQuestions = state.questions.filter(q => q.id !== questionId);
      
      // Move to planning if all questions are answered
      const nextStage = remainingQuestions.length === 0 ? 'planning' : state.currentStage;
      
      return {
        ...state,
        currentStage: nextStage,
        questions: remainingQuestions,
        context: newContext
      };
    }
    
    case 'CLARIFICATION_NEEDED': {
      const newQuestions = event.payload;
      const entry = createEntry('question', 
        `New clarification questions added: ${newQuestions.length}`,
        { questions: newQuestions }
      );
      const newContext = updateContext(state.context, entry);
      
      return {
        ...state,
        currentStage: 'clarification',
        questions: [...state.questions, ...newQuestions],
        context: newContext
      };
    }
    
    case 'PLAN_GENERATED': {
      const tasks = event.payload;
      const entry = createEntry('suggestion', 
        `Task plan generated with ${tasks.length} tasks`,
        { tasks }
      );
      const newContext = updateContext(state.context, entry);
      
      return {
        ...state,
        currentStage: 'refinement',
        goal: { ...state.goal, tasks },
        context: newContext
      };
    }
    
    case 'FEEDBACK_PROVIDED': {
      const feedback = event.payload;
      const entry = createEntry('feedback', feedback);
      const newContext = updateContext(state.context, entry);
      
      return {
        ...state,
        context: newContext
      };
    }
    
    case 'RESET':
      return initialState;
    
    default:
      console.error('Unknown event type:', (event as any).type);
      return state;
  }
} 