'use client';

import { useState, useRef } from 'react';
import { format, isToday, isFuture, isPast, parseISO } from 'date-fns';
import { Plus, Calendar, Clock, CheckCircle, X, Trash2, Star, Sun, ClipboardList, ArrowDown, Target, Zap, Flag, Edit2 } from 'lucide-react';
import TaskDetail from './TaskDetail';
import TaskSuggestions from './TaskSuggestions';
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
  feedback?: {text: string; timestamp: string}[]; // Updated to match store.ts
  subtasks?: Subtask[];
  completedAt?: string;
}

/**
 * Subtask interface - Represents a subtask of a task
 */
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Props for the TaskList component
 */
interface TaskListProps {
  filter: 'today' | 'all' | 'completed' | 'important' | string; // Filter to apply to the task list
}

/**
 * TaskList Component
 * 
 * Displays a list of tasks based on the provided filter.
 * Allows adding new tasks, toggling completion status, and opening task details.
 * Groups tasks by date (Today, Overdue, Future dates, No Due Date).
 * Includes an AI button for each task to get AI-powered suggestions.
 */
export default function TaskList({ filter }: TaskListProps) {
  // Get tasks and task actions from the global store
  const { tasks, addTask, updateTask, deleteTask, toggleTaskComplete, toggleTaskImportant, goals } = useAppStore();
  
  // Local state
  const [newTaskTitle, setNewTaskTitle] = useState(''); // For the new task input
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Currently selected task
  const [isDetailOpen, setIsDetailOpen] = useState(false); // Whether the task detail modal is open
  const [aiSuggestTaskId, setAiSuggestTaskId] = useState<string | null>(null); // Track task for AI suggestions
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null); // Track task being edited
  const [editingTaskTitle, setEditingTaskTitle] = useState(''); // Track edited task title
  const editTaskInputRef = useRef<HTMLInputElement>(null); // Reference to the edit task input

  /**
   * Filter tasks based on the selected filter
   * - 'today': Show tasks due today or with no due date
   * - 'completed': Show completed tasks
   * - 'important': Show important tasks
   * - 'all': Show all tasks
   * - custom list ID: Show tasks in that list
   */
  const filteredTasks = tasks.filter(task => {
    if (filter === 'today') {
      // Only show tasks with a due date of today
      return task.dueDate && isToday(parseISO(task.dueDate));
    } else if (filter === 'completed') {
      return task.status === 'completed';
    } else if (filter === 'important') {
      return task.important === true;
    } else if (filter === 'all') {
      return true;
    } else {
      // Custom list
      return task.taskListId === filter;
    }
  });

  /**
   * Sort tasks by importance (important tasks first) and creation time (newer first)
   * This is used for the My Day view
   */
  const sortTasksByImportance = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      // For completed tasks, sort by importance first, then by completion time (newer first)
      if (a.status === 'completed' && b.status === 'completed') {
        // Sort by importance (important tasks first)
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
        
        // Then sort by completion time (newer first)
        if (a.completedAt && b.completedAt) {
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        }
        
        // If no completedAt, use ID as a proxy for creation time (higher ID = newer)
        return b.id.localeCompare(a.id);
      }
      
      // For pending tasks, sort by importance only
      if (a.status === 'pending' && b.status === 'pending') {
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
        return 0;
      }
      
      // Always keep pending tasks above completed tasks
      if (a.status === 'pending' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status === 'pending') return 1;
      
      return 0;
    });
  };

  /**
   * Group tasks by date category
   * - Today: Tasks due today
   * - Overdue: Tasks with past due dates
   * - Future dates: Tasks with future due dates (grouped by date)
   * - Upcoming: Tasks without a due date
   */
  const groupedTasks: Record<string, Task[]> = {};
  
  // 在 My Day 视图中，先创建分组以确保顺序
  if (filter === 'today') {
    // 确保未完成分区在前面，已完成分区在后面
    groupedTasks['未完成'] = [];
    groupedTasks['已完成'] = [];
    
    // 然后填充任务
    filteredTasks.forEach(task => {
      const group = task.status === 'completed' ? '已完成' : '未完成';
      groupedTasks[group].push(task);
    });
    
    // 对每个分组内的任务进行排序
    groupedTasks['未完成'] = sortTasksByImportance(groupedTasks['未完成']);
    groupedTasks['已完成'] = sortTasksByImportance(groupedTasks['已完成']);
  } else if (filter === 'important') {
    // Important 视图中，按完成状态分组
    groupedTasks['未完成'] = [];
    groupedTasks['已完成'] = [];
    
    // 填充任务
    filteredTasks.forEach(task => {
      const group = task.status === 'completed' ? '已完成' : '未完成';
      groupedTasks[group].push(task);
    });
    
    // 对每个分组内的任务按截止日期排序
    const sortByDueDate = (tasks: Task[]) => {
      return [...tasks].sort((a, b) => {
        // 如果两个任务都没有截止日期，保持原有顺序
        if (!a.dueDate && !b.dueDate) return 0;
        
        // 没有截止日期的任务放在最后
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 按截止日期升序排序
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    };
    
    groupedTasks['未完成'] = sortByDueDate(groupedTasks['未完成']);
    groupedTasks['已完成'] = sortByDueDate(groupedTasks['已完成']);
  } else if (filter === 'all' || (filter !== 'completed' && !['today', 'important'].includes(filter))) {
    // Tasks 页面和自定义任务列表，按完成状态分组
    groupedTasks['未完成'] = [];
    groupedTasks['已完成'] = [];
    
    // 填充任务
    filteredTasks.forEach(task => {
      const group = task.status === 'completed' ? '已完成' : '未完成';
      groupedTasks[group].push(task);
    });
    
    // 对每个分组内的任务先按重要性排序，然后按截止日期排序
    const sortByImportanceAndDueDate = (tasks: Task[]) => {
      return [...tasks].sort((a, b) => {
        // 首先按重要性排序
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
        
        // 如果重要性相同，再按截止日期排序
        // 如果两个任务都没有截止日期，保持原有顺序
        if (!a.dueDate && !b.dueDate) return 0;
        
        // 没有截止日期的任务放在最后
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 按截止日期升序排序
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    };
    
    groupedTasks['未完成'] = sortByImportanceAndDueDate(groupedTasks['未完成']);
    groupedTasks['已完成'] = sortByImportanceAndDueDate(groupedTasks['已完成']);
  } else {
    // 其他视图保持原有分组逻辑
    filteredTasks.forEach(task => {
      let group = '计划中'; // 将无截止日期的任务归入"计划中"组
      
      if (task.dueDate) {
        const date = parseISO(task.dueDate);
        if (isToday(date)) {
          group = 'Today';
        } else if (isFuture(date)) {
          group = format(date, 'EEEE, MMMM d');
        } else if (isPast(date)) {
          group = 'Overdue';
        }
      }
      
      if (!groupedTasks[group]) {
        groupedTasks[group] = [];
      }
      
      groupedTasks[group].push(task);
    });
    
    // 对每个分组内的任务进行排序
    Object.keys(groupedTasks).forEach(group => {
      if (groupedTasks[group]) {
        groupedTasks[group] = sortTasksByImportance(groupedTasks[group]);
      }
    });
  }

  /**
   * Sort groups in a logical order:
   * 1. Today
   * 2. Overdue
   * 3. Future dates (sorted chronologically)
   * 4. Upcoming (tasks without due date)
   * 
   * For My Day view:
   * 1. 未完成 (Pending)
   * 2. 已完成 (Completed)
   */
  const sortedGroups = Object.keys(groupedTasks).sort((a, b) => {
    if (filter === 'today' || filter === 'important' || filter === 'all' || (filter !== 'completed' && !['today', 'important'].includes(filter))) {
      if (a === '未完成') return -1;
      if (b === '未完成') return 1;
      return 0;
    }
    
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Overdue') return -1;
    if (b === 'Overdue') return 1;
    if (a === '计划中') return 1;
    if (b === '计划中') return -1;
    return 0;
  });

  /**
   * Handle adding a new task
   * Creates a task with the entered title and default values
   */
  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      // Create the new task with default values
      const newTask: Omit<Task, 'id'> = {
        title: newTaskTitle,
        status: 'pending' as const,
        priority: 'medium' as const,
        important: false,
        taskListId: 'inbox',
      };
      
      // Set appropriate attributes based on the current filter
      if (filter === 'today') {
        // For My Day view, set due date to today
        const today = new Date().toISOString().split('T')[0];
        newTask.dueDate = today;
        newTask.taskListId = 'today';
      } else if (filter === 'important') {
        // For Important view, set important to true
        newTask.important = true;
      } else if (filter !== 'all' && filter !== 'completed') {
        // For custom lists, set the taskListId to the current filter
        newTask.taskListId = filter;
      }
      
      // Add the task
      addTask(newTask);
      
      // Clear the input field
      setNewTaskTitle('');
    }
  };

  /**
   * Add a task to My Day
   */
  const handleAddToMyDay = (taskId: string) => {
    // Set the task's due date to today and update the taskListId
    const today = new Date().toISOString().split('T')[0];
    updateTask(taskId, { 
      taskListId: 'today',
      dueDate: today
    });
  };

  /**
   * Open the task detail modal for a specific task
   */
  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  /**
   * Close the task detail modal
   */
  const handleCloseDetail = () => {
    setSelectedTask(null);
    setIsDetailOpen(false);
  };

  /**
   * Update a task with new values
   */
  const handleUpdateTask = (updatedTask: Task) => {
    // 确保我们获取所有需要的属性，包括 goalId
    const { id, title, description, dueDate, status, priority, important, goalId, taskListId, feedback, subtasks } = updatedTask;
    
    // 使用解构的属性更新任务
    updateTask(id, { 
      title, 
      description, 
      dueDate, 
      status, 
      priority, 
      important, 
      goalId, 
      taskListId,
      feedback,
      subtasks
    });
    
    // 不再关闭详情面板，保持展开状态
    // setIsDetailOpen(false);
  };

  /**
   * Get associated goal name for a task
   */
  const getAssociatedGoalName = (goalId?: string) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.title : null;
  };

  // Check if we should show the "Add to My Day" button
  const shouldShowAddToMyDay = filter !== 'today' && filter !== 'goals';

  // Get theme color for the input field based on the current filter
  const getThemeColor = () => {
    switch (filter) {
      case 'today':
        return {
          bg: 'bg-white',
          border: 'border-blue-200',
          buttonBg: 'bg-blue-500 hover:bg-blue-600',
          text: 'text-blue-700'
        };
      case 'important':
        return {
          bg: 'bg-white',
          border: 'border-red-200',
          buttonBg: 'bg-red-500 hover:bg-red-600',
          text: 'text-red-700'
        };
      case 'all':
        return {
          bg: 'bg-white',
          border: 'border-green-200',
          buttonBg: 'bg-green-500 hover:bg-green-600',
          text: 'text-green-700'
        };
      default:
        return {
          bg: 'bg-white',
          border: 'border-gray-200',
          buttonBg: 'bg-blue-500 hover:bg-blue-600',
          text: 'text-gray-700'
        };
    }
  };

  const theme = getThemeColor();

  // Handle showing AI suggestions for a task
  const handleShowAiSuggestions = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening task detail
    setAiSuggestTaskId(taskId);
  };

  /**
   * Toggle a task's important status
   */
  const handleToggleImportant = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the task detail
    toggleTaskImportant(taskId);
  };

  /**
   * Start editing a task title
   */
  const handleStartEditingTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening task detail
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
    
    // Focus the input after component renders
    setTimeout(() => {
      if (editTaskInputRef.current) {
        editTaskInputRef.current.focus();
      }
    }, 0);
  };

  /**
   * Save edited task title
   */
  const handleSaveTaskTitle = () => {
    if (editingTaskId && editingTaskTitle.trim()) {
      updateTask(editingTaskId, { title: editingTaskTitle });
      setEditingTaskId(null);
    }
  };

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Task input */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center">
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 h-10"
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <button
            className="bg-blue-500 text-white px-3 py-2 rounded-r-md hover:bg-blue-600 transition-colors h-10 flex items-center justify-center"
            onClick={handleAddTask}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedTasks).map(([group, tasksInGroup]) => (
          <div key={group} className="mb-6">
            <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-white bg-opacity-90 backdrop-blur-sm z-10">
              {group}
            </h3>
            <ul className="divide-y divide-gray-200">
              {tasksInGroup.map((task) => (
                <li 
                  key={task.id} 
                  className="relative px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {aiSuggestTaskId === task.id && (
                    <div className="relative z-20">
                      <TaskSuggestions 
                        taskId={task.id} 
                        onClose={() => setAiSuggestTaskId(null)}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* Task completion toggle */}
                    <button
                      className="flex-shrink-0 mt-0.5"
                      onClick={() => toggleTaskComplete(task.id)}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-gray-300"></div>
                      )}
                    </button>
                    
                    {/* Task content */}
                    <div className="flex-1 min-w-0" onClick={() => handleOpenDetail(task)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {editingTaskId === task.id ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <input
                                ref={editTaskInputRef}
                                type="text"
                                className="w-full border-b border-blue-500 focus:outline-none py-1 px-2"
                                value={editingTaskTitle}
                                onChange={(e) => setEditingTaskTitle(e.target.value)}
                                onBlur={handleSaveTaskTitle}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveTaskTitle();
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-1">
                              <span 
                                className={`inline ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditingTask(task, e);
                                }}
                              >
                                {task.title}
                              </span>
                            </div>
                          )}
                          
                          {/* Task metadata - reordered as requested */}
                          <div className="mt-2 space-y-1">
                            {/* Display associated goal if present - now at the top */}
                            {task.goalId && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Target className="h-3 w-3 mr-1 text-purple-500" />
                                {getAssociatedGoalName(task.goalId)}
                              </div>
                            )}
                            
                            {/* Display subtasks count if present - now in the middle */}
                            {task.subtasks && task.subtasks.length > 0 && (
                              <div className="flex items-center text-xs text-gray-500">
                                <ClipboardList className="h-3 w-3 mr-1" />
                                {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks
                              </div>
                            )}
                            
                            {/* Due date if present - now at the bottom */}
                            {task.dueDate && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>
                                  {isToday(parseISO(task.dueDate))
                                    ? 'Today'
                                    : format(parseISO(task.dueDate), 'MMM d, yyyy')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {/* Important flag button */}
                          <button 
                            className={`p-1 rounded-full hover:bg-gray-100 transition-colors ${task.important ? 'text-red-500' : 'text-gray-300'}`}
                            onClick={(e) => handleToggleImportant(task.id, e)}
                            title={task.important ? "取消重要标记" : "标记为重要"}
                          >
                            <Flag size={16} />
                          </button>
                          
                          {/* AI Suggestions button */}
                          <button
                            className="text-gray-400 hover:text-purple-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            onClick={(e) => handleShowAiSuggestions(task.id, e)}
                            title="Get AI suggestions"
                          >
                            <Zap className="h-4 w-4" />
                          </button>
                          
                          {/* Delete button */}
                          <button
                            className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        
        {/* Empty state */}
        {Object.keys(groupedTasks).length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <ClipboardList className="h-12 w-12 mb-2" />
            <p>No tasks to show</p>
          </div>
        )}
      </div>
      
      {/* Task Detail Slide-in */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onUpdate={handleUpdateTask}
        />
      )}
    </div>
  );
} 