import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User interface - Represents the user in the application
 */
interface User {
  nickname: string;                                // User's nickname
  tags: string[];                                  // User's tags
}

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
  important: boolean;                              // Whether the task is marked as important
  goalId?: string;                                 // Optional reference to a goal
  taskListId: string;                              // Reference to the list this task belongs to
  feedback?: {text: string; timestamp: string}[];  // Optional array of feedback entries with timestamps
  subtasks?: Subtask[];                            // Optional array of subtasks
  completedAt?: string;                            // Optional completion date (ISO string format)
}

/**
 * Subtask interface - Represents a subtask of a task
 */
interface Subtask {
  id: string;                                      // Unique identifier for the subtask
  title: string;                                   // Subtask title
  completed: boolean;                              // Whether the subtask is completed
}

/**
 * KeyResult interface - Represents a key result/milestone for a goal
 */
interface KeyResult {
  id: string;                                      // Unique identifier for the key result
  goalId: string;                                  // Parent goal ID
  title: string;                                   // Key result title
  status: 'pending' | 'completed';                 // Status of the key result
}

/**
 * Goal interface - Represents a goal in the application
 * Based on the Goal model from models.js
 */
interface Goal {
  id: string;                                      // Unique identifier for the goal
  title: string;                                   // Goal title
  description?: string;                            // Optional goal description
  dueDate?: string;                                // Optional due date (ISO string format)
  progress: number;                                // Progress as a percentage (0-100)
  status: 'active' | 'completed' | 'cancelled';    // Goal status
  taskIds: string[];                               // Array of associated task IDs
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
  user: User;                                      // User information
  tasks: Task[];                                   // Array of all tasks
  goals: Goal[];                                   // Array of all goals
  keyResults: KeyResult[];                         // Array of all key results
  taskLists: TaskList[];                           // Array of all task lists
  selectedList: string;                            // Currently selected list ID
  
  // User actions
  updateUser: (user: Partial<User>) => void;       // Update user information
  
  // Task actions
  addTask: (task: Omit<Task, 'id'>) => void;       // Add a new task (ID is generated automatically)
  updateTask: (id: string, task: Partial<Task>) => void; // Update an existing task
  deleteTask: (id: string) => void;                // Delete a task
  toggleTaskComplete: (id: string) => void;        // Toggle a task between completed and pending
  toggleTaskImportant: (id: string) => void;       // Toggle a task's important status
  addTaskFeedback: (id: string, feedback: string) => void; // Add feedback to a task
  
  // Goal actions
  addGoal: (goal: Omit<Goal, 'id'>) => void;       // Add a new goal (ID is generated automatically)
  updateGoal: (id: string, goal: Partial<Goal>) => void; // Update an existing goal
  deleteGoal: (id: string) => void;                // Delete a goal
  
