/**
 * TaskBuilder.ts
 * 
 * A utility class for building task proposals through a pipeline process:
 * 1. Task Drafting - Initial task creation
 * 2. Context Injection - Enhancing with historical context
 * 3. Personalization - Adapting to user preferences
 * 4. Result Structuring - Final formatting and output
 */

import { useAppStore } from '@/store/store';

/**
 * Import the types directly to avoid type issues
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
  userPreferences?: {
    preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    preferredEnvironment?: string[];
    preferredDuration?: number;
    preferredApproach?: string;
    difficultyRating?: number;
  };
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

interface UserProfile {
  weight?: string;
  height?: string;
  personality?: string[];
  interests?: string[];
  hobbies?: string[];
  goals?: string[];
  notes?: string;
}

interface AppStore {
  tasks: Task[];
  userProfile: UserProfile;
}

/**
 * Implements a pipeline-based task generation system
 */
export class TaskBuilder {
  private store: AppStore;
  
  constructor() {
    this.store = useAppStore.getState() as unknown as AppStore;
  }
  
  /**
   * Generates a complete task proposal from user input
   * 
   * @param userInput The user's task request
   * @returns A structured task proposal
   */
  public async generateTaskProposal(userInput: string): Promise<TaskProposal> {
    console.log(`[TaskBuilder] Generating proposal for: ${userInput}`);
    
    // Pipeline processing
    const draft = this.draftTask(userInput);
    const contextEnhanced = await this.injectContext(draft);
    const personalized = this.personalizeTask(contextEnhanced);
    const result = this.structureResult(personalized);
    
    console.log(`[TaskBuilder] Generated proposal: ${result.summary}`);
    return result;
  }
  
  /**
   * Stage 1: Create an initial draft task based on user input
   */
  private draftTask(input: string): TaskProposal {
    console.log(`[TaskBuilder] Drafting task for: ${input}`);
    
    // This is a placeholder - in a real implementation, this would call an AI service
    // for generating a basic task structure
    return {
      summary: input,
      steps: ['Initial step 1', 'Initial step 2'],
      estimatedTime: 'To be determined',
      risks: ['Unknown risks'],
      historyReferences: [],
      userAdaptation: ''
    };
  }
  
  /**
   * Stage 2: Enhance the draft with context from historical tasks
   */
  private async injectContext(draft: TaskProposal): Promise<TaskProposal> {
    console.log(`[TaskBuilder] Injecting context for: ${draft.summary}`);
    
    // Find related historical tasks using a more sophisticated approach
    // This will check for semantic similarity between the task title and description
    const relatedTasks = await this.findRelatedTasks(draft.summary);
    
    console.log(`[TaskBuilder] Found ${relatedTasks.length} related tasks`);
    
    // Extract lessons from related tasks
    const references = relatedTasks.map((task: Task) => task.id);
    const enrichedSteps = [...draft.steps];
    
    // Organize learnings from historical tasks
    const historicalLearnings = this.extractHistoricalLearnings(relatedTasks);
    
    // Extract patterns from completed tasks
    if (historicalLearnings.successfulPatterns.length > 0) {
      console.log(`[TaskBuilder] Applied ${historicalLearnings.successfulPatterns.length} successful patterns`);
      historicalLearnings.successfulPatterns.forEach(pattern => {
        if (!enrichedSteps.some(step => step.toLowerCase().includes(pattern.toLowerCase()))) {
          enrichedSteps.push(pattern);
        }
      });
    }
    
    // Integrate common task steps
    if (historicalLearnings.commonSteps.length > 0) {
      console.log(`[TaskBuilder] Applied ${historicalLearnings.commonSteps.length} common steps`);
      historicalLearnings.commonSteps.forEach(step => {
        if (!enrichedSteps.some(existingStep => existingStep.toLowerCase().includes(step.toLowerCase()))) {
          enrichedSteps.push(step);
        }
      });
    }
    
    return {
      ...draft,
      steps: enrichedSteps,
      risks: [...draft.risks, ...historicalLearnings.potentialRisks],
      historyReferences: references,
      userAdaptation: draft.userAdaptation + this.generateContextInsights(historicalLearnings)
    };
  }
  
