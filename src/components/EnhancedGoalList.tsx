'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Target, X, ChevronDown, ChevronUp, Calendar, Star, Clock, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useAppStore } from '@/store/store';
import { analyzeGoal, GoalAnalysisResult } from '@/services/ai';

/**
 * Goal interface - Represents a goal in the application
 */
interface Goal {
  id: string;
  title: string;
  description?: string;
  category?: string;
  progress: number;
  status: 'active' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  finishDate?: string;
  tasks?: GoalTask[];
  aiGenerated?: boolean;
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
    description: '',
    progress: 0,
    status: 'active',
    tasks: [],
  });
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [needsAiHelp, setNeedsAiHelp] = useState<boolean | null>(null);
  const [goalCategory, setGoalCategory] = useState<string>('');
  const [aiQuestionShown, setAiQuestionShown] = useState(false);
  
  // AI-specific states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<GoalAnalysisResult | null>(null);
  
  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);

  // Effects for AI suggestions
  useEffect(() => {
    if (newGoal.title && newGoal.title.length > 3 && !aiSuggestion) {
      // Clear any previous AI errors
      setAiError(null);
      
      // Simple keyword detection for immediate feedback
      const goalText = newGoal.title.toLowerCase();
      
      // Initial category detection based on keywords
      if (goalText.includes('workout') || goalText.includes('exercise') || goalText.includes('健身')) {
        setAiSuggestion('fitness');
        setGoalCategory('Health & Fitness');
      } else if (goalText.includes('work') || goalText.includes('job') || goalText.includes('找工作')) {
        setAiSuggestion('career');
        setGoalCategory('Career');
      } else if (goalText.includes('learn') || goalText.includes('study') || goalText.includes('学习')) {
        setAiSuggestion('learning');
        setGoalCategory('Education');
      } else if (goalText.length > 10) {
        // For other goals, set a generic suggestion after enough text
        setAiSuggestion('general');
      }
    }
  }, [newGoal.title]);

  // Toggle creating goal form
  const toggleGoalCreation = () => {
    setIsCreatingGoal(!isCreatingGoal);
    setCreationStep('input');
    setNewGoal({
      title: '',
      description: '',
      progress: 0,
      status: 'active',
      tasks: [],
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
      const result = await analyzeGoal(newGoal.title, goalCategory || undefined);
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
        category: result.category,
        tasks: generatedTasks,
        aiGenerated: true,
      }));
      
      // Update the category to match AI suggestion
      setGoalCategory(result.category);
      
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
    const finalGoal: Omit<Goal, 'id'> = {
      title: newGoal.title || 'Untitled Goal',
      description: newGoal.description || '',
      category: goalCategory || undefined,
      progress: 0,
      status: 'active',
      startDate: new Date().toISOString(),
      tasks: newGoal.tasks?.filter(task => task.title.trim() !== '') || [],
      aiGenerated: needsAiHelp || false,
    };
    
    addGoal(finalGoal);
    console.log("Saving new goal:", finalGoal);
    
    // Reset creation flow
    toggleGoalCreation();
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
              
              {goal.description && (
                <p className="text-gray-600 mb-3">{goal.description}</p>
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
              
              <div className="flex justify-between items-center mt-4">
                {goal.category && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {goal.category}
                  </span>
                )}
                
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Edit Goal</h2>
            
            <div className="space-y-4">
              {/* 标题输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                  placeholder="Enter goal title"
                  title="Goal title"
                  aria-label="Goal title"
                />
              </div>
              
              {/* 描述输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingGoal.description || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                  placeholder="Enter goal description"
                  title="Goal description"
                  aria-label="Goal description"
                />
              </div>
              
              {/* 分类输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingGoal.category || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, category: e.target.value })}
                  placeholder="e.g. Health, Career, Personal"
                />
              </div>
              
              {/* 同步提示 */}
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 border border-blue-100">
                <div className="flex items-center">
                  <Info size={16} className="mr-2 flex-shrink-0" />
                  <p>任务会自动同步到 All Tasks。编辑或添加任务后，点击保存按钮更新。</p>
                </div>
              </div>
              
              {/* 任务列表编辑 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasks
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-2">
                  {editingGoal.tasks && editingGoal.tasks.length > 0 ? (
                    editingGoal.tasks.map((task, index) => (
                      <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => {
                            const updatedTasks = [...editingGoal.tasks!];
                            updatedTasks[index] = { ...task, completed: e.target.checked };
                            setEditingGoal({ ...editingGoal, tasks: updatedTasks });
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`Mark task "${task.title || 'Untitled task'}" as ${task.completed ? 'incomplete' : 'complete'}`}
                          title={`Mark task as ${task.completed ? 'incomplete' : 'complete'}`}
                        />
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => {
                            const updatedTasks = [...editingGoal.tasks!];
                            updatedTasks[index] = { ...task, title: e.target.value };
                            setEditingGoal({ ...editingGoal, tasks: updatedTasks });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded-md text-sm"
                          placeholder="Enter task title"
                          aria-label="Task title"
                        />
                        <button
                          onClick={() => {
                            const updatedTasks = [...editingGoal.tasks!];
                            updatedTasks.splice(index, 1);
                            setEditingGoal({ ...editingGoal, tasks: updatedTasks });
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
                    <p className="text-gray-500 text-sm text-center py-2">No tasks yet</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    const newTask: GoalTask = {
                      id: `task-${Date.now()}`,
                      title: '',
                      completed: false
                    };
                    setEditingGoal({
                      ...editingGoal,
                      tasks: [...(editingGoal.tasks || []), newTask]
                    });
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Plus size={14} className="mr-1" /> Add Task
                </button>
              </div>
            </div>
            
            {/* 模态框按钮 */}
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
                  // 过滤掉空任务
                  const filteredTasks = editingGoal.tasks?.filter(t => t.title.trim() !== '') || [];
                  
                  // 计算新的进度
                  let newProgress = editingGoal.progress;
                  if (filteredTasks.length > 0) {
                    const completedCount = filteredTasks.filter(t => t.completed).length;
                    newProgress = completedCount / filteredTasks.length;
                  }
                  
                  // 更新目标
                  updateGoal(editingGoal.id, {
                    ...editingGoal,
                    tasks: filteredTasks,
                    progress: newProgress
                  });
                  
                  // 记录日志
                  console.log('更新目标:', editingGoal.title, '任务数:', filteredTasks.length);
                  
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