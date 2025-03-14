'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useAppStore } from '@/store/store';
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus,
  AlertTriangle, 
  Clock,
  ChevronRight,
  List,
  CheckCircle,
  ChevronDown,
  Target,
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import TaskDetail from './TaskDetail';

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
 * Interfaces
 */
interface Goal {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  progress: number;
  status: 'active' | 'completed' | 'cancelled';
  taskIds: string[];
}

interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  status: 'pending' | 'completed';
}

/**
 * Subtask interface - Represents a subtask of a task
 */
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  important: boolean;
  goalId?: string;
  taskListId: string;
  feedback?: {text: string; timestamp: string}[];
  subtasks?: Subtask[];
  completedAt?: string;
}

interface GoalDetailProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * GoalDetail Component
 * 
 * Displays and allows editing of a goal's details, including its key results.
 */
export default function GoalDetail({ goal, isOpen, onClose }: GoalDetailProps) {
  // Access store state and actions
  const { 
    keyResults,
    tasks,
    updateGoal, 
    updateKeyResult,
    addKeyResult, 
    toggleKeyResultComplete,
    deleteKeyResult,
    addTask
  } = useAppStore();
  
  // 声音效果
  const playCompletionSound = useCompletionSound();
  
  // Filter key results for this goal
  const goalKeyResults = keyResults.filter(kr => kr.goalId === goal.id);
  
  // Find tasks associated with this goal
  const goalTasks = tasks.filter(task => task.goalId === goal.id);
  const completedTasks = goalTasks.filter(task => task.status === 'completed');
  
  // Local state
  const [editedTitle, setEditedTitle] = useState(goal.title);
  const [editedDescription, setEditedDescription] = useState(goal.description || '');
  const [editedDueDate, setEditedDueDate] = useState(goal.dueDate || '');
  const [editedStatus, setEditedStatus] = useState(goal.status);
  const [newKeyResultTitle, setNewKeyResultTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingKeyResultId, setEditingKeyResultId] = useState<string | null>(null);
  const [editingKeyResultTitle, setEditingKeyResultTitle] = useState('');
  const [showNewKeyResultInput, setShowNewKeyResultInput] = useState(false);
  const [completingKeyResultId, setCompletingKeyResultId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const keyResultInputRef = useRef<HTMLInputElement>(null);
  const newKeyResultInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Reset state when goal changes
  useEffect(() => {
    setEditedTitle(goal.title);
    setEditedDescription(goal.description || '');
    setEditedDueDate(goal.dueDate || '');
    setEditedStatus(goal.status);
    setNewKeyResultTitle('');
    setShowNewKeyResultInput(false);
  }, [goal]);
  
  // Focus input when editing key result
  useEffect(() => {
    if (editingKeyResultId && keyResultInputRef.current) {
      keyResultInputRef.current.focus();
    }
  }, [editingKeyResultId]);
  
  // Focus new key result input when shown
  useEffect(() => {
    if (showNewKeyResultInput && newKeyResultInputRef.current) {
      newKeyResultInputRef.current.focus();
    }
  }, [showNewKeyResultInput]);
  
  // Handle clicking outside the detail panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (detailContainerRef.current && !detailContainerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    // Bind the event listener
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      // Unbind the event listener on cleanup
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Save the goal title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
    // Save on change
    if (e.target.value.trim()) {
      updateGoal(goal.id, { title: e.target.value });
    }
  };
  
  // Save the goal description
  const handleSaveDescription = () => {
    updateGoal(goal.id, { description: editedDescription });
  };
  
  // Save the goal due date
  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedDueDate(e.target.value);
    updateGoal(goal.id, { dueDate: e.target.value });
  };
  
  // Toggle goal status
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as 'active' | 'completed' | 'cancelled';
    setEditedStatus(newStatus);
    updateGoal(goal.id, { status: newStatus });
  };
  
  // Handle adding a new key result
  const handleAddKeyResult = (e?: FormEvent) => {
    e?.preventDefault();
    if (newKeyResultTitle.trim()) {
      addKeyResult({
        goalId: goal.id,
        title: newKeyResultTitle.trim(),
        status: 'pending',
      });
      setNewKeyResultTitle('');
      // 保持输入框焦点，方便继续添加
      if (newKeyResultInputRef.current) {
        newKeyResultInputRef.current.focus();
      }
    } else {
      // 如果输入为空，隐藏输入框
      setShowNewKeyResultInput(false);
    }
  };
  
  // Start editing a key result
  const handleStartEditingKeyResult = (keyResult: KeyResult) => {
    setEditingKeyResultId(keyResult.id);
    setEditingKeyResultTitle(keyResult.title);
  };
  
  // Save the key result title
  const handleSaveKeyResultTitle = () => {
    if (editingKeyResultId && editingKeyResultTitle.trim()) {
      updateKeyResult(editingKeyResultId, { title: editingKeyResultTitle });
      setEditingKeyResultId(null);
    }
  };
  
  // Handle toggling key result completion with animation
  const handleToggleKeyResultComplete = (keyResultId: string, currentStatus: 'pending' | 'completed') => {
    // 如果是标记为完成，添加动画效果
    if (currentStatus === 'pending') {
      setCompletingKeyResultId(keyResultId);
      // 播放完成音效
      playCompletionSound();
      
      // 延迟切换状态，让动画有时间显示
      setTimeout(() => {
        toggleKeyResultComplete(keyResultId);
        // 动画结束后重置状态
        setTimeout(() => {
          setCompletingKeyResultId(null);
        }, 500);
      }, 300);
    } else {
      // 如果是取消完成，直接切换
      toggleKeyResultComplete(keyResultId);
    }
  };
  
  // Format a date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'yyyy-MM-dd');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  /**
   * 打开任务详情
   */
  const handleOpenTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailOpen(true);
  };
  
  /**
   * 关闭任务详情
   */
  const handleCloseTaskDetail = () => {
    setSelectedTaskId(null);
    setIsTaskDetailOpen(false);
  };
  
  /**
   * 更新任务
   */
  const handleUpdateTask = (updatedTask: Task) => {
    try {
      // 从 store 获取 updateTask 函数
      const { updateTask } = useAppStore.getState();
      
      // 提取需要更新的属性
      const { 
        id, title, description, dueDate, status, priority, 
        important, goalId, taskListId, feedback, subtasks 
      } = updatedTask;
      
      // 调用 updateTask 函数更新任务
      updateTask(id, { 
        title, description, dueDate, status, priority, 
        important, goalId, taskListId, feedback, subtasks 
      });
      
      console.log("Successfully updated task:", id);
      
      // 关闭任务详情
      setIsTaskDetailOpen(false);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };
  
  // Render nothing if not open
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end"
      style={{ visibility: isOpen ? 'visible' : 'hidden' }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0 }}
        onClick={onClose}
      />
      
      {/* Detail panel */}
      <div 
        ref={detailContainerRef}
        className="relative w-full max-w-md bg-white h-full shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">目标详情</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Goal title section */}
          <div className="flex items-center mb-6">
            <div className="flex-1">
              <input
                ref={titleInputRef}
                type="text"
                className="w-full text-xl font-semibold focus:outline-none focus:border-b focus:border-purple-500 py-1"
                value={editedTitle}
                onChange={handleTitleChange}
                placeholder="目标标题"
              />
            </div>
          </div>
          
          {/* Goal status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目标状态
            </label>
            <select
              value={editedStatus}
              onChange={handleStatusChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="active">进行中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          
          {/* Due date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              截止日期
            </label>
            <div className="flex items-center">
              <Calendar size={16} className="text-gray-400 mr-2" />
              <input
                type="date"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                value={editedDueDate}
                onChange={handleDueDateChange}
              />
            </div>
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目标描述
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 min-h-[100px]"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="添加描述..."
            />
          </div>
          
          {/* Key Results section */}
          <div className="mb-6">
            {/* Only show the header if there are key results */}
            {goalKeyResults.length > 0 && (
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-medium">子目标</h3>
              </div>
            )}
            
            {/* Key Results list */}
            {goalKeyResults.length > 0 && (
              <ul className="space-y-2 mb-2">
                {goalKeyResults.map(kr => (
                  <li key={kr.id} className="group">
                    <div className="flex items-center border border-gray-100 rounded-md p-2 hover:bg-gray-50 relative overflow-hidden">
                      <button
                        className="mr-3 flex-shrink-0"
                        onClick={() => handleToggleKeyResultComplete(kr.id, kr.status)}
                        aria-label={kr.status === 'completed' ? "标记为未完成" : "标记为已完成"}
                      >
                        {kr.status === 'completed' ? (
                          <CheckCircle2 size={18} className="text-green-500" />
                        ) : (
                          <Circle size={18} className="text-gray-400" />
                        )}
                      </button>
                      
                      {/* 完成动画效果 - 划线 */}
                      {(kr.status === 'completed' || completingKeyResultId === kr.id) && (
                        <div 
                          className="absolute h-[1px] bg-gray-400 left-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-in-out"
                          style={{ 
                            width: completingKeyResultId === kr.id ? '100%' : (kr.status === 'completed' ? '100%' : '0%'),
                            opacity: completingKeyResultId === kr.id ? 1 : (kr.status === 'completed' ? 1 : 0)
                          }}
                        />
                      )}
                      
                      {editingKeyResultId === kr.id ? (
                        <div className="flex-1">
                          <input
                            ref={keyResultInputRef}
                            type="text"
                            className="w-full border-b border-purple-500 focus:outline-none py-1 px-0 text-sm bg-transparent"
                            value={editingKeyResultTitle}
                            onChange={(e) => setEditingKeyResultTitle(e.target.value)}
                            onBlur={handleSaveKeyResultTitle}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); // 阻止默认行为，防止表单提交
                                handleSaveKeyResultTitle();
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <span 
                          className={`flex-1 text-sm ${kr.status === 'completed' ? 'text-gray-500' : 'text-gray-700'} py-1 px-2 rounded cursor-text`}
                          onClick={() => handleStartEditingKeyResult(kr)}
                        >
                          {kr.title}
                        </span>
                      )}
                      
                      <button
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            console.log("Deleting key result:", kr.id);
                            deleteKeyResult(kr.id);
                          } catch (error) {
                            console.error("Error deleting key result:", error);
                          }
                        }}
                        aria-label="删除子目标"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {/* New add key result control that looks like an inactive key result */}
            <div className={`group ${goalKeyResults.length === 0 ? 'opacity-0 hover:opacity-100' : ''}`}>
              {showNewKeyResultInput ? (
                <div className="flex items-center border border-gray-100 rounded-md p-2 bg-gray-50">
                  <Circle size={18} className="text-gray-300 mr-3 flex-shrink-0" />
                  <input
                    ref={newKeyResultInputRef}
                    type="text"
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                    placeholder="输入新的子目标..."
                    value={newKeyResultTitle}
                    onChange={(e) => setNewKeyResultTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault(); // 阻止默认行为，防止表单提交
                        handleAddKeyResult();
                      }
                    }}
                    onBlur={() => {
                      if (!newKeyResultTitle.trim()) {
                        setShowNewKeyResultInput(false);
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <div 
                  className="flex items-center border border-gray-100 rounded-md p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setShowNewKeyResultInput(true)}
                >
                  <Circle size={18} className="text-gray-300 mr-3 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-400 py-1 px-2">
                    新的子目标
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* 关联任务部分 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium flex items-center">
                <List size={18} className="text-purple-500 mr-1" />
                关联任务
              </h3>
            </div>
            
            {/* 所有关联任务列表 */}
            {goalTasks.length > 0 ? (
              <div className="space-y-2 mb-6">
                {goalTasks
                  .sort((a, b) => {
                    // 先按状态排序（未完成的在前），再按 ID 排序
                    if (a.status !== b.status) {
                      return a.status === 'completed' ? 1 : -1;
                    }
                    return a.id.localeCompare(b.id);
                  })
                  .map(task => (
                    <div 
                      key={task.id} 
                      className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleOpenTaskDetail(task.id)}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle size={16} className="text-green-500 mr-2 flex-shrink-0" />
                      ) : (
                        <Circle size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                        {task.title}
                      </span>
                    </div>
                  ))
                }
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic mb-6">暂无关联任务，请在任务详情页关联此目标</p>
            )}
          </div>
          
          {/* Tasks timeline section */}
          <div>
            <h3 className="text-md font-medium mb-3 flex items-center">
              <List size={18} className="text-purple-500 mr-1" />
              已完成任务时间线
            </h3>
            
            {completedTasks.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-gray-200">
                {completedTasks
                  .sort((a, b) => {
                    // Sort by completion date if available, otherwise by ID
                    if (a.completedAt && b.completedAt) {
                      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
                    }
                    return a.id.localeCompare(b.id);
                  })
                  .map((task, index) => (
                    <div key={task.id} className="mb-3 relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[25px] w-4 h-4 bg-purple-100 border-2 border-purple-500 rounded-full" />
                      
                      {/* Task card */}
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start">
                          <CheckCircle2 size={16} className="text-green-500 mr-2 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium">{task.title}</h4>
                            {task.completedAt && (
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <Clock size={10} className="mr-1" />
                                <span>{formatDate(task.completedAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">暂无完成的关联任务</p>
            )}
          </div>
        </div>
      </div>
      
      {/* 任务详情组件 */}
      {selectedTaskId && (
        <TaskDetail
          task={tasks.find(t => t.id === selectedTaskId)!}
          isOpen={isTaskDetailOpen}
          onClose={handleCloseTaskDetail}
          onUpdate={handleUpdateTask}
        />
      )}
    </div>
  );
} 