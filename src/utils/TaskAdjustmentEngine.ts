/**
 * TaskAdjustmentEngine.ts
 * 
 * A utility for real-time task adjustments based on user feedback and task status changes.
 * This engine allows dynamic modification of tasks without changing the UI/UX.
 */

import { useAppStore } from '@/store/store';
import { taskBuilder } from './TaskBuilder';

/**
 * Types needed for the TaskAdjustmentEngine
 */
interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  important: boolean;
  goalId?: string;
  taskListId: string;
  feedback?: {text: string; timestamp: string}[];
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  completedAt?: string;
  embeddings?: number[];
  relatedTaskIds?: string[];
  type?: 'learning' | 'work' | 'health' | 'other';
}

interface TaskProposal {
  id?: string;
  summary: string;
  steps: string[];
  estimatedTime: string;
  risks: string[];
  historyReferences: string[];
  userAdaptation: string;
}

interface AppStore {
  tasks: Task[];
  updateTask: (id: string, task: Partial<Task>) => void;
  addTaskFeedback: (id: string, feedback: string) => void;
}

/**
 * Implements dynamic task adjustment based on events and feedback
 */
export class TaskAdjustmentEngine {
  private store: AppStore;
  
  constructor() {
    this.store = useAppStore.getState() as unknown as AppStore;
  }
  
  /**
   * Adjust a task based on user feedback
   */
  public adjustTask(taskId: string, userFeedback: string): Partial<Task> {
    console.log(`[TaskAdjustmentEngine] Adjusting task: ${taskId} with feedback: ${userFeedback}`);
    
    // Get the current task
    const task = this.store.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`[TaskAdjustmentEngine] Task not found: ${taskId}`);
      return {};
    }
    
    // Record the feedback
    this.store.addTaskFeedback(taskId, userFeedback);
    
    // Process feedback to determine what kind of adjustment is needed
    const adjustments = this.processFeedback(task, userFeedback);
    
    // Apply the adjustments to the task
    this.store.updateTask(taskId, adjustments);
    
    console.log(`[TaskAdjustmentEngine] Task adjusted: ${taskId}`);
    return adjustments;
  }
  
  /**
   * Process user feedback to determine what kind of adjustments to make
   */
  private processFeedback(task: Task, feedback: string): Partial<Task> {
    console.log(`[TaskAdjustmentEngine] Processing feedback for task: ${task.id}`);
    
    const adjustments: Partial<Task> = {};
    const lowerFeedback = feedback.toLowerCase();
    
    // Check for priority changes
    if (lowerFeedback.includes('urgent') || lowerFeedback.includes('important')) {
      adjustments.priority = 'high';
      adjustments.important = true;
    } else if (lowerFeedback.includes('less important') || lowerFeedback.includes('lower priority')) {
      adjustments.priority = 'low';
    }
    
    // Check for due date changes
    if (lowerFeedback.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      adjustments.dueDate = tomorrow.toISOString();
    } else if (lowerFeedback.includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      adjustments.dueDate = nextWeek.toISOString();
    }
    
    // Check for status changes
    if (lowerFeedback.includes('completed') || lowerFeedback.includes('done')) {
      adjustments.status = 'completed';
      adjustments.completedAt = new Date().toISOString();
    } else if (lowerFeedback.includes('cancel')) {
      adjustments.status = 'cancelled';
    }
    
    // Check for subtask modifications
    if (lowerFeedback.includes('add step') || lowerFeedback.includes('add subtask')) {
      // Extract the new subtask from feedback (simple implementation)
      const newSubtaskMatch = feedback.match(/add (step|subtask):?\s*(.+)$/i);
      if (newSubtaskMatch && newSubtaskMatch[2]) {
        const newSubtask = {
          id: `subtask-${Date.now()}`,
          title: newSubtaskMatch[2].trim(),
          completed: false
        };
        
        adjustments.subtasks = [...(task.subtasks || []), newSubtask];
      }
    }
    
    console.log(`[TaskAdjustmentEngine] Generated adjustments:`, adjustments);
    return adjustments;
  }
  
  /**
   * Update task based on its current state and dependencies
   */
  public updateTaskState(taskId: string): Partial<Task> {
    console.log(`[TaskAdjustmentEngine] Updating task state: ${taskId}`);
    
    // Get the current task
    const task = this.store.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`[TaskAdjustmentEngine] Task not found: ${taskId}`);
      return {};
    }
    
    const adjustments: Partial<Task> = {};
    
    // Update progress based on subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      const completedSubtasks = task.subtasks.filter(st => st.completed).length;
      const totalSubtasks = task.subtasks.length;
      
      // If all subtasks are complete, mark the task as completed
      if (completedSubtasks === totalSubtasks && totalSubtasks > 0) {
        adjustments.status = 'completed';
        adjustments.completedAt = new Date().toISOString();
      }
    }
    
    // Apply the adjustments if any
    if (Object.keys(adjustments).length > 0) {
      this.store.updateTask(taskId, adjustments);
    }
    
    console.log(`[TaskAdjustmentEngine] Task state updated: ${taskId}`);
    return adjustments;
  }
  
  /**
   * Generate a revised task proposal based on user feedback
   */
  public generateRevisedProposal(taskId: string, feedback: string): TaskProposal {
    console.log(`[TaskAdjustmentEngine] Generating revised proposal for task: ${taskId}`);
    
    // Get the current task
    const task = this.store.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`[TaskAdjustmentEngine] Task not found: ${taskId}`);
      return {
        summary: "Task not found",
        steps: [],
        estimatedTime: "N/A",
        risks: ["Task not found"],
        historyReferences: [],
        userAdaptation: ""
      };
    }
    
    // Generate a new proposal based on the existing task and feedback
    const proposal: TaskProposal = {
      summary: task.title,
      steps: task.subtasks?.map(st => st.title) || [],
      estimatedTime: "To be determined",
      risks: [],
      historyReferences: task.relatedTaskIds || [],
      userAdaptation: `Revised based on feedback: ${feedback}`
    };
    
    console.log(`[TaskAdjustmentEngine] Generated revised proposal: ${proposal.summary}`);
    return proposal;
  }
}

// Export singleton instance
export const taskAdjustmentEngine = new TaskAdjustmentEngine();

// Hook for functional components
export function useTaskAdjustmentEngine() {
  return taskAdjustmentEngine;
} 