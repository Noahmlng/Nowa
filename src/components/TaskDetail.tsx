'use client';

import { useState, useEffect, useRef } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { 
  X, Calendar, Flag, MessageSquare, CheckCircle, Circle, 
  Star, Sun, ChevronDown, Plus, Trash2, Mic, Send, ListChecks,
  Clock, Check, ChevronRight, Target
} from 'lucide-react';
import { useAppStore } from '@/store/store';

/**
 * Task interface - Represents a task in the application
 * This should match the Task interface in the store
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
  feedback?: {text: string; timestamp: string}[]; // Updated feedback structure with timestamps
  subtasks?: Subtask[];
}

/**
 * Subtask interface for sub-tasks in a task
 */
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Props for the TaskDetail component
 */
interface TaskDetailProps {
  task: Task;                  // The task to display and edit
  isOpen: boolean;             // Whether the detail view is open
  onClose: () => void;         // Function to call when closing the detail view
  onUpdate: (task: Task) => void; // Function to call when updating the task
}

// 添加声音效果 - 移到组件外部
const useCompletionSound = () => {
  const [audio] = useState(() => typeof window !== 'undefined' ? new Audio('/complete-sound.mp3') : null);
  
  const playCompletionSound = () => {
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log('Error playing sound:', e));
    }
  };
  
  return playCompletionSound;
};

/**
 * TaskDetail Component
 * 
 * Provides a detailed view and editing interface for a single task.
 * Slides in from the right side of the screen.
 * Allows editing task properties including title, description, due date,
 * priority, and associated goal. Also provides feedback functionality.
 */
