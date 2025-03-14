import { useReducer, useCallback } from 'react';
import { 
  goalReducer, 
  initialState 
} from '@/reducers/goalReducer';
import {
  analyzeGoalInput,
  generateNextQuestion,
  generateTaskPlan,
  processFeedback
} from '@/services/goalAI';
import type {
  Goal,
  GoalTask,
  Question,
  GoalState,
  GoalEvent,
  GoalAnalysis
} from '@/types/goal';

// Debug logging
const log = (message: string, data?: any) => {
  console.log(`[useGoalCreation] ${message}`, data ? data : '');
};

export function useGoalCreation() {
  const [state, dispatch] = useReducer(goalReducer, initialState);
  
  // Handle initial goal input
  const handleGoalInput = useCallback(async (input: string) => {
    log('Handling goal input:', input);
    
    try {
      // Update state with user input
      dispatch({ type: 'GOAL_INPUT', payload: input });
      
      // Analyze the goal
      const analysis = await analyzeGoalInput(input, state.context);
      dispatch({ type: 'ANALYSIS_COMPLETE', payload: analysis });
      
      // If completeness is low, generate clarifying questions
      if (analysis.completeness < 80) {
        const question = await generateNextQuestion(
          { title: input },
          { ...state.context, lastAnalysis: analysis }
        );
        dispatch({ 
          type: 'CLARIFICATION_NEEDED', 
          payload: [question]
        });
      }
    } catch (error) {
      log('Error handling goal input:', error);
      throw error;
    }
  }, [state.context]);
  
  // Handle question answers
  const handleQuestionAnswer = useCallback(async (
    questionId: string,
    answer: string
  ) => {
    log('Handling question answer:', { questionId, answer });
    
    try {
      dispatch({
        type: 'QUESTION_ANSWERED',
        payload: { questionId, answer }
      });
      
      // Generate next question if needed
      if (state.questions.length === 0) {
        const nextQuestion = await generateNextQuestion(
          state.goal,
          state.context
        );
        
        if (nextQuestion) {
          dispatch({
            type: 'CLARIFICATION_NEEDED',
            payload: [nextQuestion]
          });
        } else {
          // If no more questions, generate task plan
          const tasks = await generateTaskPlan(state.goal, state.context);
          dispatch({ type: 'PLAN_GENERATED', payload: tasks });
        }
      }
    } catch (error) {
      log('Error handling question answer:', error);
      throw error;
    }
  }, [state.goal, state.context, state.questions.length]);
  
  // Handle plan feedback
  const handlePlanFeedback = useCallback(async (feedback: string) => {
    log('Handling plan feedback:', feedback);
    
    try {
      dispatch({ type: 'FEEDBACK_PROVIDED', payload: feedback });
      
      const result = await processFeedback(
        state.goal,
        feedback,
        state.context
      );
      
      if (result.updatedTasks.length > 0) {
        dispatch({ type: 'PLAN_GENERATED', payload: result.updatedTasks });
      }
      
      // If confidence is still low, generate more questions
      if (result.confidenceLevel < 0.8) {
        const question = await generateNextQuestion(
          state.goal,
          state.context
        );
        dispatch({
          type: 'CLARIFICATION_NEEDED',
          payload: [question]
        });
      }
    } catch (error) {
      log('Error handling plan feedback:', error);
      throw error;
    }
  }, [state.goal, state.context]);
  
  // Reset the flow
  const reset = useCallback(() => {
    log('Resetting goal creation flow');
    dispatch({ type: 'RESET' });
  }, []);
  
  return {
    state,
    handleGoalInput,
    handleQuestionAnswer,
    handlePlanFeedback,
    reset,
    // Computed properties
    isLoading: state.currentStage === 'analysis',
    currentQuestion: state.questions[0],
    hasMoreQuestions: state.questions.length > 0,
    isComplete: state.currentStage === 'refinement' && 
                state.context.confidenceLevel >= 0.8
  };
} 