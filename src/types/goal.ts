/**
 * 目标分析相关类型定义
 */

export interface GoalAnalysis {
  // 目标是否需要进一步澄清
  needsClarification: boolean;
  
  // 目标完整度评分（0-1之间）
  completeness: number;
  
  // 目标的洞察
  insights?: string;
  
  // 建议的问题，用于进一步澄清目标
  suggestedQuestions: QuestionWithOptions[];
  
  // 建议的任务
  suggestedTasks?: TaskSuggestion[];
}

/**
 * 带选项的问题
 */
export interface QuestionWithOptions {
  // 问题ID
  id: string;
  
  // 问题文本
  question: string;
  
  // 问题文本别名(用于显示)
  text: string;
  
  // 问题的可选答案
  options: QuestionOption[];
  
  // 问题优先级（用于排序）
  priority: number;
  
  // 问题目的（说明为什么问这个问题）
  purpose?: string;
  
  // 问题类型（如yes_no, choice, multiple_choice等）
  type?: 'yes_no' | 'choice' | 'multiple_choice' | 'text';
}

/**
 * 问题选项
 */
export interface QuestionOption {
  // 选项ID
  id: string;
  
  // 选项文本
  text: string;
  
  // 可选的选项值
  value?: string;
  
  // 选项的emoji图标
  emoji?: string;
  
  // 与选项关联的任务
  tasks?: TaskSuggestion[];
}

/**
 * 任务建议
 */
export interface TaskSuggestion {
  // 任务标题
  title: string;
  
  // 任务时间线/预计持续时间
  timeline?: string;
  
  // 任务描述
  description?: string;
  
  // 任务优先级
  priority?: 'high' | 'medium' | 'low';
}

/**
 * 目标分析结果
 */
export interface GoalAnalysisResult {
  // 分析是否成功
  success: boolean;
  
  // 分析结果数据
  data?: GoalAnalysis;
  
  // 若分析失败，错误信息
  error?: string;
} 