  /**
   * Find related tasks based on semantic similarity
   * Implements true vector semantic search using embeddings
   */
  private async findRelatedTasks(taskSummary: string): Promise<Task[]> {
    console.log(`[TaskBuilder] Finding related tasks for: ${taskSummary}`);
    
    try {
      // 导入生成嵌入向量的函数
      const { generateTaskEmbeddings } = await import('./index');
      
      // 为当前任务生成嵌入向量
      const queryEmbedding = await generateTaskEmbeddings(taskSummary);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn('[TaskBuilder] Failed to generate embeddings for query, falling back to keyword search');
        return this.findRelatedTasksByKeywords(taskSummary);
      }
      
      // 获取所有带有嵌入向量的任务
      const tasksWithEmbeddings = this.store.tasks.filter(task => 
        task.embeddings && task.embeddings.length > 0
      );
      
      console.log(`[TaskBuilder] Found ${tasksWithEmbeddings.length} tasks with embeddings`);
      
      // 如果没有足够的任务有嵌入向量，回退到关键词搜索
      if (tasksWithEmbeddings.length < 3) {
        console.log('[TaskBuilder] Not enough tasks with embeddings, supplementing with keyword search');
        const keywordTasks = this.findRelatedTasksByKeywords(taskSummary);
        return [...tasksWithEmbeddings, ...keywordTasks.filter(task => 
          !tasksWithEmbeddings.some(t => t.id === task.id)
        )];
      }
      
      // 计算每个任务与查询的相似度
      const taskWithSimilarities = tasksWithEmbeddings.map(task => {
        // 使用store中已有的余弦相似度函数
        const similarity = this.calculateCosineSimilarity(queryEmbedding, task.embeddings!);
        return { task, similarity };
      });
      
      // 按相似度排序
      taskWithSimilarities.sort((a, b) => b.similarity - a.similarity);
      
      // 记录日志
      console.log(`[TaskBuilder] Top similarity scores: ${
        taskWithSimilarities.slice(0, 3).map(t => 
          `${t.task.title.substring(0, 20)}...: ${t.similarity.toFixed(4)}`
        ).join(', ')
      }`);
      
      // 使用阈值过滤结果（相似度大于0.7）
      const SIMILARITY_THRESHOLD = 0.7;
      const relatedTasks = taskWithSimilarities
        .filter(item => item.similarity > SIMILARITY_THRESHOLD)
        .map(item => item.task);
      
      // 如果相似度匹配不足3个，添加前3个最相似的任务作为建议
      if (relatedTasks.length < 3) {
        const topTasks = taskWithSimilarities
          .filter(item => !relatedTasks.includes(item.task))
          .slice(0, 3 - relatedTasks.length)
          .map(item => item.task);
        
        return [...relatedTasks, ...topTasks];
      }
      
      return relatedTasks;
    } catch (error) {
      console.error('[TaskBuilder] Error in vector search:', error);
      // 出错时回退到关键词搜索
      return this.findRelatedTasksByKeywords(taskSummary);
    }
  }
  
  /**
   * 使用关键词匹配查找相关任务（作为向量搜索的回退方案）
   */
  private findRelatedTasksByKeywords(taskSummary: string): Task[] {
    const lowerSummary = taskSummary.toLowerCase();
    const keywords = lowerSummary.split(/\s+/).filter(word => word.length > 3);
    
    console.log(`[TaskBuilder] Keyword search for: ${keywords.join(', ')}`);
    
    // 多维度搜索方法:
    const relatedByTitle = this.store.tasks.filter((task: Task) => 
      keywords.some(keyword => task.title.toLowerCase().includes(keyword))
    );
    
    const relatedByDescription = this.store.tasks.filter((task: Task) => 
      task.description && keywords.some(keyword => task.description!.toLowerCase().includes(keyword))
    );
    
    const relatedByType = this.store.tasks.filter((task: Task) => {
      // 从摘要确定任务类型
      const isSummaryWorkRelated = /work|job|project|deadline|meeting|presentation|client/i.test(lowerSummary);
      const isSummaryHealthRelated = /health|exercise|workout|diet|nutrition|medical|doctor/i.test(lowerSummary);
      const isSummaryLearningRelated = /learn|study|course|read|book|education|skill/i.test(lowerSummary);
      
      // 匹配相似类型的任务
      return (isSummaryWorkRelated && task.type === 'work') ||
             (isSummaryHealthRelated && task.type === 'health') ||
             (isSummaryLearningRelated && task.type === 'learning');
    });
    
    // 合并并去重
    const allRelatedTasks = [...relatedByTitle, ...relatedByDescription, ...relatedByType];
    const uniqueTaskIds = new Set<string>();
    const uniqueRelatedTasks: Task[] = [];
    
    allRelatedTasks.forEach(task => {
      if (!uniqueTaskIds.has(task.id)) {
        uniqueTaskIds.add(task.id);
        uniqueRelatedTasks.push(task);
      }
    });
    
    console.log(`[TaskBuilder] Found ${uniqueRelatedTasks.length} tasks via keyword search`);
    return uniqueRelatedTasks;
  }
  
  /**
   * 计算两个向量之间的余弦相似度
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      console.error(`[TaskBuilder] Vector length mismatch: ${vec1.length} vs ${vec2.length}`);
      return 0;
    }
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    
    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    return dotProduct / (mag1 * mag2);
  }
  
  /**
   * Extract learnings from historical tasks
   */
  private extractHistoricalLearnings(relatedTasks: Task[]): {
    successfulPatterns: string[];
    commonSteps: string[];
    potentialRisks: string[];
    userPreferences: Record<string, any>;
  } {
    const successfulPatterns: string[] = [];
    const commonSteps: string[] = [];
    const potentialRisks: string[] = [];
    const userPreferences: Record<string, any> = {};
    
    // Track step frequencies to identify common patterns
    const stepFrequency: Record<string, number> = {};
    
    // Extract successful patterns from completed tasks
    relatedTasks.forEach((task: Task) => {
      if (task.status === 'completed' && task.subtasks) {
        // Extract completed subtasks as successful patterns
        task.subtasks.forEach(subtask => {
          if (subtask.completed) {
            // Track step frequency
            const normalizedStep = subtask.title.toLowerCase();
            stepFrequency[normalizedStep] = (stepFrequency[normalizedStep] || 0) + 1;
            
            // Add to successful patterns if it's not already there
            if (!successfulPatterns.some(pattern => 
              pattern.toLowerCase().includes(normalizedStep) || 
              normalizedStep.includes(pattern.toLowerCase())
            )) {
              successfulPatterns.push(subtask.title);
            }
          }
        });
        
        // Extract user preferences if available
        if (task.userPreferences) {
          Object.entries(task.userPreferences).forEach(([key, value]) => {
            if (value !== undefined) {
              userPreferences[key] = value;
            }
          });
        }
      }
      
      // Extract risks from task feedback
      if (task.feedback) {
        task.feedback.forEach((feedback: { text: string; timestamp: string }) => {
          // More sophisticated risk extraction
          const feedbackText = feedback.text.toLowerCase();
          if (feedbackText.includes('difficult') || 
              feedbackText.includes('challenge') ||
              feedbackText.includes('problem') ||
              feedbackText.includes('issue') ||
              feedbackText.includes('risk') ||
              feedbackText.includes('concern') ||
              feedbackText.includes('worry')) {
            
            // Try to extract the specific risk from the feedback
            const riskPhrases = [
              /difficult(y|ies)?\s+with\s+([^.,:;!?]+)/i,
              /problem\s+with\s+([^.,:;!?]+)/i, 
              /challenge\s+in\s+([^.,:;!?]+)/i,
              /risk\s+of\s+([^.,:;!?]+)/i,
              /concern\s+about\s+([^.,:;!?]+)/i
            ];
            
            let riskFound = false;
            for (const pattern of riskPhrases) {
              const match = feedbackText.match(pattern);
              if (match && match[1]) {
                potentialRisks.push(`Risk: ${match[1].trim()}`);
                riskFound = true;
                break;
              }
            }
            
            // If no specific risk was found, use the entire feedback
            if (!riskFound) {
              potentialRisks.push(`Feedback: ${feedback.text}`);
            }
          }
        });
      }
    });
    
    // Identify common steps (appear in multiple tasks)
    Object.entries(stepFrequency).forEach(([step, frequency]) => {
      if (frequency > 1) {
        // Find the original step text with proper casing
        const originalStep = successfulPatterns.find(pattern => 
          pattern.toLowerCase().includes(step) || step.includes(pattern.toLowerCase())
        );
        
        if (originalStep && !commonSteps.includes(originalStep)) {
          commonSteps.push(originalStep);
        }
      }
    });
    
    console.log(`[TaskBuilder] Extracted ${successfulPatterns.length} patterns, ${commonSteps.length} common steps, ${potentialRisks.length} risks`);
    
    return {
      successfulPatterns,
      commonSteps,
      potentialRisks,
      userPreferences
    };
  }
  
  /**
   * Generate insights based on historical context
   */
  private generateContextInsights(learnings: {
    successfulPatterns: string[];
    commonSteps: string[];
    potentialRisks: string[];
    userPreferences: Record<string, any>;
  }): string {
    if (learnings.successfulPatterns.length === 0 && 
        learnings.potentialRisks.length === 0 &&
        Object.keys(learnings.userPreferences).length === 0) {
      return '';
    }
    
    let insights = '\n\nHistorical insights: ';
    
    if (learnings.successfulPatterns.length > 0) {
      insights += `Previously successful approaches incorporated ${learnings.successfulPatterns.length} proven steps. `;
    }
    
    if (learnings.potentialRisks.length > 0) {
      insights += `Be aware of ${learnings.potentialRisks.length} known challenges from similar tasks. `;
    }
    
    if (Object.keys(learnings.userPreferences).length > 0) {
      const prefStrings = [];
      
      if (learnings.userPreferences.preferredTimeOfDay) {
        prefStrings.push(`preferred time: ${learnings.userPreferences.preferredTimeOfDay}`);
      }
      
      if (learnings.userPreferences.preferredEnvironment) {
        prefStrings.push(`preferred environment: ${learnings.userPreferences.preferredEnvironment.join(', ')}`);
      }
      
      if (learnings.userPreferences.preferredApproach) {
        prefStrings.push(`preferred approach: ${learnings.userPreferences.preferredApproach}`);
      }
      
      if (prefStrings.length > 0) {
        insights += `Adapted to your preferences (${prefStrings.join('; ')}).`;
      }
    }
    
    return insights;
  }
  
  /**
   * Stage 3: Personalize the task based on user preferences
   */
  private personalizeTask(task: TaskProposal): TaskProposal {
    console.log(`[TaskBuilder] Personalizing task: ${task.summary}`);
    
    const userProfile: UserProfile = this.store.userProfile;
    
    // Apply user preferences
    let personalizationNotes = '';
    
    // Adapt to user's interests
    if (userProfile.interests && userProfile.interests.length > 0) {
      personalizationNotes += `Aligned with your interests in ${userProfile.interests.join(', ')}. `;
    }
    
    // Adapt to user's goals
    if (userProfile.goals && userProfile.goals.length > 0) {
      personalizationNotes += `Supports your goals of ${userProfile.goals.join(', ')}. `;
    }
    
    // Estimate time based on similar completed tasks
    let estimatedTime = task.estimatedTime;
    const similarCompletedTasks = this.store.tasks.filter((t: Task) => 
      t.status === 'completed' && 
      t.title.toLowerCase().includes(task.summary.toLowerCase())
    );
    
    if (similarCompletedTasks.length > 0) {
      // This is simplified - in a real system, we would calculate average completion time
      estimatedTime = '1 hour (based on similar completed tasks)';
    }
    
    return {
      ...task,
      estimatedTime,
      userAdaptation: personalizationNotes
    };
  }
  
  /**
   * Stage 4: Format the final result
   */
  private structureResult(task: TaskProposal): TaskProposal {
    console.log(`[TaskBuilder] Structuring result for: ${task.summary}`);
    
    // Format steps for clarity
    const formattedSteps = task.steps.map((step, index) => 
      step.startsWith(`${index + 1}.`) ? step : `${index + 1}. ${step}`
    );
    
    // Deduplicate risks
    const uniqueRisks = Array.from(new Set(task.risks));
    
    return {
      ...task,
      steps: formattedSteps,
      risks: uniqueRisks
    };
  }
  
  /**
   * Creates a task from a proposal
   */
  public createTaskFromProposal(proposal: TaskProposal): Task {
    console.log(`[TaskBuilder] Creating task from proposal: ${proposal.summary}`);
    
    // Convert steps to subtasks
    const subtasks = proposal.steps.map((step, index) => ({
      id: `subtask-${Date.now()}-${index}`,
      title: step,
      completed: false
    }));
    
    // Create the task
    return {
      id: `task-${Date.now()}`,
      title: proposal.summary,
      description: `${proposal.userAdaptation}\n\nPotential challenges:\n${proposal.risks.join('\n')}\n\nEstimated time: ${proposal.estimatedTime}`,
      status: 'pending',
      priority: 'medium',
      important: false,
      taskListId: 'today',
      subtasks,
      type: 'work', // Default type
      relatedTaskIds: proposal.historyReferences
    };
  }
}

// Export singleton instance
export const taskBuilder = new TaskBuilder();

// Hook for functional components
export function useTaskBuilder() {
  return taskBuilder;
} 