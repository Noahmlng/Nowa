/**
 * InteractionEngine.ts
 * 
 * A utility for dynamic multi-stage interaction flow that guides users through task creation
 * and refinement process with contextual questions and incremental optimization.
 */

import { useAppStore } from '@/store/store';
import { taskBuilder } from './TaskBuilder';
import { taskAdjustmentEngine } from './TaskAdjustmentEngine';

/**
 * Types for the InteractionEngine
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

interface TaskSuggestion {
  id: string;
  text: string;
  intentType: string;
  priority: 'efficiency' | 'quality' | 'innovation';
}

interface InteractionQuestion {
  id: string;
  text: string;
  options: Array<{
    id: string;
    text: string;
    value: string;
  }>;
  context?: string;
}

interface InteractionState {
  taskTitle: string;
  currentStage: 'initial' | 'clarification' | 'refinement' | 'final';
  questions: InteractionQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  suggestions: TaskSuggestion[];
  selectedSuggestion?: string;
  finalProposal?: TaskProposal;
}

interface AppStore {
  tasks: Task[];
  userProfile: any;
  addTaskFeedback: (id: string, feedback: string) => void;
}

/**
 * Implements guided multi-stage interaction flow for task creation and refinement
 */
export class InteractionEngine {
  private store: AppStore;
  private state: InteractionState;
  
  constructor() {
    this.store = useAppStore.getState() as unknown as AppStore;
    this.state = this.initializeState();
  }
  
  /**
   * Initialize the interaction state
   */
  private initializeState(): InteractionState {
    return {
      taskTitle: '',
      currentStage: 'initial',
      questions: [],
      currentQuestionIndex: 0,
      answers: {},
      suggestions: []
    };
  }
  
  /**
   * Start a new interaction flow with a task title
   */
  public startInteraction(taskTitle: string): InteractionState {
    console.log(`[InteractionEngine] Starting interaction for task: ${taskTitle}`);
    
    // Reset state
    this.state = this.initializeState();
    this.state.taskTitle = taskTitle;
    
    // Analyze initial task to determine question flow
    this.analyzeTaskIntent(taskTitle);
    
    console.log(`[InteractionEngine] Generated ${this.state.questions.length} questions for task`);
    return this.state;
  }
  
  /**
   * Analyze task intent to determine appropriate questions
   */
  private analyzeTaskIntent(taskTitle: string): void {
    console.log(`[InteractionEngine] Analyzing intent for: ${taskTitle}`);
    
    // Detect task type based on keywords
    const taskType = this.detectTaskType(taskTitle);
    
    // Generate context-specific questions
    if (taskType === 'work') {
      this.generateWorkQuestions(taskTitle);
    } else if (taskType === 'learning') {
      this.generateLearningQuestions(taskTitle);
    } else if (taskType === 'health') {
      this.generateHealthQuestions(taskTitle);
    } else {
      this.generateGeneralQuestions(taskTitle);
    }
    
    console.log(`[InteractionEngine] Detected task type: ${taskType}, generated ${this.state.questions.length} questions`);
  }
  
  /**
   * Detect task type based on keywords
   */
  private detectTaskType(taskTitle: string): 'work' | 'learning' | 'health' | 'other' {
    const lowerTitle = taskTitle.toLowerCase();
    
    // Work-related keywords
    const workKeywords = ['work', 'job', 'project', 'deadline', 'meeting', 'presentation', 'client', 'report', 'email'];
    if (workKeywords.some(keyword => lowerTitle.includes(keyword))) {
      return 'work';
    }
    
    // Learning-related keywords
    const learningKeywords = ['learn', 'study', 'course', 'read', 'book', 'education', 'skill', 'practice', 'knowledge'];
    if (learningKeywords.some(keyword => lowerTitle.includes(keyword))) {
      return 'learning';
    }
    
    // Health-related keywords
    const healthKeywords = ['health', 'exercise', 'workout', 'diet', 'nutrition', 'medical', 'doctor', 'fitness', 'wellbeing'];
    if (healthKeywords.some(keyword => lowerTitle.includes(keyword))) {
      return 'health';
    }
    
    return 'other';
  }
  