export default function TaskDetail({ task, isOpen, onClose, onUpdate }: TaskDetailProps) {
  const { addTaskFeedback, goals } = useAppStore();
  const playCompletionSound = useCompletionSound();
  
  // Local state
  const [editedTask, setEditedTask] = useState<Task>({ ...task, subtasks: task.subtasks || [], goalId: task.goalId }); // Copy of task for editing
  const [isEditingTitle, setIsEditingTitle] = useState(false); // Controls title editing mode
  const [feedback, setFeedback] = useState(''); // New feedback text
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false); // Controls date picker visibility
  const [isPriorityOpen, setIsPriorityOpen] = useState(false); // Controls priority dropdown visibility
  const [isGoalSelectorOpen, setIsGoalSelectorOpen] = useState(false); // Controls goal selector visibility
  const [newSubtask, setNewSubtask] = useState(''); // New subtask input
  const [focusOnNextSubtask, setFocusOnNextSubtask] = useState(false); // Flag to focus on subtask input
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null); // For task completion animation
  const [completingSubtaskId, setCompletingSubtaskId] = useState<string | null>(null); // For subtask completion animation
  const titleInputRef = useRef<HTMLInputElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const detailContainerRef = useRef<HTMLDivElement>(null);

  // Update local state when task changes
  useEffect(() => {
    // 确保复制所有任务属性，包括 goalId
    setEditedTask({ 
      ...task, 
      subtasks: task.subtasks || [],
      goalId: task.goalId // 明确设置 goalId，即使它可能是 undefined
    });
  }, [task]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isDatePickerOpen || isPriorityOpen || isGoalSelectorOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.date-picker') && !target.closest('.priority-dropdown') && !target.closest('.goal-selector')) {
          setIsDatePickerOpen(false);
          setIsPriorityOpen(false);
          setIsGoalSelectorOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen, isPriorityOpen, isGoalSelectorOpen]);
  
  // 添加点击外部区域关闭详情页的功能
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (detailContainerRef.current && !detailContainerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Focus title input when editing mode is activated
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);
  
  // Focus subtask input when flag is set
  useEffect(() => {
    if (focusOnNextSubtask && subtaskInputRef.current) {
      subtaskInputRef.current.focus();
      setFocusOnNextSubtask(false);
    }
  }, [focusOnNextSubtask]);

  // Don't render if not open
  if (!isOpen) return null;

  /**
   * Handle changes to input fields
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handle priority change
   */
  const handlePriorityChange = (priority: 'low' | 'medium' | 'high') => {
    setEditedTask(prev => ({
      ...prev,
      priority
    }));
    setIsPriorityOpen(false);
    
    // Auto-save when changing priority
    onUpdate({
      ...editedTask,
      priority
    });
  };

  /**
   * Handle toggling important status
   */
  const handleToggleImportant = () => {
    setEditedTask(prev => ({
      ...prev,
      important: !prev.important
    }));
    // Auto-save when toggling importance
    onUpdate({
      ...editedTask,
      important: !editedTask.important
    });
  };

  /**
   * Handle date change
   */
  const handleDateChange = (date: string) => {
    setEditedTask(prev => ({
      ...prev,
      dueDate: date
    }));
    setIsDatePickerOpen(false);
    // Auto-save when setting date
    onUpdate({
      ...editedTask,
      dueDate: date
    });
  };

  /**
   * Handle submitting feedback
   */
  const handleSubmitFeedback = () => {
    if (feedback.trim()) {
      const now = new Date().toISOString();
      const newFeedback = { 
        text: feedback.trim(), 
        timestamp: now 
      };
      
      // Update local state
      const updatedFeedback = editedTask.feedback 
        ? [...editedTask.feedback, newFeedback] 
        : [newFeedback];
      
      const updatedTask = {
        ...editedTask,
        feedback: updatedFeedback
      };
      
      setEditedTask(updatedTask);
      setFeedback('');
      
      // Update global state
      addTaskFeedback(task.id, JSON.stringify(newFeedback));
      
      // Auto-save when adding feedback
      onUpdate(updatedTask);
    }
  };

  /**
   * Handle adding task to today's list
   */
  const handleAddToToday = () => {
    // Set the task's due date to today and update the taskListId
    const today = new Date().toISOString().split('T')[0];
    const updatedTask = {
      ...editedTask,
      taskListId: 'today',
      dueDate: today
    };
    setEditedTask(updatedTask);
    // Auto-save when adding to today
    onUpdate(updatedTask);
  };

  /**
   * Handle toggling completion status
   */
  const handleToggleComplete = () => {
    const newStatus = editedTask.status === 'completed' ? 'pending' as const : 'completed' as const;
    
    // 如果是标记为完成，添加动画效果
    if (newStatus === 'completed') {
      setCompletingTaskId(editedTask.id);
      // 播放完成音效
      playCompletionSound();
      
      // 延迟切换状态，让动画有时间显示
      setTimeout(() => {
        const updatedTask = {
          ...editedTask,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
        };
        setEditedTask(updatedTask);
        // Auto-save when toggling completion
        onUpdate(updatedTask);
        
        // 动画结束后重置状态
        setTimeout(() => {
          setCompletingTaskId(null);
        }, 500);
      }, 300);
    } else {
      // 如果是取消完成，直接切换
      const updatedTask = {
        ...editedTask,
        status: newStatus,
        completedAt: undefined
      };
      setEditedTask(updatedTask);
      // Auto-save when toggling completion
      onUpdate(updatedTask);
    }
  };

  /**
   * Handle adding a subtask
   */
  const handleAddSubtask = (e?: React.MouseEvent | React.KeyboardEvent | React.FormEvent) => {
    // 如果提供了事件对象，阻止默认行为和事件冒泡
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (newSubtask.trim()) {
      try {
        // 创建更新后的子任务数组
        const updatedSubtasks = [
          ...(editedTask.subtasks || []),
          {
            id: `subtask-${Date.now()}`,
            title: newSubtask.trim(),
            completed: false
          }
        ];
        
        // 创建更新后的任务对象
        const updatedTask = {
          ...editedTask,
          subtasks: updatedSubtasks
        };
        
        // 更新本地状态
        setEditedTask(updatedTask);
        setNewSubtask('');
        setFocusOnNextSubtask(true); // Focus back on input for next subtask
        
        // 更新全局状态 - 使用更新后的任务对象
        onUpdate(updatedTask);
        
        // 防止发生任何可能导致详情页关闭的状态更新冲突
        setTimeout(() => {
          if (subtaskInputRef.current) {
            subtaskInputRef.current.focus();
          }
        }, 0);
      } catch (error) {
        console.error("Error adding subtask:", error);
      }
    }
  };

  /**
   * Handle toggling a subtask's completion status
   */
  const handleToggleSubtask = (subtaskId: string) => {
    const subtask = editedTask.subtasks?.find(s => s.id === subtaskId);
    if (!subtask) return;
    
    // 如果是标记为完成，添加动画效果
    if (!subtask.completed) {
      setCompletingSubtaskId(subtaskId);
      // 播放完成音效
      playCompletionSound();
      
      // 延迟切换状态，让动画有时间显示
      setTimeout(() => {
        const updatedSubtasks = editedTask.subtasks?.map(s => 
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        );
        
        const updatedTask = {
          ...editedTask,
          subtasks: updatedSubtasks
        };
        
        setEditedTask(updatedTask);
        // Auto-save when toggling subtask - 使用更新后的任务对象
        onUpdate(updatedTask);
        
        // 动画结束后重置状态
        setTimeout(() => {
          setCompletingSubtaskId(null);
        }, 500);
      }, 300);
    } else {
      // 如果是取消完成，直接切换
      const updatedSubtasks = editedTask.subtasks?.map(s => 
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      );
      
      const updatedTask = {
        ...editedTask,
        subtasks: updatedSubtasks
      };
      
      setEditedTask(updatedTask);
      // Auto-save when toggling subtask - 使用更新后的任务对象
      onUpdate(updatedTask);
    }
  };

  /**
   * Handle deleting a subtask
   */
  const handleDeleteSubtask = (subtaskId: string) => {
    try {
      console.log("Deleting subtask:", subtaskId);
      
      // 确保 subtasks 存在
      if (!editedTask.subtasks || editedTask.subtasks.length === 0) {
        console.error("No subtasks array found or empty subtasks array");
        return;
      }
      
      console.log("Current subtasks:", editedTask.subtasks);
      
      // 过滤掉要删除的子任务
      const updatedSubtasks = editedTask.subtasks.filter(subtask => subtask.id !== subtaskId);
      console.log("Updated subtasks:", updatedSubtasks);
      
      // 创建更新后的任务对象
      const updatedTask = {
        ...editedTask,
        subtasks: updatedSubtasks
      };
      
      // 更新本地状态
      setEditedTask(updatedTask);
      
      // 更新全局状态
      onUpdate(updatedTask);
    } catch (error) {
      console.error("Error deleting subtask:", error);
    }
  };

  /**
   * Handle title change
   */
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTask(prev => ({
      ...prev,
      title: e.target.value
    }));
  };

  /**
   * Save task title
   */
  const handleTitleSave = () => {
    if (editedTask.title.trim()) {
      // 确保使用完整的任务对象进行更新
      onUpdate(editedTask);
      setIsEditingTitle(false);
    }
  };

  /**
   * Get formatted date to use with the calendar
   */
  const getTodayDate = () => {
    return new Date().toISOString();
  };

  /**
   * Get tomorrow's date
   */
  const getTomorrowDate = () => {
    return addDays(new Date(), 1).toISOString();
  };

  /**
   * Get next week's date
   */
  const getNextWeekDate = () => {
    return addDays(new Date(), 7).toISOString();
  };

  /**
   * Get priority display information
   */
  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'high':
        return { label: '高优先级', color: 'text-red-600' };
      case 'medium':
        return { label: '中等优先级', color: 'text-orange-500' };
      case 'low':
        return { label: '低优先级', color: 'text-blue-500' };
      default:
        return { label: '优先级', color: 'text-gray-500' };
    }
  };

  const priorityInfo = getPriorityInfo(editedTask.priority);

  /**
   * Handle goal selection
   */
  const handleGoalChange = (goalId: string | undefined) => {
    try {
      console.log("Changing goal association to:", goalId);
      
      // 创建更新后的任务对象，确保包含所有必要属性
      const updatedTask = {
        ...editedTask,
        goalId // 明确设置 goalId，可以是 undefined
      };
      
      // 更新本地状态
      setEditedTask(updatedTask);
      setIsGoalSelectorOpen(false);
      
      console.log("Updated task with new goal:", updatedTask);
      
      // 更新全局状态 - 使用更新后的任务对象
      onUpdate(updatedTask);
    } catch (error) {
      console.error("Error changing goal association:", error);
    }
  };

  /**
   * Get associated goal name
   */
  const getAssociatedGoalName = () => {
    if (!editedTask.goalId) return null;
    const goal = goals.find(g => g.id === editedTask.goalId);
    return goal ? goal.title : null;
  };

  return (
    <div className="fixed top-0 right-0 bottom-0 z-40 w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out border-l border-gray-200"
      style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      ref={detailContainerRef}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center">
          <button 
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors mr-2"
            onClick={onClose}
          >
            <X size={20} className="text-gray-500" />
          </button>
          <h2 className="text-lg font-medium text-gray-900">任务详情</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Main content area with padding */}
          <div className="p-4">
            {/* Task completion toggle and title */}
            <div className="flex items-start mb-5">
              <button
                className="flex-shrink-0 mt-1 mr-3"
                onClick={handleToggleComplete}
              >
                {editedTask.status === 'completed' ? (
                  <CheckCircle size={22} className="text-blue-500" />
                ) : (
                  <Circle size={22} className="text-gray-400 hover:text-blue-500" />
                )}
              </button>
              
              <div className="flex-1 relative">
                {/* 完成动画效果 - 划线 */}
                {(editedTask.status === 'completed' || completingTaskId === editedTask.id) && (
                  <div 
                    className="absolute h-[1px] bg-gray-400 left-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-in-out"
                    style={{ 
                      width: completingTaskId === editedTask.id ? '100%' : (editedTask.status === 'completed' ? '100%' : '0%'),
                      opacity: completingTaskId === editedTask.id ? 1 : (editedTask.status === 'completed' ? 1 : 0)
                    }}
                  />
                )}
                
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    className="w-full text-xl font-medium border-b border-blue-500 focus:outline-none py-1 px-0 text-gray-800"
                    value={editedTask.title}
                    onChange={handleTitleChange}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault(); // 阻止默认行为，防止表单提交
                        handleTitleSave();
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div>
                    <h1 
                      className={`text-xl font-medium ${editedTask.status === 'completed' ? 'text-gray-500' : 'text-gray-900'} hover:bg-gray-100 py-1 px-2 rounded cursor-text`}
                      onClick={() => setIsEditingTitle(true)}
                    >
                      {editedTask.title}
                    </h1>
                    {/* 显示关联的目标名称 */}
                    {getAssociatedGoalName() && (
                      <div className="flex items-center text-sm text-gray-500 mt-1 ml-2">
                        <Target size={14} className="mr-1" />
                        <span>{getAssociatedGoalName()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ml-2 ${editedTask.important ? 'text-red-500' : 'text-gray-400'}`}
                onClick={handleToggleImportant}
                title={editedTask.important ? "取消重要标记" : "标记为重要"}
              >
                <Star 
                  size={20} 
                  className={editedTask.important ? "fill-red-500" : ""} 
                />
              </button>
            </div>
            
            {/* Quick actions */}
            <div className="space-y-2 mb-6 border-b border-gray-100 pb-6">
              {/* Add to My Day */}
              {editedTask.taskListId !== 'today' && (
                <button
                  className="flex items-center w-full p-2.5 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                  onClick={handleAddToToday}
                >
                  <Sun size={18} className="text-blue-500 mr-3" />
                  <span>添加到"我的一天"</span>
                </button>
              )}
              
              {/* Due date */}
              <div className="relative">
                <button
                  className="flex items-center justify-between w-full p-2.5 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                >
                  <div className="flex items-center">
                    <Calendar size={18} className="text-blue-500 mr-3" />
                    <span>
                      {editedTask.dueDate 
                        ? `截止日期: ${format(parseISO(editedTask.dueDate), 'yyyy年MM月dd日')}`
                        : '添加截止日期'}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                
                {/* Date picker dropdown */}
                {isDatePickerOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 date-picker">
                    <div className="p-2 space-y-1">
                      <button
                        className="flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                        onClick={() => handleDateChange(getTodayDate())}
                      >
                        <span>今天</span>
                      </button>
                      <button
                        className="flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                        onClick={() => handleDateChange(getTomorrowDate())}
                      >
                        <span>明天</span>
                      </button>
                      <button
                        className="flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                        onClick={() => handleDateChange(getNextWeekDate())}
                      >
                        <span>下周</span>
                      </button>
                      {editedTask.dueDate && (
                        <button
                          className="flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors text-red-500"
                          onClick={() => handleDateChange('')}
                        >
                          <span>清除日期</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Priority section hidden temporarily as requested */}
              {false && (
                <div className="relative">
                  <button
                    className="flex items-center justify-between w-full p-2.5 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                  >
                    <div className="flex items-center">
                      <Flag size={18} className={`${priorityInfo.color} mr-3`} />
                      <span>{priorityInfo.label}</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  
                  {/* Priority dropdown */}
                  {isPriorityOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 priority-dropdown">
                      <div className="p-2 space-y-1">
                        <button
                          className="flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                          onClick={() => handlePriorityChange('high')}
                        >
                          <Flag size={16} className="text-red-600 mr-2" />
                          <span>高优先级</span>
                        </button>
                        <button
                          className="flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                          onClick={() => handlePriorityChange('medium')}
                        >
                          <Flag size={16} className="text-orange-500 mr-2" />
                          <span>中等优先级</span>
                        </button>
                        <button
                          className="flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                          onClick={() => handlePriorityChange('low')}
                        >
                          <Flag size={16} className="text-blue-500 mr-2" />
                          <span>低优先级</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Goal selector - 新增 */}
              <div className="relative">
                <button
                  className="flex items-center justify-between w-full p-2.5 text-sm text-left hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setIsGoalSelectorOpen(!isGoalSelectorOpen)}
                >
                  <div className="flex items-center">
                    <Target size={18} className="text-purple-500 mr-3" />
                    <span>
                      {getAssociatedGoalName() 
                        ? `关联目标: ${getAssociatedGoalName()}`
                        : '关联到目标'}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                
                {/* Goal selector dropdown */}
                {isGoalSelectorOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 goal-selector max-h-60 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {goals.length > 0 ? (
                        <>
                          {goals.map(goal => (
                            <button
                              key={goal.id}
                              className={`flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors ${editedTask.goalId === goal.id ? 'bg-purple-50' : ''}`}
                              onClick={() => handleGoalChange(goal.id)}
                            >
                              <Target size={16} className="text-purple-500 mr-2" />
                              <span>{goal.title}</span>
                              {editedTask.goalId === goal.id && (
                                <Check size={16} className="ml-auto text-purple-500" />
                              )}
                            </button>
                          ))}
                          {editedTask.goalId && (
                            <button
                              className="flex items-center w-full p-2 text-sm text-left hover:bg-gray-50 rounded-md transition-colors text-red-500"
                              onClick={() => handleGoalChange(undefined)}
                            >
                              <span>取消关联</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="p-2 text-sm text-gray-500">
                          暂无可用目标，请先创建目标
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Subtasks section */}
            <div className="border-b border-gray-100 pb-6 mb-6">
              {/* Subtasks list */}
              <ul className="space-y-2 mb-3">
                {editedTask.subtasks?.map(subtask => (
                  <li key={subtask.id} className="flex items-center group relative">
                    <button
                      className="flex-shrink-0 mr-2"
                      onClick={() => handleToggleSubtask(subtask.id)}
                    >
                      {subtask.completed ? (
                        <CheckCircle size={18} className="text-blue-500" />
                      ) : (
                        <Circle size={18} className="text-gray-400 hover:text-blue-500" />
                      )}
                    </button>
                    
                    {/* 完成动画效果 - 划线 */}
                    {(subtask.completed || completingSubtaskId === subtask.id) && (
                      <div 
                        className="absolute h-[1px] bg-gray-400 left-7 right-8 top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-in-out"
                        style={{ 
                          opacity: completingSubtaskId === subtask.id ? 1 : (subtask.completed ? 1 : 0)
                        }}
                      />
                    )}
                    
                    <span className={`flex-1 text-sm ${subtask.completed ? 'text-gray-500' : 'text-gray-700'}`}>
                      {subtask.title}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          handleDeleteSubtask(subtask.id);
                        } catch (error) {
                          console.error("Error in delete subtask button click:", error);
                        }
                      }}
                    >
                      <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </li>
                ))}
              </ul>
              
              {/* Add subtask input */}
              <div 
                className="flex items-center bg-gray-50 rounded-md p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Circle size={18} className="text-gray-300 mr-2" />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddSubtask(e);
                    return false;
                  }}
                  style={{ display: 'flex', flex: 1 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={subtaskInputRef}
                    type="text"
                    className="flex-1 bg-transparent border-none py-1 text-sm placeholder-gray-400 focus:outline-none"
                    placeholder="添加步骤"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddSubtask(e);
                        return false;
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {newSubtask.trim() && (
                    <button
                      type="button"
                      className="ml-2 p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                      onClick={(e) => handleAddSubtask(e)}
                    >
                      <Check size={16} />
                    </button>
                  )}
                </form>
              </div>
            </div>
            
            {/* Description */}
            <div className="mb-6 border-b border-gray-100 pb-6">
              <textarea
                name="description"
                rows={3}
                className="w-full resize-none focus:outline-none text-sm"
                placeholder="添加备注..."
                value={editedTask.description || ''}
                onChange={handleChange}
                onBlur={() => onUpdate(editedTask)}
              />
            </div>
            
            {/* Feedback section - Timeline style */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                <MessageSquare size={16} className="text-gray-500 mr-2" />
                任务反馈记录
              </h3>
              
              {/* Feedback timeline */}
              {editedTask.feedback && editedTask.feedback.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-gray-200 mb-4">
                  {/* Sort feedback by timestamp - newest first */}
                  {[...(editedTask.feedback || [])]
                    .sort((a, b) => {
                      if (!a.timestamp || !b.timestamp) return 0;
                      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                    })
                    .map((feedbackItem, index) => (
                      <div key={index} className="mb-4 relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[9px] mt-1.5 w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded-full"></div>
                        
                        {/* Feedback timestamp */}
                        <div className="text-xs text-gray-500 mb-1">
                          {feedbackItem.timestamp ? format(new Date(feedbackItem.timestamp), 'yyyy年MM月dd日 HH:mm') : ''}
                        </div>
                        
                        {/* Feedback content */}
                        <div className="bg-white border border-gray-200 p-3 rounded-md shadow-sm">
                          <p className="text-sm text-gray-700">{feedbackItem.text}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic mb-4">
                  暂无任务反馈
                </div>
              )}
              
              {/* Add feedback */}
              <div className="flex items-center bg-gray-50 rounded-lg p-1">
                <input
                  type="text"
                  className="flex-1 bg-transparent px-3 py-2 focus:outline-none text-sm"
                  placeholder="添加任务反馈..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault(); // 阻止默认行为，防止表单提交
                      handleSubmitFeedback();
                    }
                  }}
                />
                <button
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.trim()}
                >
                  <Send size={16} className={`${feedback.trim() ? 'text-blue-500' : 'text-gray-400'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with voice input */}
        <div className="p-4 border-t border-gray-200 flex justify-center">
          <button className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors shadow-md">
            <Mic size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
} 