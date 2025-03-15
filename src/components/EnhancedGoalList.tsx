'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Plus, Edit2, Trash2, Target, X, ChevronDown, ChevronUp, Calendar, Star, Clock, CheckCircle2, Loader2, Info, Sparkles, Send, RefreshCw, Wand2, BrainCircuit, CheckCheck, MessageSquare } from 'lucide-react';
import { useAppStore } from '@/store/store';
import { GoalAnalysis, QuestionWithOptions, QuestionOption, TaskSuggestion } from '../types/goal';
import { analyzeGoal, GoalAnalysisResult } from '@/services/ai';

/**
 * Goal interface - Represents a goal in the application
 */
interface Goal {
  id: string;
  title: string;
  curation?: string;
  progress: number;
  status: 'active' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  finishDate?: string;
  tasks?: GoalTask[];
  aiGenerated?: boolean;
  lastUpdated?: string;
}

/**
 * GoalTask interface - Represents a task related to a goal
 */
interface GoalTask {
  id: string;
  title: string;
  description?: string;
  timeline?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Type for the creation flow state
type CreationStep = 'input' | 'analysis' | 'clarification' | 'taskGeneration' | 'timeScheduling';

/**
 * EnhancedGoalList Component
 * 
 * Advanced goal management with AI assistance for task generation and planning
 */
export default function EnhancedGoalList() {
  // Get goals and goal actions from the global store
  const { goals, addGoal, updateGoal, deleteGoal, updateGoalProgress } = useAppStore();
  
  // Local state for the basic functions
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Enhanced flow states
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [creationStep, setCreationStep] = useState<CreationStep>('input');
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: '',
    curation: '',
    progress: 0,
    status: 'active',
    tasks: [],
    lastUpdated: new Date().toISOString()
  });
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [needsAiHelp, setNeedsAiHelp] = useState<boolean | null>(null);
  const [aiQuestionShown, setAiQuestionShown] = useState(false);
  
  // AI-specific states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<GoalAnalysisResult | null>(null);
  
  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);

  // Task Curation相关状态
  const [curationPrompt, setCurationPrompt] = useState('');
  const [curationAIResponse, setCurationAIResponse] = useState<string | null>(null);
  const [isCurationLoading, setIsCurationLoading] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'tasks' | null>(null);

  // 多轮交互相关状态
  const [feedbackHistory, setFeedbackHistory] = useState<Array<{
    role: 'user' | 'assistant',
    content: string,
    timestamp: string
  }>>([]);
  const [currentFeedbackRound, setCurrentFeedbackRound] = useState(1);
  const [showContinuedFeedback, setShowContinuedFeedback] = useState(false);
  const [continuedFeedback, setContinuedFeedback] = useState('');

  // 在 CreationStep 类型中添加新的阶段
  type CreationStep = 'input' | 'analysis' | 'clarification' | 'taskGeneration' | 'timeScheduling';

  // 在组件内添加新的状态
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithOptions | null>(null);
  const [questionHistory, setQuestionHistory] = useState<Array<{
    question: QuestionWithOptions;
    answer: string;
    timestamp: string;
  }>>([]);
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysis | null>(null);

  // Effects for AI suggestions
  useEffect(() => {
    if (newGoal.title && newGoal.title.length > 3 && !aiSuggestion) {
      // Clear any previous AI errors
      setAiError(null);
      
      // Simple keyword detection for immediate feedback
      const goalText = newGoal.title.toLowerCase();
      
      // Initial category detection based on keywords
      if (goalText.includes('workout') || goalText.includes('exercise') || 
          goalText.includes('健身') || goalText.includes('瘦') || 
          goalText.includes('减肥') || goalText.includes('weight loss')) {
        setAiSuggestion('fitness');
        console.log('AI suggestion set to fitness for input:', goalText);
      } else if (goalText.includes('work') || goalText.includes('job') || goalText.includes('找工作')) {
        setAiSuggestion('career');
        console.log('AI suggestion set to career for input:', goalText);
      } else if (goalText.includes('learn') || goalText.includes('study') || goalText.includes('学习')) {
        setAiSuggestion('learning');
        console.log('AI suggestion set to learning for input:', goalText);
      } else {
        // 对于所有其他输入，设置通用建议
        setAiSuggestion('general');
        console.log('AI suggestion set to general for input:', goalText);
      }
    }
  }, [newGoal.title]);

  // Toggle creating goal form
  const toggleGoalCreation = () => {
    setIsCreatingGoal(!isCreatingGoal);
    setCreationStep('input');
    setNewGoal({
      title: '',
      curation: '',
      progress: 0,
      status: 'active',
      tasks: [],
      lastUpdated: new Date().toISOString()
    });
    setAiSuggestion('');
    setNeedsAiHelp(null);
    
    // Focus the input after component renders
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  // Handle the goal input and AI suggestions
  const handleGoalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGoal({...newGoal, title: e.target.value});
    
    // Reset AI suggestion if input changes significantly
    if (aiSuggestion && e.target.value.length < 3) {
      setAiSuggestion('');
    }
    
    // Log for debugging
    console.log("Goal input changed:", e.target.value);
  };

  // Select AI option to help with task breakdown
  const selectAiOption = (needsAi: boolean) => {
    setNeedsAiHelp(needsAi);
    console.log("AI assistance selected:", needsAi);
    
    if (needsAi) {
      // Proceed to AI questioning if needed
      setCreationStep('analysis');
      setAiQuestionShown(true);
    } else {
      // Skip to manual task creation
      setCreationStep('taskGeneration');
      
      // Add some default empty tasks to get started
      setNewGoal(prev => ({
        ...prev,
        tasks: [
          { id: `task-${Date.now()}-1`, title: '', completed: false, priority: 'medium' },
          { id: `task-${Date.now()}-2`, title: '', completed: false, priority: 'medium' },
        ]
      }));
    }
  };

  // Request AI analysis of the goal
  const analyzeGoal = async () => {
    if (!newGoal.title) return;
    
    setIsAiLoading(true);
    setAiError(null);
    
    try {
      const response = await fetch('/api/ai/analyze-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: newGoal,
          context: {
            previousAnswers: questionHistory,
            currentStep: creationStep
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to analyze goal');
      
      const analysis = await response.json();
      setGoalAnalysis(analysis);
      
      // 如果完整度较低，进入澄清阶段
      if (analysis.completeness < 0.8 && analysis.suggestedQuestions.length > 0) {
        setCreationStep('clarification');
        setCurrentQuestion(analysis.suggestedQuestions[0]);
      } else {
        // 如果目标足够清晰，直接进入任务生成
        setCreationStep('taskGeneration');
        generateTasks(analysis);
      }
      
    } catch (error) {
      console.error('Goal analysis error:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to analyze goal');
    } finally {
      setIsAiLoading(false);
    }
  };

  // 处理问题回答
  const handleQuestionAnswer = async (answer: string) => {
    if (!currentQuestion || !goalAnalysis) return;
    
    // 保存当前问题和回答
    const newHistory = [...questionHistory, {
      question: currentQuestion,
      answer,
      timestamp: new Date().toISOString()
    }];
    setQuestionHistory(newHistory);
    
    // 获取下一个问题
    const remainingQuestions = goalAnalysis.suggestedQuestions
      .filter(q => !questionHistory.some(h => h.question.id === q.id))
      .sort((a, b) => a.priority - b.priority);
    
    if (remainingQuestions.length > 0) {
      setCurrentQuestion(remainingQuestions[0]);
    } else {
      // 所有问题都已回答，重新分析目标
      setCreationStep('analysis');
      await analyzeGoal();
    }
  };

  // Add a new task to the list
  const addTask = () => {
    setNewGoal(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), { 
        id: `task-${Date.now()}`, 
        title: '',
        completed: false,
        priority: 'medium'
      }]
    }));
    
    // Scroll to the newly added task after render
    setTimeout(() => {
      if (taskListRef.current) {
        taskListRef.current.scrollTop = taskListRef.current.scrollHeight;
      }
    }, 0);
  };

  // Update a task in the list
  const updateTask = (taskId: string, updatedTask: Partial<GoalTask>) => {
    setNewGoal(prev => ({
      ...prev,
      tasks: prev.tasks?.map(task => 
        task.id === taskId ? { ...task, ...updatedTask } : task
      )
    }));
  };

  // Remove a task from the list
  const removeTask = (taskId: string) => {
    setNewGoal(prev => ({
      ...prev,
      tasks: prev.tasks?.filter(task => task.id !== taskId)
    }));
  };

  // Proceed to scheduling
  const proceedToScheduling = () => {
    setCreationStep('timeScheduling');
  };

  // Save the newly created goal
  const saveNewGoal = () => {
    // Create a new goal with the current data
    const goalToAdd = {
      title: newGoal.title || '',
      description: newGoal.curation || '',
      progress: 0,
      status: 'active' as const,
      taskIds: [],
      // Add any other required properties
    };
    
    // Add the goal to the store
    addGoal(goalToAdd);
    
    // Reset the creation state
    setIsCreatingGoal(false);
    setCreationStep('input');
    setNewGoal({
      title: '',
      curation: '',
      progress: 0,
      status: 'active',
      tasks: [],
      lastUpdated: new Date().toISOString()
    });
    setAiAnalysisResult(null);
    setNeedsAiHelp(null);
  };

  // 处理AI任务细化请求（仅在编辑模式下使用）
  const handleCurationAIRequest = async (type: 'tasks') => {
    if (!editingGoal) return;
    
    setSuggestionType('tasks');
    setIsCurationLoading(true);
    
    try {
      // 构建提示，专注于任务优化
      const userFeedback = editingGoal.curation || '';
      if (!userFeedback.trim()) {
        throw new Error('请提供有关任务的反馈');
      }
      
      const prompt = `我正在规划一个目标: "${editingGoal.title}"
      
当前的任务列表:
${(editingGoal.tasks || []).map((t, i) => `${i+1}. ${t.title}${t.timeline ? ` (${t.timeline})` : ''}`).join('\n')}

我对这些任务的反馈和希望改进的方面:
${userFeedback}

请根据我的反馈，对任务进行优化和调整。返回一个经过改进的任务列表，确保:
1. 尊重我的原始意图
2. 根据我的反馈完善任务描述
3. 为每个任务提供更具体的时间安排(如"本周五前"、"每周二"等)
4. 如果需要，拆分过于笼统的任务，或合并过于细碎的任务
5. 可以酌情添加1-2个对完成目标可能有帮助的新任务

返回的格式应为:
- 改进后的任务1 (时间安排)
- 改进后的任务2 (时间安排)
...`;
      
      console.log('发送任务优化AI请求:', prompt);
      
      // 调用AI服务
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          options: {
            temperature: 0.7,
            maxTokens: 800,
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI服务请求失败');
      }
      
      const data = await response.json();
      console.log('AI任务优化响应:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 设置AI响应
      setCurationAIResponse(data.text);
      
    } catch (error) {
      console.error('AI任务优化请求错误:', error);
      setCurationAIResponse(
        `AI请求过程中出现错误。请稍后再试。${error instanceof Error ? error.message : ''}`
      );
    } finally {
      setIsCurationLoading(false);
    }
  };

  // 处理用户表示不满意并继续提供反馈
  const handleFeedbackContinuation = () => {
    // 添加详细的调试日志
    console.log('====== 开始：handleFeedbackContinuation =======');
    console.log('editingGoal:', editingGoal);
    console.log('curationAIResponse:', curationAIResponse);
    console.log('showContinuedFeedback (当前):', showContinuedFeedback);
    
    try {
      // 移除对curation必须存在的检查，只要有AI响应就可以进入反馈流程
      if (!editingGoal) {
        console.log('条件检查未通过：没有editingGoal');
        return;
      }

      console.log('用户点击"我不满意"按钮', { 
        curation: editingGoal.curation,
        hasResponse: !!curationAIResponse 
      });

      // 保存当前轮次的交互到历史
      setFeedbackHistory(prev => [
        ...prev,
        {
          role: 'user',
          content: editingGoal.curation || '', 
          timestamp: new Date().toISOString()
        },
        ...(curationAIResponse ? [{
          role: 'assistant' as const,
          content: curationAIResponse,
          timestamp: new Date().toISOString()
        }] : [])
      ]);
      
      // 显示继续反馈的界面
      setShowContinuedFeedback(true);
      setContinuedFeedback(''); // 清空继续反馈的输入框
      
      console.log('设置showContinuedFeedback为true');
      console.log('用户不满意当前建议，准备继续提供反馈');
    } catch (error) {
      console.error('handleFeedbackContinuation出错:', error);
    }
    
    console.log('====== 结束：handleFeedbackContinuation =======');
  };

  // 提交继续的反馈
  const submitContinuedFeedback = async () => {
    if (!continuedFeedback.trim() || !editingGoal) return;
    
    // 递增反馈轮次
    setCurrentFeedbackRound(prev => prev + 1);
    
    // 显示加载状态
    setIsCurationLoading(true);
    setShowContinuedFeedback(false);
    
    // 在加载新建议期间先隐藏当前任务列表
    setCurationAIResponse(null);
    
    try {
      // 构建增强版提示，包含历史上下文
      const taskListText = (editingGoal.tasks || [])
        .map((t, i) => `${i+1}. ${t.title}${t.timeline ? ` (${t.timeline})` : ''}`)
        .join('\n');
      
      const historyContext = feedbackHistory.map(h => 
        `${h.role === 'user' ? '用户反馈' : 'AI建议'}:\n${h.content}`
      ).join('\n\n');
      
      const prompt = `我正在规划一个目标: "${editingGoal.title}"
      
当前的任务列表:
${taskListText}

${feedbackHistory.length > 0 ? `之前的交互记录:
${historyContext}` : ''}

用户的${currentFeedbackRound > 1 ? '新' : ''}反馈:
${continuedFeedback}

请根据${currentFeedbackRound > 1 ? '所有历史反馈和新的' : '用户的'}反馈意见，优化任务列表，确保:
1. 尊重用户的原始意图，并特别关注${currentFeedbackRound > 1 ? '新提出的' : ''}反馈点
2. 根据用户反馈完善任务描述
3. 为每个任务提供更具体的时间安排(如"本周五前"、"每周二"等)
4. 保持任务描述清晰明确
5. 可以根据反馈酌情调整任务的优先级、数量或详细程度

返回的格式应为:
- 改进后的任务1 (时间安排)
- 改进后的任务2 (时间安排)
...`;
      
      console.log(`发送第${currentFeedbackRound}轮优化AI请求:`, prompt);
      
      // 调用AI服务
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          options: { temperature: 0.7, maxTokens: 800 }
        }),
      });
      
      if (!response.ok) throw new Error('AI服务请求失败');
      
      const data = await response.json();
      console.log(`第${currentFeedbackRound}轮AI任务优化响应:`, data);
      
      if (data.error) throw new Error(data.error);
      
      // 设置新的AI响应
      setCurationAIResponse(data.text);
      
      // 更新主要反馈为最新的组合反馈
      setEditingGoal({
        ...editingGoal,
        curation: continuedFeedback
      });
      
    } catch (error) {
      console.error('AI多轮任务优化请求错误:', error);
      setCurationAIResponse(
        `AI请求过程中出现错误。请稍后再试。${error instanceof Error ? error.message : ''}`
      );
    } finally {
      setIsCurationLoading(false);
    }
  };

  // 修改应用AI任务优化建议函数，确保在应用后清空输入区
  const applyAISuggestion = () => {
    if (!curationAIResponse || !editingGoal) {
      console.error('无法应用AI建议：缺少必要数据');
      return;
    }
    
    console.log('开始应用AI优化建议...');
    
    let taskSuggestions: {title: string, timeline?: string}[] = [];
    
    // 尝试解析不同格式的AI响应
    try {
      // 首先尝试解析为JSON
      try {
        // 检测可能的JSON响应 (可能是完整JSON或包含JSON的文本)
        const jsonMatch = curationAIResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const jsonData = JSON.parse(jsonStr);
          
          if (Array.isArray(jsonData)) {
            console.log('检测到JSON格式的任务数据');
            taskSuggestions = jsonData.map(item => {
              return {
                title: item.任务 || item.title || '',
                timeline: item.时间安排 || item.timeline || ''
              };
            });
          }
        }
      } catch (jsonError) {
        console.log('JSON解析失败，尝试其他格式', jsonError);
      }
      
      // 如果JSON解析失败或没有找到有效任务，尝试解析列表格式
      if (taskSuggestions.length === 0) {
        console.log('尝试解析列表格式的任务');
        taskSuggestions = curationAIResponse
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
          .map(line => {
            // 尝试从建议中提取任务标题和时间安排
            const taskLine = line.trim().replace(/^[-•]\s*/, '');
            const timelineMatch = taskLine.match(/\s*\(([^)]+)\)\s*$/);
            
            let title = taskLine;
            let timeline = undefined;
            
            // 如果有时间安排，提取它
            if (timelineMatch) {
              title = taskLine.replace(/\s*\([^)]+\)\s*$/, '').trim();
              timeline = timelineMatch[1];
            }
            
            return { title, timeline };
          });
      }
    } catch (error) {
      console.error('解析AI响应失败:', error);
    }
    
    console.log('从AI响应中提取的任务建议:', taskSuggestions);
    
    if (taskSuggestions.length > 0) {
      // 创建新的任务数组，保留任务ID如果与现有任务匹配
      const updatedTasks = taskSuggestions.map((suggestion, index) => {
        // 尝试匹配现有任务
        const existingTask = editingGoal.tasks && index < editingGoal.tasks.length 
          ? editingGoal.tasks[index] 
          : null;
        
        return {
          id: existingTask?.id || `task-${Date.now()}-${index}`,
          title: suggestion.title,
          timeline: suggestion.timeline,
          completed: existingTask?.completed || false,
          description: existingTask?.description || '',
          priority: existingTask?.priority || 'medium'
        };
      });
      
      console.log('更新后的任务列表:', updatedTasks);
      
      // 计算新的进度
      const completedCount = updatedTasks.filter(t => t.completed).length;
      const newProgress = updatedTasks.length > 0 ? completedCount / updatedTasks.length : 0;
      
      // 更新目标的最后修改时间
      const now = new Date();
      const lastUpdatedTime = now.toISOString();
      
      // 先清理AI响应状态，避免界面混乱
      setCurationAIResponse(null);
      setCurationPrompt('');
      setContinuedFeedback('');
      setShowContinuedFeedback(false);
      setFeedbackHistory([]);
      setCurrentFeedbackRound(1);
      setSuggestionType(null);
      
      // 先显示加载状态
      setIsCurationLoading(true);
      
      // 短暂延迟后更新任务列表，让用户看到加载过程
      setTimeout(() => {
        // 更新本地编辑状态，使用类型断言，同时清空curation输入
        const updatedGoal = {
          ...editingGoal,
          tasks: updatedTasks,
          progress: newProgress,
          lastUpdated: lastUpdatedTime,
          curation: '' // 清空curation，为下一次输入做准备
        };
        setEditingGoal(updatedGoal as Goal);
        
        // 结束加载状态
        setIsCurationLoading(false);
        
        // 立即更新全局状态，以便在保存时不会丢失变更
        updateGoal(editingGoal.id, {
          tasks: updatedTasks,
          progress: newProgress,
          lastUpdated: lastUpdatedTime,
          curation: '' // 确保全局状态也清空了curation字段
        } as Partial<Goal>);
        
        console.log('AI优化任务已应用，更新后的任务数:', updatedTasks.length);
      }, 300);
    } else {
      console.warn('未从AI响应中提取到任何任务建议');
      // 显示提示
      setCurationAIResponse(curationAIResponse + "\n\n无法提取有效的任务建议，请检查AI响应格式。\n\n支持的格式：\n1. 列表格式（每行以'-'或'•'开头）\n2. JSON格式（包含任务和时间安排字段）");
    }
  };

  // 添加格式化时间的辅助函数
  const formatLastUpdated = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // 如果是今天
      if (date.toDateString() === now.toDateString()) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      
      // 如果是昨天
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      
      // 其他日期
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('格式化日期时出错:', error);
      return dateString;
    }
  };

  // 生成任务的函数
  const generateTasks = async (analysis: GoalAnalysis) => {
    if (!newGoal.title) return;
    
    setIsAiLoading(true);
    setAiError(null);
    
    try {
      const response = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: newGoal,
          analysis,
          context: {
            previousAnswers: questionHistory,
            currentStep: creationStep
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate tasks');
      
      const plan = await response.json();
      
      // 更新目标的任务
      setNewGoal(prev => ({
        ...prev,
        tasks: plan.tasks.map((task: any, index: number) => ({
          id: `task-${Date.now()}-${index}`,
          title: task.title,
          timeline: task.timeline,
          completed: false,
          priority: task.priority
        }))
      }));
      
      // 进入任务编辑阶段
      setCreationStep('taskGeneration');
      
    } catch (error) {
      console.error('Task generation error:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to generate tasks');
    } finally {
      setIsAiLoading(false);
    }
  };

  // 修改 textarea 的 onChange 处理
  const handleTextareaKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const value = (e.target as HTMLTextAreaElement).value.trim();
      if (value) {
        handleQuestionAnswer(value);
        (e.target as HTMLTextAreaElement).value = '';
      }
    }
  };

  // 修改编辑目标的处理
  const handleTaskCompletion = (taskId: string, completed: boolean) => {
    if (!editingGoal) return;
    
    const updatedTasks = editingGoal.tasks?.map(t =>
      t.id === taskId ? { ...t, completed } : t
    ) || [];
    
    setEditingGoal({
      ...editingGoal,
      tasks: updatedTasks
    });
  };

  return (
    <div className="space-y-6">
      {/* Goals List Section */}
      {!isCreatingGoal && (
        <div className="space-y-4">
          {/* Header with Add Goal button */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">My Goals</h2>
            <button
              onClick={() => setIsCreatingGoal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center gap-1 transition-colors"
            >
              <Plus size={16} />
              Add Goal
            </button>
          </div>
          
          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
              <Target size={40} className="mx-auto text-purple-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">No goals yet</h3>
              <p className="text-gray-500 mb-4">Create your first goal to start tracking your progress</p>
              <button
                onClick={() => setIsCreatingGoal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md inline-flex items-center gap-1 transition-colors"
              >
                <Plus size={16} />
                Add Goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div 
                  key={goal.id}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 mb-1">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-gray-600 text-sm mb-2">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingGoal(goal)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit goal"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Status and dates */}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        goal.status === 'active' ? 'bg-green-100 text-green-800' :
                        goal.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                      </span>
                    </div>
                    {goal.dueDate && (
                      <div className="flex items-center text-gray-500">
                        <Calendar size={14} className="mr-1" />
                        <span>Due {new Date(goal.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goal Creation Modal */}
      {isCreatingGoal && (
        <div className="bg-white rounded-lg shadow-md p-5 mb-6 transition-all">
          {/* Creation step indicator */}
          <div className="flex justify-between mb-4 text-sm font-medium">
            <div className={`flex items-center ${creationStep === 'input' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'input' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>1</div>
              Goal Input
            </div>
            <div className={`flex items-center ${creationStep === 'analysis' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'analysis' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>2</div>
              AI Analysis
            </div>
            <div className={`flex items-center ${creationStep === 'clarification' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'clarification' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>3</div>
              Clarification
            </div>
            <div className={`flex items-center ${creationStep === 'taskGeneration' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'taskGeneration' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>4</div>
              Tasks
            </div>
            <div className={`flex items-center ${creationStep === 'timeScheduling' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'timeScheduling' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>5</div>
              Schedule
            </div>
          </div>

          {/* Step 1: Goal Input */}
          {creationStep === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What's your goal?
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="e.g., 5月前找到喜欢的工作，提高健身水平..."
                  value={newGoal.title}
                  onChange={handleGoalInputChange}
                />
                
                {newGoal.title && newGoal.title.length > 3 && !isAiLoading && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setCreationStep('analysis');
                        analyzeGoal();
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <BrainCircuit size={18} />
                      智能分析目标并生成计划
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: AI Analysis */}
          {creationStep === 'analysis' && (
            <div className="space-y-4">
              {isAiLoading ? (
                <div className="flex flex-col items-center py-6">
                  <Loader2 size={30} className="animate-spin mb-3 text-blue-600" />
                  <p className="text-gray-600">正在分析你的目标...</p>
                </div>
              ) : goalAnalysis ? (
                <div className="space-y-4">
                  {/* 只在需要澄清时显示问题 */}
                  {goalAnalysis.needsClarification ? (
                    <div>
                      {goalAnalysis.insights && (
                        <div className="flex items-start gap-2 mb-4 text-gray-600">
                          <div className="p-1.5 bg-blue-100 rounded-full">
                            <BrainCircuit size={16} className="text-blue-600" />
                          </div>
                          <p className="text-sm">{goalAnalysis.insights}</p>
                        </div>
                      )}
                      
                      {goalAnalysis.suggestedQuestions.map((question) => (
                        <div key={question.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <div className="p-4">
                            <p className="text-gray-900 mb-3">{question.text}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {question.options.map((option: QuestionOption, index: number) => (
                                <button
                                  key={option.id}
                                  onClick={() => {
                                    // 选择选项后直接生成任务
                                    setNewGoal(prev => ({
                                      ...prev,
                                      tasks: option.tasks.map((task, taskIndex) => ({
                                        id: `task-${Date.now()}-${taskIndex}`,
                                        title: task.title,
                                        timeline: task.timeline,
                                        priority: task.priority,
                                        completed: false
                                      }))
                                    }));
                                    // 进入任务编辑阶段
                                    setCreationStep('taskGeneration');
                                  }}
                                  className="flex items-center gap-3 p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                                  title={`选择 ${option.text}`}
                                >
                                  <span className="text-2xl" role="img" aria-label={option.text}>{option.emoji}</span>
                                  <span>{option.text}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // 如果目标足够清晰，直接显示建议的任务
                    <div>
                      {goalAnalysis.insights && (
                        <div className="flex items-start gap-2 mb-4 text-gray-600">
                          <div className="p-1.5 bg-green-100 rounded-full">
                            <CheckCheck size={16} className="text-green-600" />
                          </div>
                          <p className="text-sm">{goalAnalysis.insights}</p>
                        </div>
                      )}
                      
                      {goalAnalysis.suggestedTasks && (
                        <div className="space-y-2">
                          {goalAnalysis.suggestedTasks.map((task, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  task.priority === 'high' ? 'bg-red-500' :
                                  task.priority === 'medium' ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                }`} />
                                <span>{task.title}</span>
                              </div>
                              <span className="text-sm text-gray-500">{task.timeline}</span>
                            </div>
                          ))}
                          
                          <button
                            onClick={() => {
                              // 将建议的任务添加到目标中
                              setNewGoal(prev => ({
                                ...prev,
                                tasks: goalAnalysis.suggestedTasks?.map((task, index) => ({
                                  id: `task-${Date.now()}-${index}`,
                                  title: task.title,
                                  timeline: task.timeline,
                                  priority: task.priority,
                                  completed: false
                                }))
                              }));
                              // 进入任务编辑阶段
                              setCreationStep('taskGeneration');
                            }}
                            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                          >
                            <Plus size={18} />
                            添加这些任务
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Step 3: Clarification */}
          {creationStep === 'clarification' && currentQuestion && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <MessageSquare size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 mb-1">{currentQuestion.text}</p>
                    <p className="text-sm text-gray-500">{currentQuestion.purpose}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  {currentQuestion.type === 'yes_no' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuestionAnswer('是')}
                        className="flex-1 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md"
                      >
                        是
                      </button>
                      <button
                        onClick={() => handleQuestionAnswer('否')}
                        className="flex-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md"
                      >
                        否
                      </button>
                    </div>
                  ) : currentQuestion.type === 'choice' || (currentQuestion.type === 'multiple_choice' && currentQuestion.options) ? (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option: QuestionOption) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            if (currentQuestion.type === 'choice') {
                              // 选择选项后直接生成任务
                              setNewGoal(prev => ({
                                ...prev,
                                tasks: option.tasks.map((task, taskIndex) => ({
                                  id: `task-${Date.now()}-${taskIndex}`,
                                  title: task.title,
                                  timeline: task.timeline,
                                  priority: task.priority,
                                  completed: false
                                }))
                              }));
                              // 进入任务编辑阶段
                              setCreationStep('taskGeneration');
                            } else {
                              // 对于 multiple_choice，只记录答案
                              handleQuestionAnswer(option.text);
                            }
                          }}
                          className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl" role="img" aria-label={option.text}>{option.emoji}</span>
                            <span>{option.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="请输入你的回答..."
                        onKeyPress={handleTextareaKeyPress}
                      />
                      <button
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        onClick={(e) => {
                          const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                          if (textarea.value.trim()) {
                            handleQuestionAnswer(textarea.value.trim());
                            textarea.value = '';
                          }
                        }}
                      >
                        提交回答
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {questionHistory.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">之前的对话</h4>
                  <div className="space-y-2">
                    {questionHistory.map((item, index) => (
                      <div key={index} className="text-sm">
                        <p className="text-gray-500">{item.question.text}</p>
                        <p className="text-gray-900">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Task Generation */}
          {creationStep === 'taskGeneration' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">任务清单</h3>
                <button
                  onClick={addTask}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center gap-1"
                >
                  <Plus size={14} />
                  添加任务
                </button>
              </div>
              
              <div className="space-y-2">
                {newGoal.tasks?.map((task, index) => (
                  <div
                    key={task.id}
                    className="group flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            task.priority === 'high' ? 'bg-red-500' :
                            task.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}
                        />
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => updateTask(task.id, { title: e.target.value })}
                          className="flex-1 text-gray-900 bg-transparent border-0 focus:ring-0"
                          placeholder="任务描述..."
                        />
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock size={14} />
                          <input
                            type="text"
                            value={task.timeline || ''}
                            onChange={(e) => updateTask(task.id, { timeline: e.target.value })}
                            className="bg-transparent border-0 focus:ring-0 p-0 text-gray-500"
                            placeholder="时间安排..."
                          />
                        </div>
                        <select
                          value={task.priority}
                          onChange={(e) => updateTask(task.id, { priority: e.target.value as 'high' | 'medium' | 'low' })}
                          className="text-sm bg-transparent border-0 focus:ring-0 text-gray-500"
                          title="设置任务优先级"
                          aria-label="任务优先级"
                        >
                          <option value="high">高优先级</option>
                          <option value="medium">中优先级</option>
                          <option value="low">低优先级</option>
                        </select>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                      title={`删除任务 "${task.title}"`}
                      aria-label={`删除任务 "${task.title}"`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setCreationStep('analysis')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  返回
                </button>
                <button
                  onClick={() => setCreationStep('timeScheduling')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!newGoal.tasks?.some(t => t.title.trim())}
                >
                  继续
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Time Scheduling */}
          {creationStep === 'timeScheduling' && (
            <div className="space-y-4">
              {/* Time scheduling form */}
              {/* Implementation of time scheduling form */}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 