import { 
  Goal, 
  GoalAnalysis, 
  Question, 
  GoalTask, 
  GoalContext,
  ClarificationEntry 
} from '@/types/goal';

// Debug logging
const log = (message: string, data?: any) => {
  console.log(`[GoalAI] ${message}`, data ? data : '');
};

/**
 * Analyzes a goal input to determine completeness and needed clarifications
 */
export async function analyzeGoalInput(
  input: string,
  context?: GoalContext
): Promise<GoalAnalysis> {
  log('Analyzing goal input:', input);
  
  try {
    const response = await fetch('/api/ai/analyze-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        context,
        prompt: `Analyze this goal: "${input}"
        
        Determine:
        1. How complete and specific is this goal (0-100%)?
        2. What key information is missing?
        3. What clarifying questions would help make this goal more actionable?
        4. What category does this goal fall into?
        5. What insights can you provide about this goal?
        
        Consider:
        - Timeframe and deadlines
        - Measurable outcomes
        - Required resources
        - Potential obstacles
        - Dependencies
        
        Format the response as JSON with these fields:
        {
          "completeness": number,
          "missingElements": string[],
          "suggestedQuestions": Question[],
          "insights": string[],
          "category": string,
          "confidence": number
        }`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze goal');
    }

    const analysis = await response.json();
    log('Analysis result:', analysis);
    return analysis;
  } catch (error) {
    log('Error analyzing goal:', error);
    throw error;
  }
}

/**
 * Generates the next most relevant question based on current context
 */
export async function generateNextQuestion(
  goal: Partial<Goal>,
  context: GoalContext
): Promise<Question> {
  log('Generating next question for goal:', goal.title);
  
  try {
    const response = await fetch('/api/ai/generate-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        context,
        prompt: `Based on this goal and context, generate the most important clarifying question to ask next.
        
        Goal: ${goal.title}
        Category: ${context.category || 'Unknown'}
        Missing Elements: ${context.missingElements.join(', ')}
        Previous Questions: ${context.clarificationHistory
          .filter(entry => entry.type === 'question')
          .map(q => q.content)
          .join('\n')}
        
        Return a single question object:
        {
          "id": string,
          "text": string,
          "type": "open" | "multiple_choice" | "yes_no",
          "options"?: string[],
          "purpose": string,
          "priority": number
        }`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate question');
    }

    const question = await response.json();
    log('Generated question:', question);
    return question;
  } catch (error) {
    log('Error generating question:', error);
    throw error;
  }
}

/**
 * Generates a personalized task plan based on the goal and collected information
 */
export async function generateTaskPlan(
  goal: Partial<Goal>,
  context: GoalContext
): Promise<GoalTask[]> {
  log('Generating task plan for goal:', goal.title);
  
  try {
    const response = await fetch('/api/ai/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        context,
        prompt: `Create a detailed task plan for this goal based on all collected information.
        
        Goal: ${goal.title}
        Category: ${context.category}
        Collected Information:
        ${JSON.stringify(context.clarificationHistory, null, 2)}
        
        Generate a list of tasks that:
        1. Break down the goal into manageable steps
        2. Include specific timelines
        3. Consider dependencies between tasks
        4. Prioritize tasks appropriately
        5. Are specific and actionable
        
        Return an array of task objects:
        {
          "id": string,
          "title": string,
          "description": string,
          "timeline": string,
          "priority": "high" | "medium" | "low",
          "dependencies": string[]
        }`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate task plan');
    }

    const tasks = await response.json();
    log('Generated tasks:', tasks);
    return tasks;
  } catch (error) {
    log('Error generating task plan:', error);
    throw error;
  }
}

/**
 * Processes feedback on the current plan and suggests improvements
 */
export async function processFeedback(
  goal: Partial<Goal>,
  feedback: string,
  context: GoalContext
): Promise<{
  updatedTasks: GoalTask[];
  suggestions: string[];
  confidenceLevel: number;
}> {
  log('Processing feedback:', feedback);
  
  try {
    const response = await fetch('/api/ai/process-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        feedback,
        context,
        prompt: `Review this feedback and suggest improvements to the task plan.
        
        Goal: ${goal.title}
        Current Tasks: ${JSON.stringify(goal.tasks, null, 2)}
        Feedback: ${feedback}
        
        Consider:
        1. User's specific concerns
        2. Previous feedback history
        3. Goal context and category
        4. Task dependencies and timeline
        
        Return:
        {
          "updatedTasks": Task[],
          "suggestions": string[],
          "confidenceLevel": number
        }`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to process feedback');
    }

    const result = await response.json();
    log('Feedback processing result:', result);
    return result;
  } catch (error) {
    log('Error processing feedback:', error);
    throw error;
  }
}

/**
 * Updates the goal context with new information
 */
export function updateGoalContext(
  currentContext: GoalContext,
  entry: ClarificationEntry
): GoalContext {
  return {
    ...currentContext,
    clarificationHistory: [...currentContext.clarificationHistory, entry],
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calculates the overall confidence level in the current goal plan
 */
export function calculateConfidence(context: GoalContext): number {
  const weights = {
    completeness: 0.4,
    clarityOfAnswers: 0.3,
    taskSpecificity: 0.3
  };

  // Calculate completeness score
  const completeness = context.lastAnalysis?.completeness || 0;

  // Calculate clarity of answers score
  const answers = context.clarificationHistory.filter(e => e.type === 'answer');
  const clarityScore = answers.length > 0 
    ? answers.reduce((sum, a) => sum + (a.metadata?.confidence || 0), 0) / answers.length 
    : 0;

  // Calculate task specificity score
  const tasks = context.lastAnalysis?.suggestedQuestions || [];
  const taskScore = tasks.length > 0
    ? tasks.reduce((sum, t) => sum + (t.metadata?.specificity || 0), 0) / tasks.length
    : 0;

  return (
    completeness * weights.completeness +
    clarityScore * weights.clarityOfAnswers +
    taskScore * weights.taskSpecificity
  );
} 