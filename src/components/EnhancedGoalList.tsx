'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Target, X, ChevronDown, ChevronUp, Calendar, Star, Clock, CheckCircle2, Loader2, Info, Sparkles, Send, RefreshCw, Wand2, BrainCircuit, CheckCheck, MessageSquare } from 'lucide-react';
import { useAppStore } from '@/store/store';
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
  timeline?: string; // e.g., "March", "Week 1", etc.
  completed: boolean;
  description?: string;
}

// Type for the creation flow state
type CreationStep = 'input' | 'aiQuestion' | 'taskGeneration' | 'timeScheduling';

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
      setCreationStep('aiQuestion');
      setAiQuestionShown(true);
    } else {
      // Skip to manual task creation
      setCreationStep('taskGeneration');
      
      // Add some default empty tasks to get started
      setNewGoal(prev => ({
        ...prev,
        tasks: [
          { id: `task-${Date.now()}-1`, title: '', completed: false },
          { id: `task-${Date.now()}-2`, title: '', completed: false },
        ]
      }));
    }
  };

  // Request AI analysis of the goal
  const requestAiAnalysis = async () => {
    if (!newGoal.title) return;
    
    setIsAiLoading(true);
    setAiError(null);
    
    try {
      console.log("Requesting AI analysis for goal:", newGoal.title);
      const result = await analyzeGoal(newGoal.title);
      console.log("AI analysis result:", result);
      
      setAiAnalysisResult(result);
      
      // Automatically apply the AI suggestions
      const generatedTasks: GoalTask[] = result.suggestedTasks.map((task, index) => ({
        id: `task-${Date.now()}-${index}`,
        title: task.title,
        timeline: task.timeline,
        completed: false
      }));
      
      // Update the goal with AI-generated information
      setNewGoal(prev => ({
        ...prev,
        tasks: generatedTasks,
        aiGenerated: true,
      }));
      
      // Move to task editing step
      setCreationStep('taskGeneration');
    } catch (error) {
      console.error("Error during AI analysis:", error);
      setAiError(error instanceof Error ? error.message : "Failed to get AI recommendations");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle AI question response
  const handleAiQuestionResponse = (response: string) => {
    console.log("AI question response:", response);
    
    // Set loading state
    setIsAiLoading(true);
    
    // Generate tasks based on the response and goal category
    let focusArea = response; // e.g., 'strength', 'endurance', 'applications', 'interview'
    
    // For predefined categories, we can use our hard-coded responses for now
    // In the future, this could be replaced with a real AI call with the focus area as context
    let generatedTasks: GoalTask[] = [];
    
    if (aiSuggestion === 'fitness') {
      if (response === 'strength') {
        generatedTasks = [
          { id: `task-${Date.now()}-1`, title: '每周进行3次力量训练', timeline: '周一/周三/周五', completed: false },
          { id: `task-${Date.now()}-2`, title: '每次训练记录重量并尝试递增', timeline: '每次训练', completed: false },
          { id: `task-${Date.now()}-3`, title: '确保每周摄入足够蛋白质', timeline: '每天', completed: false },
        ];
      } else if (response === 'endurance') {
        generatedTasks = [
          { id: `task-${Date.now()}-1`, title: '每周慢跑3次，每次30分钟', timeline: '周二/周四/周六', completed: false },
          { id: `task-${Date.now()}-2`, title: '每两周增加5分钟跑步时间', timeline: '每两周', completed: false },
          { id: `task-${Date.now()}-3`, title: '参加一次5公里跑步活动', timeline: '下个月', completed: false },
        ];
      }
    } else if (aiSuggestion === 'career') {
      if (response === 'applications') {
        generatedTasks = [
          { id: `task-${Date.now()}-1`, title: '更新简历和求职信', timeline: '本周', completed: false },
          { id: `task-${Date.now()}-2`, title: '每周申请10个职位', timeline: '每周', completed: false },
          { id: `task-${Date.now()}-3`, title: '跟进之前的申请', timeline: '每周五', completed: false },
          { id: `task-${Date.now()}-4`, title: '与3位行业人士进行网络联系', timeline: '本月', completed: false },
        ];
      } else if (response === 'interview') {
        generatedTasks = [
          { id: `task-${Date.now()}-1`, title: '准备常见面试问题答案', timeline: '本周', completed: false },
          { id: `task-${Date.now()}-2`, title: '进行3次模拟面试', timeline: '下两周', completed: false },
          { id: `task-${Date.now()}-3`, title: '研究目标公司背景', timeline: '每次面试前', completed: false },
        ];
      }
    } else {
      // For other categories, use the AI service to generate tasks
      requestAiAnalysis();
      return;
    }
    
    // Update goal with generated tasks
    setNewGoal(prev => ({
      ...prev,
      tasks: generatedTasks,
      aiGenerated: true,
    }));
    
    // Simulate a delay to show loading state
    setTimeout(() => {
      setIsAiLoading(false);
      // Move to task editing step
      setCreationStep('taskGeneration');
    }, 800);
  };

  // Add a new task to the list
  const addTask = () => {
    setNewGoal(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), { 
        id: `task-${Date.now()}`, 
        title: '',
        completed: false
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
    // 使用as any类型断言处理lastUpdated字段
    const finalGoal = {
      title: newGoal.title || 'Untitled Goal',
      curation: newGoal.curation || '',
      progress: 0,
      status: 'active',
      startDate: new Date().toISOString(),
      tasks: newGoal.tasks?.filter(task => task.title.trim() !== '') || [],
      aiGenerated: needsAiHelp || false,
      lastUpdated: new Date().toISOString() // 添加当前时间作为创建/更新时间
    } as Omit<Goal, 'id'>;
    
    addGoal(finalGoal);
    console.log("Saving new goal:", finalGoal);
    
    // Reset creation flow
    toggleGoalCreation();
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
          description: existingTask?.description || ''
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

  return (
    <div className="space-y-8">
      {/* Top action bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">My Goals</h2>
        {!isCreatingGoal && (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            onClick={toggleGoalCreation}
          >
            <Plus size={18} /> New Goal
          </button>
        )}
      </div>

      {/* Goal creation flow - appears when creating a new goal */}
      {isCreatingGoal && (
        <div className="bg-white rounded-lg shadow-md p-5 mb-6 transition-all">
          {/* Creation step indicator */}
          <div className="flex justify-between mb-4 text-sm font-medium">
            <div className={`flex items-center ${creationStep === 'input' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'input' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>1</div>
              Goal Input
            </div>
            <div className={`flex items-center ${creationStep === 'aiQuestion' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'aiQuestion' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>2</div>
              AI Assistance
            </div>
            <div className={`flex items-center ${creationStep === 'taskGeneration' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'taskGeneration' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>3</div>
              Tasks
            </div>
            <div className={`flex items-center ${creationStep === 'timeScheduling' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${creationStep === 'timeScheduling' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>4</div>
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
                
                {/* AI suggestions based on input */}
                {aiSuggestion && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs mr-2">AI</span>
                    
                    {aiSuggestion === 'fitness' && "这是一个健身目标，想要添加具体的健身类型和衡量标准吗？"}
                    {aiSuggestion === 'career' && "这是一个职业目标，想要设定具体的申请数量或面试准备计划吗？"}
                    {aiSuggestion === 'learning' && "这是一个学习目标，想要设定具体的学习里程碑吗？"}
                    {aiSuggestion === 'general' && "我们可以帮你拆解这个目标为可执行的任务和时间安排。"}
                    
                    {needsAiHelp === null && !isAiLoading && (
                      <div className="mt-2 flex gap-2">
                        <button 
                          onClick={() => selectAiOption(true)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs transition-colors"
                          aria-label="需要 AI 帮我拆解"
                        >
                          需要 AI 帮我拆解
                        </button>
                        <button 
                          onClick={() => selectAiOption(false)}
                          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md text-xs transition-colors"
                          aria-label="让我自己设定计划"
                        >
                          让我自己设定计划
                        </button>
                      </div>
                    )}
                    
                    {isAiLoading && (
                      <div className="mt-2 flex items-center text-blue-600">
                        <Loader2 size={16} className="animate-spin mr-2" />
                        <span>AI 正在思考最佳方案...</span>
                      </div>
                    )}
                    
                    {aiError && (
                      <div className="mt-2 text-red-500 flex items-center">
                        <span>出现问题: {aiError}</span>
                        <button 
                          onClick={() => setAiError(null)}
                          className="ml-2 text-xs underline"
                        >
                          重试
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Show continue button if enough text is entered but no AI suggestion shown yet */}
                {newGoal.title && newGoal.title.length > 3 && !aiSuggestion && !isAiLoading && (
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={() => selectAiOption(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      aria-label="继续"
                    >
                      继续
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: AI Questions (when needed) */}
          {creationStep === 'aiQuestion' && aiQuestionShown && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                {isAiLoading ? (
                  <div className="flex flex-col items-center py-6 text-blue-600">
                    <Loader2 size={30} className="animate-spin mb-3" />
                    <p>AI 正在分析你的目标，生成任务建议...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-700 mb-3">
                      {aiSuggestion === 'fitness' && "你更想提升哪一方面的健身能力？"}
                      {aiSuggestion === 'career' && "在找工作过程中，你需要更多关注哪一方面？"}
                      {aiSuggestion === 'learning' && "你学习的主要目的是什么？"}
                      {aiSuggestion === 'general' && "关于这个目标，你可以选择直接使用 AI 自动生成任务计划，或者回答更多问题来获得更精准的建议："}
                    </p>
                    
                    {aiSuggestion === 'general' && (
                      <div className="grid grid-cols-1 gap-3 mb-4">
                        <button 
                          onClick={() => requestAiAnalysis()}
                          className="flex items-center gap-2 p-3 bg-blue-100 border border-blue-200 rounded-md hover:bg-blue-200 transition-colors text-left"
                        >
                          <span className="p-2 bg-blue-200 rounded-full">✨</span>
                          <div>
                            <p className="font-medium">直接生成任务计划</p>
                            <p className="text-xs text-gray-600">AI 会根据你的目标自动创建任务列表和时间安排</p>
                          </div>
                        </button>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      {aiSuggestion === 'fitness' && (
                        <>
                          <button 
                            onClick={() => handleAiQuestionResponse('strength')}
                            className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            <span className="p-2 bg-blue-100 rounded-full">💪</span>
                            <div className="text-left">
                              <p className="font-medium">力量训练</p>
                              <p className="text-xs text-gray-500">增肌、提高最大重量</p>
                            </div>
                          </button>
                          <button 
                            onClick={() => handleAiQuestionResponse('endurance')}
                            className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            <span className="p-2 bg-green-100 rounded-full">🏃</span>
                            <div className="text-left">
                              <p className="font-medium">耐力训练</p>
                              <p className="text-xs text-gray-500">心肺功能、跑步能力</p>
                            </div>
                          </button>
                        </>
                      )}
                      
                      {aiSuggestion === 'career' && (
                        <>
                          <button 
                            onClick={() => handleAiQuestionResponse('applications')}
                            className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            <span className="p-2 bg-blue-100 rounded-full">📝</span>
                            <div className="text-left">
                              <p className="font-medium">求职申请</p>
                              <p className="text-xs text-gray-500">简历优化、投递申请</p>
                            </div>
                          </button>
                          <button 
                            onClick={() => handleAiQuestionResponse('interview')}
                            className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            <span className="p-2 bg-orange-100 rounded-full">🎯</span>
                            <div className="text-left">
                              <p className="font-medium">面试准备</p>
                              <p className="text-xs text-gray-500">面试技巧、模拟练习</p>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
                
                {aiError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md text-red-600">
                    <p className="font-medium">AI 分析过程中出现问题</p>
                    <p className="text-sm mt-1">{aiError}</p>
                    <button 
                      onClick={() => {
                        setAiError(null);
                        requestAiAnalysis();
                      }}
                      className="mt-2 text-sm px-3 py-1 bg-white border border-red-200 rounded-md hover:bg-red-50"
                    >
                      重新尝试
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Task Generation & Editing */}
          {creationStep === 'taskGeneration' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="goal-title">
                  Goal Title
                </label>
                <input
                  id="goal-title"
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                />
              </div>
              
              {/* AI Insights - shown when available */}
              {aiAnalysisResult?.insights && (
                <div className="bg-blue-50 p-3 rounded-md text-sm border border-blue-100">
                  <div className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full p-1 mt-0.5">
                      <Target size={14} />
                    </span>
                    <div>
                      <p className="font-medium text-blue-800">
                        AI 见解
                        {aiAnalysisResult.isSimulated && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            模拟数据
                          </span>
                        )}
                      </p>
                      <p className="text-gray-700 mt-1">{aiAnalysisResult.insights}</p>
                      {aiAnalysisResult.isSimulated && (
                        <p className="text-xs text-amber-600 mt-1">
                          注意: 这是模拟数据，DeepSeek API 连接出现问题(可能需要检查 API 密钥或账户余额)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasks for this goal
                </label>
                <div 
                  ref={taskListRef}
                  className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-2"
                >
                  {newGoal.tasks && newGoal.tasks.length > 0 ? (
                    newGoal.tasks.map((task, index) => (
                      <div key={task.id} className="flex items-start gap-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                        <div className="mt-2 mr-1">
                          <input
                            type="checkbox"
                            title={`Toggle completion for "${task.title || 'Untitled task'}"`}
                            checked={task.completed}
                            onChange={(e) => updateTask(task.id, { completed: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Task title"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, { title: e.target.value })}
                            className="w-full px-2 py-1 border-0 focus:ring-0 bg-transparent"
                          />
                          {task.timeline && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Clock size={12} className="mr-1" />
                              <span>{task.timeline}</span>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => removeTask(task.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          aria-label={`Remove task "${task.title || 'Untitled task'}"`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No tasks yet. Add some tasks to achieve your goal.
                    </div>
                  )}
                </div>
                
                <button
                  onClick={addTask}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  aria-label="Add task"
                >
                  <Plus size={16} /> Add task
                </button>
              </div>
              
              {/* 同步提示 */}
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 border border-blue-100 mt-4">
                <div className="flex items-center">
                  <Info size={16} className="mr-2 flex-shrink-0" />
                  <p>任务会自动同步到 All Tasks。编辑或添加任务后，点击保存按钮更新。</p>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => needsAiHelp ? setCreationStep('aiQuestion') : setCreationStep('input')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={proceedToScheduling}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!newGoal.title || !(newGoal.tasks && newGoal.tasks.some(t => t.title.trim() !== ''))}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          
          {/* Step 4: Time Scheduling */}
          {creationStep === 'timeScheduling' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Time Scheduling</h3>
                <div className="flex space-x-2">
                  <button 
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                    aria-label="让我自己安排时间"
                  >
                    让我自己安排
                  </button>
                  <button 
                    className="px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-100"
                    aria-label="AI 帮我找空闲时间"
                  >
                    AI 帮我找空闲时间
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">时间安排示例:</p>
                
                {newGoal.tasks && newGoal.tasks.map((task, index) => (
                  <div key={task.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-md border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span>{task.title || 'Untitled task'}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {task.timeline || '未安排'}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCreationStep('taskGeneration')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  aria-label="Back to task generation"
                >
                  Back
                </button>
                <button
                  onClick={saveNewGoal}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  aria-label="Save goal and tasks"
                >
                  Save Goal
                </button>
              </div>
            </div>
          )}
          
          {/* Close button */}
          <button 
            onClick={toggleGoalCreation}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close goal creation"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Goals list - displays all goals */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Target size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No goals yet. Add your first goal to get started!</p>
          </div>
        ) : (
          goals.map(goal => (
            <div 
              key={goal.id} 
              className={`border rounded-lg p-4 bg-white hover:shadow-md transition-shadow ${
                goal.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`text-lg font-medium ${goal.status === 'completed' ? 'text-green-700' : ''}`}>
                  {goal.title}
                  {goal.status === 'completed' && (
                    <span className="ml-2 inline-flex items-center text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                      <CheckCircle2 size={12} className="mr-1" /> Completed
                    </span>
                  )}
                </h3>
                <div className="flex space-x-1">
                  <button
                    className="p-1 text-gray-400 hover:text-blue-600"
                    onClick={() => setEditingGoal(goal)}
                    aria-label={`Edit goal "${goal.title}"`}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-red-600"
                    onClick={() => deleteGoal(goal.id)}
                    aria-label={`Delete goal "${goal.title}"`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {(goal as any).lastUpdated && (
                <p className="text-gray-500 text-xs mb-3">
                  最后更新: {formatLastUpdated((goal as any).lastUpdated)}
                </p>
              )}
              
              {/* 只为未完成的目标显示进度条 */}
              {goal.status !== 'completed' && (
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(goal.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${goal.progress * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Display tasks if available */}
              {goal.tasks && goal.tasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm font-medium text-gray-700 mb-2">Tasks:</div>
                  <div className="space-y-1">
                    {goal.tasks.map((task, index) => (
                      <div key={task.id} className="flex items-center">
                        <div 
                          className={`w-4 h-4 mr-2 rounded-full flex-shrink-0 flex items-center justify-center ${
                            task.completed ? 'bg-green-100 text-green-600' : 'border border-gray-300'
                          }`}
                          onClick={() => {
                            // 更新任务状态
                            const updatedTasks = [...goal.tasks!];
                            updatedTasks[index] = { ...task, completed: !task.completed };
                            
                            // 计算新的进度
                            const completedCount = updatedTasks.filter(t => t.completed).length;
                            const newProgress = updatedTasks.length > 0 ? completedCount / updatedTasks.length : 0;
                            
                            // 更新目标
                            updateGoal(goal.id, { 
                              tasks: updatedTasks,
                              progress: newProgress
                            });
                          }}
                        >
                          {task.completed && <CheckCircle2 size={16} className="text-green-500" />}
                        </div>
                        <span className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                          {task.title}
                        </span>
                        {task.timeline && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({task.timeline})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end items-center mt-4">
                {/* 完成按钮 */}
                <button
                  className={`px-3 py-1 text-xs rounded-full ${
                    goal.status === 'completed' 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                  onClick={() => updateGoal(goal.id, { 
                    status: goal.status === 'completed' ? 'active' : 'completed',
                    progress: goal.status === 'completed' ? 0 : 1
                  })}
                >
                  {goal.status === 'completed' ? 'Mark as Incomplete' : 'Mark as Complete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* 编辑目标模态框 */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Edit Goal</h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setEditingGoal(null)}
                  title="Close dialog"
                  aria-label="Close dialog"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-goal-title">
                    Goal Title
                  </label>
                  <input
                    id="edit-goal-title"
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingGoal.title}
                    onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-goal-curation">
                    任务细化与优化
                  </label>
                  
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="flex items-center bg-blue-50 px-3 py-2 border-b border-blue-200">
                      <BrainCircuit size={16} className="text-blue-700 mr-2" />
                      <span className="text-sm font-medium text-blue-700">AI辅助任务优化</span>
                    </div>
                    
                    <div className="p-3 bg-white">
                      <p className="text-sm text-gray-700 mb-3">
                        分享你对当前任务如何改进的想法，AI将根据你的反馈帮助优化任务。
                      </p>
                      
                      <div className="relative mb-3">
                        <textarea
                          id="edit-goal-curation"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingGoal.curation || ''}
                          onChange={(e) => setEditingGoal({...editingGoal, curation: e.target.value})}
                          placeholder="例如: '需要更具体的截止日期'，'任务描述太模糊'，'将任务2拆分成更小的步骤'，'添加有关研究的内容'..."
                          rows={3}
                        />
                      </div>
                      
                      {!isCurationLoading && !curationAIResponse && (
                        <button
                          type="button"
                          onClick={() => handleCurationAIRequest('tasks')}
                          disabled={!editingGoal.curation?.trim() || isCurationLoading}
                          className={`w-full px-3 py-2 text-sm rounded-md flex items-center justify-center ${
                            !editingGoal.curation?.trim() || isCurationLoading
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <Sparkles size={14} className="mr-1.5" />
                          用AI优化任务
                        </button>
                      )}
                      
                      {isCurationLoading && (
                        <div className="flex items-center justify-center p-4 text-blue-600">
                          <RefreshCw size={16} className="mr-2 animate-spin" />
                          <span>AI正在分析并优化你的任务...</span>
                        </div>
                      )}
                      
                      {curationAIResponse && !isCurationLoading && (
                        <>
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                              <span>优化后的任务列表:</span>
                              {currentFeedbackRound > 1 && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  第 {currentFeedbackRound} 轮优化
                                </span>
                              )}
                            </div>
                            <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 whitespace-pre-line">
                              {curationAIResponse}
                            </div>
                          </div>
                          
                          {/* 重新设计按钮区域，确保点击事件正确绑定 */}
                          <div className="flex justify-between mt-3">
                            <button
                              type="button"
                              onClick={() => {
                                console.log('点击了"我不满意"按钮');
                                handleFeedbackContinuation();
                              }}
                              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md flex items-center transition-colors"
                            >
                              <MessageSquare size={14} className="mr-1.5" />
                              我不满意，需要调整
                            </button>
                            
                            <button
                              type="button"
                              onClick={applyAISuggestion}
                              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center transition-colors"
                            >
                              <Wand2 size={14} className="mr-1.5" />
                              应用建议
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    分享你对任务优化的想法，AI将帮助改进任务，同时尊重你的原始意图。
                  </p>
                </div>
                
                {/* 将反馈区域移到任务列表上方 */}
                {showContinuedFeedback && (
                  <div className="border border-blue-200 bg-blue-50 p-4 rounded-md my-4">
                    <p className="text-sm font-medium text-blue-700 mb-2">
                      请告诉我哪些方面需要进一步调整：
                    </p>
                    <textarea
                      className="w-full px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={continuedFeedback}
                      onChange={(e) => setContinuedFeedback(e.target.value)}
                      placeholder="例如：'第一个任务时间太紧张'，'希望增加更多关于研究的任务'，'需要明确每个任务的优先级'..."
                      rows={3}
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          console.log('取消反馈');
                          setShowContinuedFeedback(false);
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 mr-2"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('提交反馈内容:', continuedFeedback);
                          submitContinuedFeedback();
                        }}
                        disabled={!continuedFeedback.trim()}
                        className={`px-3 py-1.5 text-sm rounded-md flex items-center ${
                          !continuedFeedback.trim() 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <Send size={14} className="mr-1.5" />
                        发送反馈
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Insights - shown when available */}
                {aiAnalysisResult?.insights && (
                  <div className="bg-blue-50 p-3 rounded-md text-sm border border-blue-100">
                    <div className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full p-1 mt-0.5">
                        <Target size={14} />
                      </span>
                      <div>
                        <p className="font-medium text-blue-800">
                          AI 见解
                          {aiAnalysisResult.isSimulated && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                              模拟数据
                            </span>
                          )}
                        </p>
                        <p className="text-gray-700 mt-1">{aiAnalysisResult.insights}</p>
                        {aiAnalysisResult.isSimulated && (
                          <p className="text-xs text-amber-600 mt-1">
                            注意: 这是模拟数据，DeepSeek API 连接出现问题(可能需要检查 API 密钥或账户余额)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 同步提示 */}
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 border border-blue-100 mt-4">
                <div className="flex items-center">
                  <Info size={16} className="mr-2 flex-shrink-0" />
                  <p>任务会自动同步到 All Tasks。编辑或添加任务后，点击保存按钮更新。</p>
                </div>
              </div>
              
              {/* 任务列表部分 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasks {editingGoal?.tasks && editingGoal.tasks.length > 0 ? `(${editingGoal.tasks.length})` : ''}
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-2">
                  {editingGoal?.tasks && editingGoal.tasks.length > 0 ? (
                    editingGoal.tasks.map((task, index) => (
                      <div 
                        key={`${task.id}-${index}`} 
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => {
                            const updatedTasks = [...editingGoal.tasks!];
                            updatedTasks[index] = { ...task, completed: e.target.checked };
                            setEditingGoal({ ...editingGoal, tasks: updatedTasks });
                            console.log('任务状态已更新:', updatedTasks);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`Mark task "${task.title || 'Untitled task'}" as ${task.completed ? 'incomplete' : 'complete'}`}
                          title={`Mark task as ${task.completed ? 'incomplete' : 'complete'}`}
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => {
                              const updatedTasks = [...editingGoal.tasks!];
                              updatedTasks[index] = { ...task, title: e.target.value };
                              setEditingGoal({ ...editingGoal, tasks: updatedTasks });
                              console.log('任务标题已更新:', updatedTasks);
                            }}
                            className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm"
                            placeholder="Enter task title"
                            aria-label="Task title"
                          />
                          {task.timeline && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Clock size={12} className="mr-1" />
                              <span>{task.timeline}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const updatedTasks = [...editingGoal.tasks!];
                            updatedTasks.splice(index, 1);
                            setEditingGoal({ ...editingGoal, tasks: updatedTasks });
                            console.log('任务已删除:', updatedTasks);
                          }}
                          className="text-red-500 hover:text-red-700"
                          aria-label={`Remove task "${task.title || 'Untitled task'}"`}
                          title="Remove task"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      {isCurationLoading ? "正在更新任务..." : "暂无任务，请添加或使用AI生成"}
                    </p>
                  )}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <button
                    onClick={() => {
                      const newTask: GoalTask = {
                        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: '',
                        completed: false
                      };
                      setEditingGoal({
                        ...editingGoal,
                        tasks: [...(editingGoal.tasks || []), newTask]
                      });
                      console.log('新任务已添加');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Plus size={14} className="mr-1" /> 添加任务
                  </button>
                  
                  {curationAIResponse && (
                    <button
                      onClick={applyAISuggestion}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Wand2 size={14} className="mr-1" /> 应用当前的AI建议
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* 模态框底部按钮 */}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                onClick={() => setEditingGoal(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  // 确保使用最新的编辑状态
                  const currentEditingGoal = {...editingGoal};
                  
                  // 过滤掉空任务
                  const filteredTasks = currentEditingGoal.tasks?.filter(t => t.title.trim() !== '') || [];
                  
                  console.log('保存前的任务列表:', filteredTasks);
                  
                  // 计算新的进度
                  let newProgress = currentEditingGoal.progress;
                  if (filteredTasks.length > 0) {
                    const completedCount = filteredTasks.filter(t => t.completed).length;
                    newProgress = completedCount / filteredTasks.length;
                  }
                  
                  // 更新目标
                  updateGoal(currentEditingGoal.id, {
                    ...currentEditingGoal,
                    tasks: filteredTasks,
                    progress: newProgress,
                    lastUpdated: new Date().toISOString() // 添加更新时间戳
                  } as Partial<Goal>);
                  
                  // 记录日志
                  console.log('更新目标:', currentEditingGoal.title, '任务数:', filteredTasks.length);
                  
                  // 关闭模态框
                  setEditingGoal(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 