  /**
   * Generate work-specific questions
   */
  private generateWorkQuestions(taskTitle: string): void {
    // Question about priority
    this.state.questions.push({
      id: 'work-priority',
      text: '这个工作任务更注重哪方面？',
      options: [
        { id: 'efficiency', text: '效率与速度', value: 'efficiency' },
        { id: 'quality', text: '质量与完整性', value: 'quality' },
        { id: 'innovation', text: '创新与差异化', value: 'innovation' }
      ]
    });
    
    // Question about deadline
    this.state.questions.push({
      id: 'work-deadline',
      text: '您有多少准备时间？',
      options: [
        { id: 'urgent', text: '1天以内（紧急）', value: 'urgent' },
        { id: 'standard', text: '2-3天（标准）', value: 'standard' },
        { id: 'relaxed', text: '4天以上（充足）', value: 'relaxed' }
      ]
    });
    
    // Question about collaboration
    this.state.questions.push({
      id: 'work-collaboration',
      text: '这项任务需要协作吗？',
      options: [
        { id: 'solo', text: '个人完成', value: 'solo' },
        { id: 'team', text: '需要团队协作', value: 'team' },
        { id: 'stakeholders', text: '需要与多方沟通', value: 'stakeholders' }
      ]
    });
    
    // Add history-based question if applicable
    this.addHistoryBasedQuestion(taskTitle, 'work');
  }
  
  /**
   * Generate learning-specific questions
   */
  private generateLearningQuestions(taskTitle: string): void {
    // Question about learning style
    this.state.questions.push({
      id: 'learning-style',
      text: '您偏好哪种学习方式？',
      options: [
        { id: 'structured', text: '系统化学习（按步骤）', value: 'structured' },
        { id: 'practical', text: '实践导向（边做边学）', value: 'practical' },
        { id: 'social', text: '社交互动（讨论学习）', value: 'social' }
      ]
    });
    
    // Question about time commitment
    this.state.questions.push({
      id: 'learning-time',
      text: '您能投入多少学习时间？',
      options: [
        { id: 'minimal', text: '每天30分钟以内', value: 'minimal' },
        { id: 'moderate', text: '每天1-2小时', value: 'moderate' },
        { id: 'intensive', text: '每天2小时以上', value: 'intensive' }
      ]
    });
    
    // Question about depth
    this.state.questions.push({
      id: 'learning-depth',
      text: '您期望达到什么掌握程度？',
      options: [
        { id: 'basic', text: '基础了解', value: 'basic' },
        { id: 'intermediate', text: '实用掌握', value: 'intermediate' },
        { id: 'expert', text: '深入精通', value: 'expert' }
      ]
    });
    
    // Add history-based question if applicable
    this.addHistoryBasedQuestion(taskTitle, 'learning');
  }
  
  /**
   * Generate health-specific questions
   */
  private generateHealthQuestions(taskTitle: string): void {
    // Question about current condition
    this.state.questions.push({
      id: 'health-condition',
      text: '您目前的健康状况如何？',
      options: [
        { id: 'recovery', text: '恢复期/需要温和活动', value: 'recovery' },
        { id: 'maintaining', text: '正常/维持现状', value: 'maintaining' },
        { id: 'improving', text: '良好/想要提升', value: 'improving' }
      ]
    });
    
    // Question about goal
    this.state.questions.push({
      id: 'health-goal',
      text: '您的主要健康目标是什么？',
      options: [
        { id: 'weight', text: '体重管理', value: 'weight' },
        { id: 'strength', text: '力量提升', value: 'strength' },
        { id: 'endurance', text: '耐力增强', value: 'endurance' },
        { id: 'flexibility', text: '灵活性改善', value: 'flexibility' },
        { id: 'wellness', text: '整体健康', value: 'wellness' }
      ]
    });
    
    // Question about time
    this.state.questions.push({
      id: 'health-time',
      text: '您每周能投入多少时间？',
      options: [
        { id: 'minimal', text: '每周1-2次', value: 'minimal' },
        { id: 'moderate', text: '每周3-4次', value: 'moderate' },
        { id: 'intensive', text: '每周5次以上', value: 'intensive' }
      ]
    });
    
    // Add history-based question if applicable
    this.addHistoryBasedQuestion(taskTitle, 'health');
  }
  
  /**
   * Generate general questions for other task types
   */
  private generateGeneralQuestions(taskTitle: string): void {
    // Question about priority
    this.state.questions.push({
      id: 'general-priority',
      text: '这个任务更注重哪方面？',
      options: [
        { id: 'time', text: '时间效率', value: 'time' },
        { id: 'quality', text: '质量', value: 'quality' },
        { id: 'cost', text: '成本', value: 'cost' },
        { id: 'experience', text: '体验', value: 'experience' }
      ]
    });
    
    // Question about complexity
    this.state.questions.push({
      id: 'general-complexity',
      text: '您期望的方案复杂度是？',
      options: [
        { id: 'simple', text: '简单直接', value: 'simple' },
        { id: 'moderate', text: '适度综合', value: 'moderate' },
        { id: 'complex', text: '全面深入', value: 'complex' }
      ]
    });
    
    // Add history-based question if applicable
    this.addHistoryBasedQuestion(taskTitle, 'general');
  }
  
