'use client';

import { useState } from 'react';
import { format, isToday, isFuture, isPast, parseISO } from 'date-fns';
import { Plus, Calendar, Clock, CheckCircle, X, Trash2, Star, Sun, ClipboardList, ArrowDown, Target, Zap } from 'lucide-react';
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
      // Create the new task
      addTask({
        title: newTaskTitle,
        status: 'pending',
        priority: 'medium',
        important: false,
        taskListId: filter === 'today' || filter === 'all' || filter === 'important' || filter === 'completed' 
          ? 'inbox' // Default list for filtered views
          : filter, // Use the current list ID for list views
      });
      
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

  // Handle showing AI suggestions for a task
  const handleShowAiSuggestions = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening task detail
    setAiSuggestTaskId(taskId);
  };

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Task input */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <button
            className="bg-blue-500 text-white px-3 py-2 rounded-r-md hover:bg-blue-600 transition-colors"
            onClick={handleAddTask}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 overflow-y-auto pb-16">
        {Object.entries(groupedTasks).map(([group, tasksInGroup]) => (
          <div key={group} className="mb-6">
            <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
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
                      className="flex-shrink-0 mt-1"
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
                          <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                          
                          {/* Display subtasks count if present */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <ClipboardList className="h-3 w-3 mr-1" />
                              {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks
                            </div>
                          )}
                          
                          {/* Display associated goal if present */}
                          {task.goalId && (
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <Target className="h-3 w-3 mr-1" />
                              {getAssociatedGoalName(task.goalId)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-2">
                          {/* AI Suggestions button */}
                          <button
                            className="text-gray-400 hover:text-purple-500"
                            onClick={(e) => handleShowAiSuggestions(task.id, e)}
                            title="Get AI suggestions"
                          >
                            <Zap className="h-4 w-4" />
                          </button>
                          
                          {/* Important flag */}
                          <button
                            className="text-gray-400 hover:text-yellow-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskImportant(task.id);
                            }}
                          >
                            <Star
                              className={`h-4 w-4 ${task.important ? 'text-yellow-500 fill-yellow-500' : ''}`}
                            />
                          </button>
                          
                          {/* Delete button */}
                          <button
                            className="text-gray-400 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Due date if present */}
                      {task.dueDate && (
                        <div className="mt-1 flex items-center text-xs text-gray-500">
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