  // KeyResult actions
  addKeyResult: (keyResult: Omit<KeyResult, 'id'>) => void; // Add a new key result
  updateKeyResult: (id: string, keyResult: Partial<KeyResult>) => void; // Update a key result
  deleteKeyResult: (id: string) => void;           // Delete a key result  
  toggleKeyResultComplete: (id: string) => void;   // Toggle a key result between completed and pending
  updateGoalProgress: (goalId: string) => void;    // Calculate and update a goal's progress based on key results
  
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
    (set, get) => ({
      // Initial state
      user: {
        nickname: 'Noah',
        tags: ['Builder', '努力减重中']
      },
      tasks: [],
      goals: [],
      keyResults: [],
      taskLists: [
        { id: 'goals', name: 'Goals', description: 'Goals tracking' },
        { id: 'today', name: 'My Day', description: 'Tasks due today' },
        { id: 'important', name: 'Important', description: 'Important tasks' },
        { id: 'all', name: 'Tasks', description: 'All tasks' },
      ],
      selectedList: 'today',
      
      // User actions
      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      })),
      
      // Task actions implementation
      addTask: (task) => 
        set((state) => ({ 
          tasks: [...state.tasks, { ...task, id: `task-${Date.now()}`, important: task.important || false }] 
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
              ? { 
                  ...task, 
                  status: task.status === 'completed' ? 'pending' : 'completed',
                  completedAt: task.status === 'completed' ? undefined : new Date().toISOString()
                } 
              : task
          ) 
        })),
      
      toggleTaskImportant: (id) => 
        set((state) => ({ 
          tasks: state.tasks.map(task => 
            task.id === id 
              ? { ...task, important: !task.important } 
              : task
          ) 
        })),
      
      addTaskFeedback: (id, feedback) => 
        set((state) => {
          // Try to parse JSON string or use as plain text
          let feedbackItem;
          try {
            feedbackItem = JSON.parse(feedback);
          } catch {
            // If parsing fails, create a new feedback item with timestamp
            feedbackItem = {
              text: feedback,
              timestamp: new Date().toISOString()
            };
          }
          
          return { 
            tasks: state.tasks.map(task => 
              task.id === id 
                ? { 
                    ...task, 
                    feedback: task.feedback ? [...task.feedback, feedbackItem] : [feedbackItem] 
                  } 
                : task
            ) 
          };
        }),
      
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
        set((state) => {
          // Also delete all key results associated with the goal
          const keyResultsToKeep = state.keyResults.filter(kr => kr.goalId !== id);
          return { 
            goals: state.goals.filter(goal => goal.id !== id),
            keyResults: keyResultsToKeep
          };
        }),
      
      // KeyResult actions implementation
      addKeyResult: (keyResult) => {
        const id = `kr-${Date.now()}`;
        set((state) => ({ 
          keyResults: [...state.keyResults, { ...keyResult, id }] 
        }));
        // Update the goal progress
        get().updateGoalProgress(keyResult.goalId);
      },
      
      updateKeyResult: (id, updatedKeyResult) => {
        let goalId: string | null = null;
        set((state) => {
          const updatedKeyResults = state.keyResults.map(kr => {
            if (kr.id === id) {
              goalId = kr.goalId;
              return { ...kr, ...updatedKeyResult };
            }
            return kr;
          });
          return { keyResults: updatedKeyResults };
        });
        // Update the goal progress if needed
        if (goalId) get().updateGoalProgress(goalId);
      },
      
      deleteKeyResult: (id) => {
        try {
          console.log("Store: Deleting key result with id:", id);
          let goalId: string | null = null;
          
          set((state) => {
            console.log("Current key results:", state.keyResults);
            const keyResult = state.keyResults.find(kr => kr.id === id);
            
            if (keyResult) {
              console.log("Found key result to delete:", keyResult);
              goalId = keyResult.goalId;
            } else {
              console.warn("Key result not found with id:", id);
            }
            
            const filteredKeyResults = state.keyResults.filter(kr => kr.id !== id);
            console.log("Filtered key results:", filteredKeyResults);
            
            return { keyResults: filteredKeyResults };
          });
          
          // Update the goal progress if needed
          if (goalId) {
            console.log("Updating goal progress for goal:", goalId);
            get().updateGoalProgress(goalId);
          }
        } catch (error) {
          console.error("Error in deleteKeyResult:", error);
        }
      },
      
      toggleKeyResultComplete: (id) => {
        let goalId: string | null = null;
        set((state) => {
          const updatedKeyResults = state.keyResults.map(kr => {
            if (kr.id === id) {
              goalId = kr.goalId;
              return { 
                ...kr, 
                status: kr.status === 'completed' ? 'pending' as const : 'completed' as const 
              };
            }
            return kr;
          });
          return { keyResults: updatedKeyResults };
        });
        // Update the goal progress if needed
        if (goalId) get().updateGoalProgress(goalId);
      },
      
      updateGoalProgress: (goalId) => {
        try {
          console.log("Updating goal progress for goal:", goalId);
          
          set((state) => {
            // Check if goal exists
            const goalExists = state.goals.some(goal => goal.id === goalId);
            if (!goalExists) {
              console.warn("Goal not found with id:", goalId);
              return state; // Return unchanged state
            }
            
            // Get all key results for this goal
            const goalKeyResults = state.keyResults.filter(kr => kr.goalId === goalId);
            console.log("Key results for goal:", goalKeyResults);
            
            if (goalKeyResults.length === 0) {
              console.log("No key results found, setting progress to 0");
              // If there are no key results, set progress to 0
              return {
                goals: state.goals.map(goal => 
                  goal.id === goalId ? { ...goal, progress: 0 } : goal
                )
              };
            }
            
            // Calculate progress based on completed key results
            const completedCount = goalKeyResults.filter(kr => kr.status === 'completed').length;
            const totalCount = goalKeyResults.length;
            const progress = Math.round((completedCount / totalCount) * 100);
            console.log(`Progress: ${completedCount}/${totalCount} = ${progress}%`);
            
            return {
              goals: state.goals.map(goal => 
                goal.id === goalId ? { ...goal, progress } : goal
              )
            };
          });
        } catch (error) {
          console.error("Error in updateGoalProgress:", error);
        }
      },
      
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