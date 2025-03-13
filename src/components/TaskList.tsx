'use client';

import { useState } from 'react';
import { format, isToday, isFuture, isPast, parseISO } from 'date-fns';
import { Plus, Calendar, Clock, CheckCircle, X, Edit2, Trash2 } from 'lucide-react';
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
  goalId?: string;
  taskListId: string;
  feedback?: string[];
}

/**
 * Props for the TaskList component
 */
interface TaskListProps {
  filter: 'today' | 'all' | 'completed' | string; // Filter to apply to the task list
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
  const { tasks, addTask, updateTask, deleteTask, toggleTaskComplete } = useAppStore();
  
  // Local state
  const [newTaskTitle, setNewTaskTitle] = useState(''); // For the new task input
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Currently selected task
  const [isDetailOpen, setIsDetailOpen] = useState(false); // Whether the task detail modal is open

  /**
   * Filter tasks based on the selected filter
   * - 'today': Show tasks due today or with no due date
   * - 'completed': Show completed tasks
   * - 'all': Show all tasks
   * - custom list ID: Show tasks in that list
   */
  const filteredTasks = tasks.filter(task => {
    if (filter === 'today') {
      return (task.dueDate && isToday(parseISO(task.dueDate))) || !task.dueDate;
    } else if (filter === 'completed') {
      return task.status === 'completed';
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
   * - No Due Date: Tasks without a due date
   */
  const groupedTasks = filteredTasks.reduce((groups, task) => {
    let group = 'No Due Date';
    
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
    
    groups[group].push(task);
    return groups;
  }, {} as Record<string, Task[]>);

  /**
   * Sort groups in a logical order:
   * 1. Today
   * 2. Overdue
   * 3. Future dates (sorted chronologically)
   * 4. No Due Date
   */
  const sortedGroups = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Overdue') return -1;
    if (b === 'Overdue') return 1;
    if (a === 'No Due Date') return 1;
    if (b === 'No Due Date') return -1;
    return 0;
  });

  /**
   * Handle adding a new task
   * Creates a task with the entered title and default values
   */
  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask({
        title: newTaskTitle.trim(),
        status: 'pending',
        priority: 'medium',
        taskListId: filter === 'today' || filter === 'all' || filter === 'completed' 
          ? 'today' 
          : filter,
      });
      
      setNewTaskTitle(''); // Clear the input after adding
    }
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
    updateTask(updatedTask.id, updatedTask);
    setIsDetailOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Add new task input */}
      <div className="flex items-center space-x-2 mb-6">
        <input
          type="text"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a new task..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <button
          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={handleAddTask}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Task groups - organized by date */}
      {sortedGroups.length > 0 ? (
        sortedGroups.map(group => (
          <div key={group} className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {group}
            </h3>
            
            <ul className="space-y-1">
              {groupedTasks[group].map(task => (
                <li 
                  key={task.id} 
                  className={`flex items-center p-3 rounded-md ${
                    task.status === 'completed' 
                      ? 'bg-gray-50 text-gray-500' 
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {/* Task completion toggle button */}
                  <button
                    className="mr-3 text-gray-400 hover:text-blue-600"
                    onClick={() => toggleTaskComplete(task.id)}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                  </button>
                  
                  {/* Task title and due date */}
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleOpenDetail(task)}
                  >
                    <p className={`${task.status === 'completed' ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    
                    {task.dueDate && (
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Calendar size={14} className="mr-1" />
                        <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Task action buttons */}
                  <div className="flex space-x-1">
                    <button
                      className="p-1 text-gray-400 hover:text-blue-600"
                      onClick={() => handleOpenDetail(task)}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      className="p-1 text-gray-400 hover:text-red-600"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No tasks found. Add your first task to get started!</p>
        </div>
      )}

      {/* Task detail modal - opens when a task is selected */}
      {isDetailOpen && selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={handleCloseDetail}
          onUpdate={handleUpdateTask}
        />
      )}
    </div>
  );
} 