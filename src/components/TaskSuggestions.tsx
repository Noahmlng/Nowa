'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/store';

interface TaskSuggestionsProps {
  taskId: string;
  onClose: () => void;
}

// Match the Subtask interface from the store
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

// New interface for timeline phases
interface TimelinePhase {
  phase: string;
  duration: string;
  description: string;
}

/**
 * TaskSuggestions Component
 * 
 * Displays AI-generated task suggestions when the AI button is clicked.
 * Allows users to select a suggestion and see a detailed plan.
 */
export default function TaskSuggestions({ taskId, onClose }: TaskSuggestionsProps) {
  const { tasks, userProfile, goals, updateTask, addTaskFeedback } = useAppStore();
  
  // Find the target task
  const task = tasks.find(t => t.id === taskId);
  
  // States
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [detailedPlan, setDetailedPlan] = useState<{
    title: string;
    description: string;
    subtasks: Subtask[];
    timeline?: TimelinePhase[];
  } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [isRequestingPlan, setIsRequestingPlan] = useState(false);
  
  // 获取活跃的目标列表
  const activeGoals = useMemo(() => {
    return goals.filter(goal => goal.status === 'active');
  }, [goals]);
  
  // 从活跃目标中提取标题作为隐性需求
  const implicitNeeds = useMemo(() => {
    return activeGoals.map(goal => goal.title);
  }, [activeGoals]);
  
  // Load suggestions when component mounts
  useEffect(() => {
    if (!task) {
      setLoading(false);
      return;
    }
    
    // Find the most recent feedback if available (mimic what's in the example)
    // In a real implementation, you'd query for actual recent feedback
    let recentFeedback: string | undefined;
    if (task.title.toLowerCase().includes('exercise') || 
        task.title.toLowerCase().includes('workout') || 
        task.title.toLowerCase().includes('run') || 
        task.title.toLowerCase().includes('training')) {
      recentFeedback = "In the last workout, there was right leg hip joint pain and tight right thigh muscles.";
      console.log('[TaskSuggestions] 使用模拟反馈:', recentFeedback);
    } else if (task.feedback && task.feedback.length > 0) {
      // 使用任务的实际反馈（如果有）
      const latestFeedback = task.feedback[task.feedback.length - 1];
      recentFeedback = latestFeedback.text;
      console.log('[TaskSuggestions] 使用实际任务反馈:', recentFeedback);
    } else {
      console.log('[TaskSuggestions] 任务没有反馈数据');
    }
    
    // 标记组件是否已卸载，防止在组件卸载后设置状态
    let isMounted = true;
    
    // 添加一个加载标志，防止重复请求
    let isLoading = false;
    
    const loadSuggestions = async () => {
      // 如果已经在加载中或组件已卸载，直接返回
      if (isLoading || !isMounted) {
        return;
      }
      
      // 设置加载标志
      isLoading = true;
      
      try {
        // 获取用户上下文历史
        const relevantContext = userProfile.userContextHistory || '';
        
        console.log('开始加载任务建议: ', {
          taskTitle: task.title,
          userProfile: userProfile,
          implicitNeeds: implicitNeeds,
          recentFeedback,
          contextHistoryLength: relevantContext.length
        });
        
        // 提取用户所有的活跃目标作为隐性需求
        const activeGoals = goals
          .filter(g => g.status === 'active')
          .map(g => g.title);
        
        // 记录将要发送到API的所有参数
        console.log('[TaskSuggestions] 发送到API的参数:', {
          taskTitle: task.title,
          userProfile,
          implicitNeeds: activeGoals,
          recentFeedback,
          hasUserContextHistory: !!relevantContext,
          userContextHistoryLength: relevantContext.length
        });
        
        // 调用建议API
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskTitle: task.title,
            userProfile,
            implicitNeeds: activeGoals,
            recentFeedback,
            userContextHistory: relevantContext
          }),
        });
        
        console.log('API响应状态: ', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API响应错误详情: ', errorText);
          throw new Error(`加载建议失败: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('获取到的建议: ', data);
        
        // 只在组件仍然挂载时设置状态
        if (isMounted) {
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error('加载建议时出错:', error);
        // 使用回退建议，同样只在组件仍然挂载时设置状态
        if (isMounted) {
          setSuggestions([
            'Recovery-focused training to address your hip discomfort',
            'Combined cardio and strength workout targeting core muscles',
            'Gradual endurance building with low-impact exercises'
          ]);
        }
      } finally {
        // 只在组件仍然挂载时设置状态
        if (isMounted) {
          setLoading(false);
        }
        // 重置加载标志
        isLoading = false;
      }
    };
    
    loadSuggestions();
    
    // 清理函数，在组件卸载时执行
    return () => {
      isMounted = false;
    };
  }, [task, userProfile, implicitNeeds]); // 添加implicitNeeds作为依赖项
  
  // Handle selecting a suggestion
  const handleSelectSuggestion = async (suggestion: string) => {
    // 如果已经在请求计划，则忽略后续点击
    if (isRequestingPlan) return;
    
    setSelectedSuggestion(suggestion);
    setLoadingPlan(true);
    setIsRequestingPlan(true);
    
    try {
      if (!task) {
        setLoadingPlan(false);
        setIsRequestingPlan(false);
        return;
      }
      
      // Find the most recent feedback if available (same as above)
      let recentFeedback: string | undefined;
      if (task.title.toLowerCase().includes('exercise') || 
          task.title.toLowerCase().includes('workout') || 
          task.title.toLowerCase().includes('run') || 
          task.title.toLowerCase().includes('training')) {
        recentFeedback = "In the last workout, there was right leg hip joint pain and tight right thigh muscles.";
      }
      
      // 获取用户上下文历史
      const relevantContext = userProfile.userContextHistory || '';
      
      console.log('开始加载详细计划: ', {
        taskTitle: task.title,
        selectedSuggestion: suggestion,
        implicitNeeds: implicitNeeds, // 同样传递活跃目标作为隐性需求
        contextHistoryLength: relevantContext.length // 记录上下文长度但不打印全部内容
      });
      
      // Call the API route
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          selectedSuggestion: suggestion,
          userProfile,
          implicitNeeds, // 添加从活跃目标获取的隐性需求
          recentFeedback,
          userContextHistory: relevantContext // 传递用户上下文历史
        })
      });
      
      console.log('计划API响应状态: ', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('计划API响应错误详情: ', errorText);
        throw new Error(`加载详细计划失败: ${response.status} ${response.statusText}`);
      }
      
      const plan = await response.json();
      console.log('获取到的计划: ', plan);
      setDetailedPlan(plan);
    } catch (error) {
      console.error('加载详细计划时出错:', error);
      
      // Create fallback subtasks with proper IDs
      const fallbackSubtasks: Subtask[] = [
        { 
          id: `subtask-${Date.now()}-1`, 
          title: '热身 5 分钟', 
          completed: false 
        },
        { 
          id: `subtask-${Date.now()}-2`, 
          title: '完成主要活动（20 分钟）', 
          completed: false 
        },
        { 
          id: `subtask-${Date.now()}-3`, 
          title: '放松和拉伸（5 分钟）', 
          completed: false 
        }
      ];
      
      setDetailedPlan({
        title: task?.title || '运动计划',
        description: suggestion,
        subtasks: fallbackSubtasks
      });
    } finally {
      setLoadingPlan(false);
      setIsRequestingPlan(false);
    }
  };
  
  // 解析 Markdown 格式的计划内容
  const parseMarkdownPlan = (markdownContent: string, taskTitle: string, suggestion: string): {
    title: string;
    description: string;
    subtasks: Subtask[];
    timeline?: TimelinePhase[];
  } => {
    try {
      // 默认值
      let title = taskTitle;
      let description = markdownContent;
      const subtasks: Subtask[] = [];
      const timeline: TimelinePhase[] = [];
      
      // 尝试提取标题（通常是第一个 # 标题）
      const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }
      
      // 尝试提取步骤作为子任务
      const stepsSection = markdownContent.match(/##\s+Steps|##\s+步骤\s*\n([\s\S]*?)(?=##|$)/i);
      if (stepsSection && stepsSection[1]) {
        const steps = stepsSection[1].match(/\d+\.\s+(.+)$/gm);
        if (steps) {
          steps.forEach((step, index) => {
            const stepText = step.replace(/^\d+\.\s+/, '').trim();
            if (stepText) {
              subtasks.push({
                id: `subtask-${Date.now()}-${index}`,
                title: stepText,
                completed: false
              });
            }
          });
        }
      }
      
      // 如果没有找到子任务，尝试查找列表项
      if (subtasks.length === 0) {
        const listItems = markdownContent.match(/[-*]\s+(.+)$/gm);
        if (listItems) {
          listItems.forEach((item, index) => {
            const itemText = item.replace(/^[-*]\s+/, '').trim();
            if (itemText) {
              subtasks.push({
                id: `subtask-${Date.now()}-${index}`,
                title: itemText,
                completed: false
              });
            }
          });
        }
      }
      
      // 如果仍然没有子任务，创建一些默认的中文子任务
      if (subtasks.length === 0) {
        subtasks.push(
          { 
            id: `subtask-${Date.now()}-1`, 
            title: '开始任务', 
            completed: false 
          },
          { 
            id: `subtask-${Date.now()}-2`, 
            title: '完成主要活动', 
            completed: false 
          },
          { 
            id: `subtask-${Date.now()}-3`, 
            title: '回顾与总结', 
            completed: false 
          }
        );
      }
      
      // 尝试提取时间线信息
      const timelineSection = markdownContent.match(/##\s+Timeline|##\s+时间线|##\s+执行时间线\s*\n([\s\S]*?)(?=##|$)/i);
      if (timelineSection && timelineSection[1]) {
        // 尝试匹配时间线项目，格式可能是：阶段名称（持续时间）：描述
        const timelineItems = timelineSection[1].match(/\d+\.\s+(.+?)（(.+?)）[：:]\s*(.+)$/gm);
        if (timelineItems) {
          timelineItems.forEach((item, index) => {
            const match = item.match(/\d+\.\s+(.+?)（(.+?)）[：:]\s*(.+)$/);
            if (match && match.length >= 4) {
              timeline.push({
                phase: match[1].trim(),
                duration: match[2].trim(),
                description: match[3].trim()
              });
            }
          });
        }
      }
      
      return {
        title,
        description,
        subtasks,
        timeline: timeline.length > 0 ? timeline : undefined
      };
    } catch (error) {
      console.error('Error parsing markdown plan:', error);
      return {
        title: taskTitle,
        description: markdownContent || suggestion,
        subtasks: [
          { 
            id: `subtask-${Date.now()}-1`, 
            title: '开始任务', 
            completed: false 
          },
          { 
            id: `subtask-${Date.now()}-2`, 
            title: '完成主要活动', 
            completed: false 
          },
          { 
            id: `subtask-${Date.now()}-3`, 
            title: '回顾与总结', 
            completed: false 
          }
        ]
      };
    }
  };
  
  // Handle applying the selected plan
  const handleApplyPlan = () => {
    if (!task || !detailedPlan) return;
    
    // Update the task with subtasks, description, and timeline
    updateTask(task.id, {
      description: task.description 
        ? `${task.description}\n\n${detailedPlan.description}`
        : detailedPlan.description,
      subtasks: [
        ...(task.subtasks || []),
        ...(detailedPlan.subtasks || [])
      ],
      timeline: detailedPlan.timeline
    });
    
    // Add feedback record
    addTaskFeedback(task.id, `Applied AI-suggested plan: ${selectedSuggestion}`);
    
    // Add to user context history
    if (userProfile.userContextHistory !== undefined) {
      const contextUpdate = `[Task Plan] Applied plan for task "${task.title}" with suggestion "${selectedSuggestion}"`;
      // Assuming there's a function to add to context history in the store
      // This will depend on your actual implementation
      if (typeof addToUserContextHistory === 'function') {
        addToUserContextHistory(contextUpdate);
      }
    }
    
    // Close the suggestions panel
    onClose();
  };
  
  // Handle declining the plan
  const handleDecline = () => {
    onClose();
  };
  
  // If task doesn't exist, don't show anything
  if (!task) return null;
  
  return (
    <>
      {/* Suggestions Bubbles */}
      {!selectedSuggestion && (
        <div className="absolute right-8 top-0 bg-white shadow-lg rounded-lg p-4 max-w-xs w-64 z-50 animate-fadeIn">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">AI 建议</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              title="关闭"
              aria-label="关闭"
            >
              <X size={16} />
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 border border-gray-200 transition-colors"
                >
                  {suggestion}
                  <ChevronRight className="inline-block ml-2 h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Detailed Plan Panel */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/30" 
            onClick={handleDecline}
          />
          
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">任务计划</h2>
                  <button 
                    onClick={handleDecline}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    title="关闭"
                    aria-label="关闭"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">基于: {selectedSuggestion}</p>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingPlan ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : detailedPlan ? (
                  <div className="space-y-6">
                    {/* Plan Title */}
                    <div>
                      <h3 className="text-xl font-medium text-gray-800">{detailedPlan.title}</h3>
                    </div>
                    
                    {/* Description */}
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700">
                        {detailedPlan.description}
                      </div>
                    </div>
                    
                    {/* Timeline Section */}
                    {detailedPlan.timeline && Array.isArray(detailedPlan.timeline) && detailedPlan.timeline.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                          <Clock size={18} className="mr-2 text-blue-500" />
                          执行时间线
                        </h4>
                        <div className="space-y-3">
                          {detailedPlan.timeline.map((phase, index) => (
                            <div 
                              key={index} 
                              className="relative pl-8 pb-4 border-l-2 border-blue-200 last:border-l-0 last:pb-0"
                            >
                              <div className="absolute left-[-8px] top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                              <div className="bg-blue-50 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-1">
                                  <h5 className="font-medium text-blue-700">{phase.phase}</h5>
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    {phase.duration}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">{phase.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Subtasks */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-3">子任务</h4>
                      <div className="space-y-2">
                        {detailedPlan.subtasks && Array.isArray(detailedPlan.subtasks) && detailedPlan.subtasks.map((subtask, index) => (
                          <div 
                            key={subtask.id} 
                            className="flex items-start p-2 rounded-md hover:bg-gray-50"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm text-gray-700">{subtask.title}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-500">无法加载计划详情</p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleDecline}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleApplyPlan}
                    disabled={!detailedPlan || loadingPlan}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
                  >
                    <Check size={16} className="mr-1" />
                    应用计划
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 