  /**
   * Add context-specific question based on user history
   */
  private addHistoryBasedQuestion(taskTitle: string, taskType: string): void {
    console.log(`[InteractionEngine] Looking for historical insights for: ${taskTitle}`);
    
    // Find related historical tasks
    const relatedTasks = this.findRelatedTasks(taskTitle);
    
    if (relatedTasks.length === 0) {
      console.log(`[InteractionEngine] No related tasks found`);
      return;
    }
    
    // Look for patterns in user feedback
    const patterns = this.extractFeedbackPatterns(relatedTasks);
    
    // Add relevant history-based questions
    if (patterns.timeIssues && taskType === 'work') {
      this.state.questions.push({
        id: 'history-time',
        text: '根据您的历史反馈，您之前提到过时间不足的问题。您希望如何处理？',
        options: [
          { id: 'more-time', text: '这次分配更多时间', value: 'more-time' },
          { id: 'simplify', text: '简化任务要求', value: 'simplify' },
          { id: 'delegate', text: '寻求额外帮助', value: 'delegate' }
        ],
        context: '基于您之前的任务反馈'
      });
    }
    
    if (patterns.difficultyIssues && (taskType === 'learning' || taskType === 'work')) {
      this.state.questions.push({
        id: 'history-difficulty',
        text: '您之前提到过难度相关的挑战，您这次希望：',
        options: [
          { id: 'easier', text: '降低难度，确保完成', value: 'easier' },
          { id: 'same', text: '保持适度挑战', value: 'same' },
          { id: 'harder', text: '提高难度，促进成长', value: 'harder' }
        ],
        context: '基于您之前的任务反馈'
      });
    }
    
    if (patterns.healthIssues && taskType === 'health') {
      this.state.questions.push({
        id: 'history-health',
        text: '考虑到您之前提到的健康状况，您这次需要：',
        options: [
          { id: 'gentle', text: '更温和的方案', value: 'gentle' },
          { id: 'balanced', text: '平衡的方案', value: 'balanced' },
          { id: 'challenging', text: '有挑战性的方案', value: 'challenging' }
        ],
        context: '基于您之前的健康反馈'
      });
    }
    
    console.log(`[InteractionEngine] Added ${this.state.questions.length - 3} history-based questions`);
  }
  
  /**
   * Find tasks related to the current task
   */
  private findRelatedTasks(taskTitle: string): Task[] {
    const lowerTitle = taskTitle.toLowerCase();
    
    // Simple keyword matching for now
    // In a real implementation, this would use embeddings/semantic search
    return this.store.tasks.filter(task => 
      task.title.toLowerCase().includes(lowerTitle) ||
      (task.description && task.description.toLowerCase().includes(lowerTitle))
    );
  }
  
