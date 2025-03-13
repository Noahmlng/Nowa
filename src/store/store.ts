import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Task interface - Represents a task in the application
 * Based on the Task model from models.js
 */
interface Task {
  id: string;                                      // Unique identifier for the task
  title: string;                                   // Task title
  description?: string;                            // Optional task description
  dueDate?: string;                                // Optional due date (ISO string format)
  status: 'pending' | 'completed' | 'cancelled';   // Task status
  priority: 'low' | 'medium' | 'high';             // Task priority level
  goalId?: string;                                 // Optional reference to a goal
  taskListId: string;                              // Reference to the list this task belongs to
  feedback?: string[];                             // Optional array of feedback entries
}

/**
 * Goal interface - Represents a goal in the application
 * Based on the Goal model from models.js
 */
interface Goal {
  id: string;                                      // Unique identifier for the goal
  title: string;                                   // Goal title
  description?: string;                            // Optional goal description
  category?: string;                               // Optional category for grouping goals
  progress: number;                                // Progress as a decimal between 0 and 1
  status: 'active' | 'completed' | 'cancelled';    // Goal status
  startDate?: string;                              // Optional start date (ISO string)
  endDate?: string;                                // Optional target end date (ISO string)
  finishDate?: string;                             // Optional actual completion date (ISO string)
}

/**
 * TaskList interface - Represents a list that can contain tasks
 */
interface TaskList {
  id: string;                                      // Unique identifier for the list
  name: string;                                    // List name
  description?: string;                            // Optional list description
}

/**
 * AppState interface - Defines the global state and actions for the application
 */
interface AppState {
  // State
  tasks: Task[];                                   // Array of all tasks
  goals: Goal[];                                   // Array of all goals
  taskLists: TaskList[];                           // Array of all task lists
  selectedList: string;                            // Currently selected list ID
  
  // Task actions
  addTask: (task: Omit<Task, 'id'>) => void;       // Add a new task (ID is generated automatically)
  updateTask: (id: string, task: Partial<Task>) => void; // Update an existing task
  deleteTask: (id: string) => void;                // Delete a task
  toggleTaskComplete: (id: string) => void;        // Toggle a task between completed and pending
  addTaskFeedback: (id: string, feedback: string) => void; // Add feedback to a task
  
  // Goal actions
  addGoal: (goal: Omit<Goal, 'id'>) => void;       // Add a new goal (ID is generated automatically)
  updateGoal: (id: string, goal: Partial<Goal>) => void; // Update an existing goal
  deleteGoal: (id: string) => void;                // Delete a goal
  updateGoalProgress: (id: string, progress: number) => void; // Update a goal's progress
  
  // TaskList actions
  addTaskList: (taskList: Omit<TaskList, 'id'>) => void; // Add a new task list
  updateTaskList: (id: string, taskList: Partial<TaskList>) => void; // Update a task list
  deleteTaskList: (id: string) => void;            // Delete a task list
  
  // UI state
  setSelectedList: (listId: string) => void;       // Change the currently selected list
}

/**
 * Main application store using Zustand
 * Includes persistence to localStorage via the persist middleware
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      tasks: [],
      goals: [],
      taskLists: [
        { id: 'today', name: 'Today', description: 'Tasks for today' },
        { id: 'all', name: 'All Tasks', description: 'All tasks' },
      ],
      selectedList: 'today',
      
      // Task actions implementation
      addTask: (task) => 
        set((state) => ({ 
          tasks: [...state.tasks, { ...task, id: `task-${Date.now()}` }] 
        })),
      
      updateTask: (id, updatedTask) => 
        set((state) => ({ 
          tasks: state.tasks.map(task => 
            task.id === id ? { ...task, ...updatedTask } : task
          ) 
        })),
      
      deleteTask: (id) => 
        set((state) => ({ 
          tasks: state.tasks.filter(task => task.id !== id) 
        })),
      
      toggleTaskComplete: (id) => 
        set((state) => ({ 
          tasks: state.tasks.map(task => 
            task.id === id 
              ? { ...task, status: task.status === 'completed' ? 'pending' : 'completed' } 
              : task
          ) 
        })),
      
      addTaskFeedback: (id, feedback) => 
        set((state) => ({ 
          tasks: state.tasks.map(task => 
            task.id === id 
              ? { 
                  ...task, 
                  feedback: task.feedback ? [...task.feedback, feedback] : [feedback] 
                } 
              : task
          ) 
        })),
      
      // Goal actions implementation
      addGoal: (goal) => 
        set((state) => ({ 
          goals: [...state.goals, { ...goal, id: `goal-${Date.now()}` }] 
        })),
      
      updateGoal: (id, updatedGoal) => 
        set((state) => ({ 
          goals: state.goals.map(goal => 
            goal.id === id ? { ...goal, ...updatedGoal } : goal
          ) 
        })),
      
      deleteGoal: (id) => 
        set((state) => ({ 
          goals: state.goals.filter(goal => goal.id !== id) 
        })),
      
      updateGoalProgress: (id, progress) => 
        set((state) => ({ 
          goals: state.goals.map(goal => 
            goal.id === id ? { ...goal, progress } : goal
          ) 
        })),
      
      // TaskList actions implementation
      addTaskList: (taskList) => 
        set((state) => ({ 
          taskLists: [...state.taskLists, { ...taskList, id: `list-${Date.now()}` }] 
        })),
      
      updateTaskList: (id, updatedTaskList) => 
        set((state) => ({ 
          taskLists: state.taskLists.map(list => 
            list.id === id ? { ...list, ...updatedTaskList } : list
          ) 
        })),
      
      deleteTaskList: (id) => 
        set((state) => ({ 
          taskLists: state.taskLists.filter(list => list.id !== id) 
        })),
      
      // UI state actions
      setSelectedList: (listId) => 
        set({ selectedList: listId }),
    }),
    {
      name: 'nowa-storage', // Name for the localStorage key
    }
  )
); 