'use client';

import { useState } from 'react';
import { format, isToday, isFuture, isPast, parseISO } from 'date-fns';
import { Plus, Calendar, Clock, CheckCircle, X, Trash2, Star, Sun, ClipboardList, ArrowDown, Target } from 'lucide-react';
import TaskDetail from './TaskDetail';
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
 */
export default function TaskList({ filter }: TaskListProps) {
  // Get tasks and task actions from the global store
  const { tasks, addTask, updateTask, deleteTask, toggleTaskComplete, toggleTaskImportant, goals } = useAppStore();
  
  // Local state
  const [newTaskTitle, setNewTaskTitle] = useState(''); // For the new task input
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Currently selected task
  const [isDetailOpen, setIsDetailOpen] = useState(false); // Whether the task detail modal is open

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
      return (task.dueDate && isToday(parseISO(task.dueDate))) || !task.dueDate;
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
   * Group tasks by date category
   * - Today: Tasks due today
   * - Overdue: Tasks with past due dates
   * - Future dates: Tasks with future due dates (grouped by date)
   * - Upcoming: Tasks without a due date
   */
  const groupedTasks = filteredTasks.reduce((groups, task) => {
    // 在 My Day 视图中，不使用"计划中"分组，所有任务都归入 Today 组
    if (filter === 'today') {
      const group = 'Today';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(task as Task);
      return groups;
    }
    
    // 其他视图保持原有分组逻辑
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
    
    if (!groups[group]) {
      groups[group] = [];
    }
    
    groups[group].push(task as Task);
    return groups;
  }, {} as Record<string, Task[]>);

  /**
   * Sort groups in a logical order:
   * 1. Today
   * 2. Overdue
   * 3. Future dates (sorted chronologically)
   * 4. Upcoming (tasks without due date)
   */
  const sortedGroups = Object.keys(groupedTasks).sort((a, b) => {
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
      // 检查当前 filter 是否为目标 ID
      const isGoalFilter = goals.some(goal => goal.id === filter);
      
      addTask({
        title: newTaskTitle.trim(),
        status: 'pending',
        priority: 'medium',
        important: false,
        taskListId: filter === 'today' || filter === 'all' || filter === 'completed' || filter === 'important'
          ? 'today' 
          : filter,
        // 如果当前 filter 是目标 ID，则自动关联到该目标
        goalId: isGoalFilter ? filter : undefined
      });
      
      setNewTaskTitle(''); // Clear the input after adding
    }
  };

  /**
   * Add a task to My Day
   */
  const handleAddToMyDay = (taskId: string) => {
    updateTask(taskId, { taskListId: 'today' });
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
    
    // 关闭详情面板
    setIsDetailOpen(false);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto pb-20">
        {/* Task groups - organized by date */}
        {sortedGroups.length > 0 ? (
          sortedGroups.map(group => (
            <div key={group} className="mb-4">
              {/* 在 My Day 页面且组名为 Today 时不显示组标题 */}
              {!(filter === 'today' && group === 'Today') && (
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {group}
                </h3>
              )}
              
              <ul className="space-y-1.5">
                {groupedTasks[group].map(task => (
                  <li 
                    key={task.id} 
                    className={`flex items-center p-2.5 rounded-lg transition-all cursor-pointer ${
                      task.status === 'completed' 
                        ? 'bg-gray-50 text-gray-500' 
                        : 'bg-white hover:bg-gray-50 shadow'
                    }`}
                    onClick={() => handleOpenDetail(task)}
                  >
                    {/* Task completion toggle button */}
                    <button
                      className="mr-2.5 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation(); // 防止点击传播到父元素
                        toggleTaskComplete(task.id);
                      }}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle className="text-green-500 hover:text-green-600" size={18} />
                      ) : (
                        <div className="w-[18px] h-[18px] border-2 border-gray-300 rounded-full hover:border-green-500 transition-colors" />
                      )}
                    </button>
                    
                    {/* Task title and due date */}
                    <div className="flex-1">
                      <p className={`text-sm text-gray-900 hover:bg-gray-100 rounded px-1 py-0.5 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </p>
                      
                      <div className="flex items-center mt-0.5 space-x-2">
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar size={12} className="mr-1" />
                            <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
                          </div>
                        )}
                        
                        {/* 显示关联的目标名称 */}
                        {getAssociatedGoalName(task.goalId) && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Target size={12} className="mr-1 text-purple-500" />
                            <span className="truncate max-w-[120px]">{getAssociatedGoalName(task.goalId)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Task action buttons */}
                    <div className="flex space-x-1">
                      {/* Important star button */}
                      <button
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation(); // 防止点击传播到父元素
                          toggleTaskImportant(task.id);
                        }}
                        title={task.important ? "Remove importance" : "Mark as important"}
                      >
                        <Star 
                          size={16} 
                          className={task.important 
                            ? "text-red-500 fill-red-500" 
                            : "text-gray-400 hover:text-red-500"
                          } 
                        />
                      </button>

                      {/* Add to My Day button - only shown in lists other than Today and Goals */}
                      {shouldShowAddToMyDay && task.taskListId !== 'today' && (
                        <button
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // 防止点击传播到父元素
                            handleAddToMyDay(task.id);
                          }}
                          title="Add to My Day"
                        >
                          <Sun size={16} className="text-gray-400 hover:text-yellow-500" />
                        </button>
                      )}

                      {/* 删除编辑按钮 */}
                      <button
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation(); // 防止点击传播到父元素
                          deleteTask(task.id);
                        }}
                        title="Delete task"
                      >
                        <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow flex flex-col items-center">
            <ClipboardList size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">暂无任务</p>
            <div className="flex items-center text-sm text-blue-500">
              <ArrowDown size={16} className="mr-1 animate-bounce" />
              <span>在下方添加你的第一个任务</span>
            </div>
          </div>
        )}
      </div>

      {/* Add new task input - fixed at the bottom */}
      <div className={`fixed bottom-0 left-64 right-0 bg-white border-t ${theme.border} shadow-md p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm"
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // 阻止默认行为，防止表单提交
                  handleAddTask();
                }
              }}
            />
            <button
              className={`p-2 ${theme.buttonBg} text-white rounded-lg shadow-sm transition-colors`}
              onClick={handleAddTask}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Task detail modal - opens when a task is selected */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask as any}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onUpdate={handleUpdateTask}
        />
      )}
    </div>
  );
} 