  /**
   * Extract patterns from feedback across tasks
   */
  private extractFeedbackPatterns(tasks: Task[]): {
    timeIssues: boolean;
    difficultyIssues: boolean;
    qualityIssues: boolean;
    healthIssues: boolean;
  } {
    const patterns = {
      timeIssues: false,
      difficultyIssues: false,
      qualityIssues: false,
      healthIssues: false
    };
    
    // Analyze feedback across tasks
    tasks.forEach(task => {
      if (task.feedback && task.feedback.length > 0) {
        task.feedback.forEach(feedback => {
          const lowerFeedback = feedback.text.toLowerCase();
          
          // Check for time-related issues
          if (lowerFeedback.includes('time') || 
              lowerFeedback.includes('deadline') || 
              lowerFeedback.includes('late') ||
              lowerFeedback.includes('rush')) {
            patterns.timeIssues = true;
          }
          
          // Check for difficulty-related issues
          if (lowerFeedback.includes('difficult') || 
              lowerFeedback.includes('hard') || 
              lowerFeedback.includes('challenge') ||
              lowerFeedback.includes('struggle')) {
            patterns.difficultyIssues = true;
          }
          
          // Check for quality-related issues
          if (lowerFeedback.includes('quality') || 
              lowerFeedback.includes('better') || 
              lowerFeedback.includes('improve') ||
              lowerFeedback.includes('not good')) {
            patterns.qualityIssues = true;
          }
          
          // Check for health-related issues
          if (lowerFeedback.includes('pain') || 
              lowerFeedback.includes('injury') || 
              lowerFeedback.includes('tired') ||
              lowerFeedback.includes('exhausted')) {
            patterns.healthIssues = true;
          }
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * Submit an answer to the current question
   */
  public submitAnswer(questionId: string, answerId: string): InteractionState {
    console.log(`[InteractionEngine] Submitting answer: ${questionId}=${answerId}`);
    
    // Store the answer
    this.state.answers[questionId] = answerId;
    
    // Move to the next question
    if (this.state.currentQuestionIndex < this.state.questions.length - 1) {
      this.state.currentQuestionIndex++;
      this.state.currentStage = 'clarification';
    } else {
      // If all questions are answered, move to suggestion generation
      this.generateSuggestions();
      this.state.currentStage = 'refinement';
    }
    
    console.log(`[InteractionEngine] Updated stage to: ${this.state.currentStage}`);
    return this.state;
  }
  
  /**
   * Generate task suggestions based on answers
   */
  private generateSuggestions(): void {
    console.log(`[InteractionEngine] Generating suggestions based on answers`);
    
    // In a real implementation, this would call the AI service
    // For now, we'll generate mock suggestions based on the answers
    
    // Extract key preferences
    const priorityAnswer = this.findPriorityAnswer();
    console.log(`[InteractionEngine] Priority preference: ${priorityAnswer}`);
    
    // Generate three suggestions with different emphases
    this.state.suggestions = [
      {
        id: `suggestion-1-${Date.now()}`,
        text: this.generateSuggestionText('efficiency', this.state.taskTitle, this.state.answers),
        intentType: 'efficiency',
        priority: 'efficiency'
      },
      {
        id: `suggestion-2-${Date.now()}`,
        text: this.generateSuggestionText('quality', this.state.taskTitle, this.state.answers),
        intentType: 'quality',
        priority: 'quality'
      },
      {
        id: `suggestion-3-${Date.now()}`,
        text: this.generateSuggestionText('innovation', this.state.taskTitle, this.state.answers),
        intentType: 'innovation',
        priority: 'innovation'
      }
    ];
    
    console.log(`[InteractionEngine] Generated ${this.state.suggestions.length} suggestions`);
  }
  
  /**
   * Find priority answer from question responses
   */
  private findPriorityAnswer(): string {
    // Look for priority-related question answers
    const priorityKeys = [
      'work-priority', 
      'general-priority', 
      'learning-style',
      'health-condition'
    ];
    
    for (const key of priorityKeys) {
      if (this.state.answers[key]) {
        return this.state.answers[key];
      }
    }
    
    return 'balanced';
  }
  
  /**
   * Generate suggestion text based on priority emphasis
   */
  private generateSuggestionText(
    emphasis: 'efficiency' | 'quality' | 'innovation',
    taskTitle: string,
    answers: Record<string, string>
  ): string {
    // In a real implementation, this would use the AI to generate suggestions
    // For now, we'll use templates based on the emphasis
    
    switch (emphasis) {
      case 'efficiency':
        return `您是否需要快速完成？精简高效的${taskTitle}方案`;
      case 'quality':
        return `您是否追求完美？全面细致的${taskTitle}方案`;
      case 'innovation':
        return `您是否寻求突破？创新差异化的${taskTitle}方案`;
      default:
        return `均衡的${taskTitle}方案`;
    }
  }
  
  /**
   * Select a suggestion to develop into a full plan
   */
  public selectSuggestion(suggestionId: string): InteractionState {
    console.log(`[InteractionEngine] Selecting suggestion: ${suggestionId}`);
    
    // Find the selected suggestion
    const suggestion = this.state.suggestions.find(s => s.id === suggestionId);
    
    if (!suggestion) {
      console.error(`[InteractionEngine] Suggestion not found: ${suggestionId}`);
      return this.state;
    }
    
    // Store the selected suggestion
    this.state.selectedSuggestion = suggestion.text;
    
    // Generate the final proposal
    this.generateFinalProposal();
    
    // Update state
    this.state.currentStage = 'final';
    
    console.log(`[InteractionEngine] Updated stage to: ${this.state.currentStage}`);
    return this.state;
  }
  
  /**
   * Generate final task proposal
   */
  private generateFinalProposal(): void {
    console.log(`[InteractionEngine] Generating final proposal for: ${this.state.taskTitle}`);
    
    // In a real implementation, this would call the AI service
    // For now, we'll use the TaskBuilder to generate a proposal
    
    // Start with a basic proposal
    this.state.finalProposal = {
      summary: this.state.taskTitle,
      steps: [
        '步骤1: 初始准备',
        '步骤2: 分析需求',
        '步骤3: 制定计划',
        '步骤4: 执行任务',
        '步骤5: 评估结果'
      ],
      estimatedTime: this.estimateTimeFromAnswers(),
      risks: this.identifyRisksFromAnswers(),
      historyReferences: [],
      userAdaptation: `根据您的偏好优化: ${this.getPreferenceSummary()}`
    };
    
    console.log(`[InteractionEngine] Generated proposal with ${this.state.finalProposal.steps.length} steps`);
  }
  
  /**
   * Estimate time based on answers
   */
  private estimateTimeFromAnswers(): string {
    // Check time-related answers
    if (this.state.answers['work-deadline'] === 'urgent' || 
        this.state.answers['learning-time'] === 'minimal' ||
        this.state.answers['health-time'] === 'minimal') {
      return '较短时间: 1-2小时';
    } else if (this.state.answers['work-deadline'] === 'relaxed' || 
               this.state.answers['learning-time'] === 'intensive' ||
               this.state.answers['health-time'] === 'intensive') {
      return '较长时间: 8小时以上';
    } else {
      return '中等时间: 3-7小时';
    }
  }
  
  /**
   * Identify risks based on answers
   */
  private identifyRisksFromAnswers(): string[] {
    const risks: string[] = [];
    
    // Time-related risks
    if (this.state.answers['work-deadline'] === 'urgent') {
      risks.push('时间紧迫可能影响质量');
    }
    
    // Collaboration risks
    if (this.state.answers['work-collaboration'] === 'team' || 
        this.state.answers['work-collaboration'] === 'stakeholders') {
      risks.push('多方协作可能导致沟通延误');
    }
    
    // Learning depth risks
    if (this.state.answers['learning-depth'] === 'expert') {
      risks.push('深入学习需要更多时间和精力');
    }
    
    // Health condition risks
    if (this.state.answers['health-condition'] === 'recovery') {
      risks.push('恢复期需要特别注意避免过度训练');
    }
    
    // Add default risk if none identified
    if (risks.length === 0) {
      risks.push('未识别特定风险');
    }
    
    return risks;
  }
  
  /**
   * Get preference summary from answers
   */
  private getPreferenceSummary(): string {
    const preferences: string[] = [];
    
    // Add priority preference
    const priorityAnswer = this.findPriorityAnswer();
    if (priorityAnswer === 'efficiency' || priorityAnswer === 'time') {
      preferences.push('重视效率');
    } else if (priorityAnswer === 'quality') {
      preferences.push('注重质量');
    } else if (priorityAnswer === 'innovation') {
      preferences.push('追求创新');
    }
    
    // Add time preference
    if (this.state.answers['work-deadline']) {
      const deadlineMap: Record<string, string> = {
        'urgent': '紧急时间框架',
        'standard': '标准时间框架',
        'relaxed': '宽松时间框架'
      };
      preferences.push(deadlineMap[this.state.answers['work-deadline']]);
    }
    
    // Add learning style
    if (this.state.answers['learning-style']) {
      const styleMap: Record<string, string> = {
        'structured': '系统学习',
        'practical': '实践学习',
        'social': '社交学习'
      };
      preferences.push(styleMap[this.state.answers['learning-style']]);
    }
    
    // Add health preference
    if (this.state.answers['health-goal']) {
      const goalMap: Record<string, string> = {
        'weight': '体重管理',
        'strength': '力量提升',
        'endurance': '耐力增强',
        'flexibility': '灵活性改善',
        'wellness': '整体健康'
      };
      preferences.push(goalMap[this.state.answers['health-goal']]);
    }
    
    return preferences.join('、');
  }
  
  /**
   * Get the current state of the interaction
   */
  public getState(): InteractionState {
    return this.state;
  }
  
  /**
   * Reset the interaction state
   */
  public reset(): InteractionState {
    this.state = this.initializeState();
    return this.state;
  }
}

// Export singleton instance
export const interactionEngine = new InteractionEngine();

// Hook for functional components
export function useInteractionEngine() {
  return interactionEngine;
} 