import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { convertTimelineToDate } from '@/utils/dateUtils';

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
 * GoalTask interface - Represents a task related to a goal
 */
interface GoalTask {
  id: string;                                      // Unique identifier for the task
  title: string;                                   // Task title
  timeline?: string;                               // Optional timeline information (e.g., "March", "Week 1")
  completed: boolean;                              // Whether the task is completed
  description?: string;                            // Optional task description
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
  tasks?: GoalTask[];                              // Optional array of tasks for this goal
  aiGenerated?: boolean;                           // Whether the goal and tasks were generated with AI assistance
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
  
  // 新增：将目标任务同步到任务库
  syncGoalTasksToTaskLibrary: (goalId: string) => void; // 将指定目标的任务同步到任务库
}

/**
 * 将 GoalTask 转换为 Task 的辅助函数
 */
const goalTaskToTask = (goalTask: GoalTask, goalId: string): Omit<Task, 'id'> => {
  // 将 timeline 描述转换为具体日期
  const dueDate = goalTask.timeline 
    ? convertTimelineToDate(goalTask.timeline)
    : undefined;
  
  console.log(`Converting task "${goalTask.title}" with timeline "${goalTask.timeline}" to due date: ${dueDate}`);
  
  return {
    title: goalTask.title,
    description: goalTask.description,
    status: goalTask.completed ? 'completed' : 'pending',
    priority: 'medium',
    taskListId: 'all', // 添加到 All Tasks
    goalId: goalId, // 关联到对应目标
    dueDate // 使用转换后的日期
  };
};

/**
 * Main application store using Zustand
 * Includes persistence to localStorage via the persist middleware
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      tasks: [],
      goals: [],
      taskLists: [
        { id: 'today', name: 'Today', description: 'Tasks for today' },
        { id: 'all', name: 'All Tasks', description: 'All tasks' },
      ],
      selectedList: 'today',
      
      // Task actions implementation
      addTask: (task) => {
        // 打印日志以便调试
        console.log('Adding task:', task);
        set((state) => ({ 
          tasks: [...state.tasks, { ...task, id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] 
        }));
      },
      
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
      
      // 新增：将目标任务同步到任务库
      syncGoalTasksToTaskLibrary: (goalId) => {
        const { goals, tasks, addTask, updateTask } = get();
        const goal = goals.find(g => g.id === goalId);
        
        if (!goal || !goal.tasks || goal.tasks.length === 0) return;
        
        console.log(`Syncing ${goal.tasks.length} tasks from goal ${goalId} to task library`);
        
        // 获取现有的关联到此目标的任务
        const existingTasksForGoal = tasks.filter(t => t.goalId === goalId);
        
        goal.tasks.forEach(goalTask => {
          // 检查是否已存在匹配此 goalTask 的任务
          const existingTask = existingTasksForGoal.find(t => t.title === goalTask.title);
          
          if (existingTask) {
            // 如果任务已存在，更新其状态以匹配 goalTask
            updateTask(existingTask.id, {
              status: goalTask.completed ? 'completed' : 'pending',
              description: goalTask.description
            });
            console.log(`Updated existing task: ${existingTask.id} - ${goalTask.title}`);
          } else {
            // 否则创建新任务
            const newTask = goalTaskToTask(goalTask, goalId);
            addTask(newTask);
            console.log(`Added new task from goal: ${goalTask.title}`);
          }
        });
      },
      
      // Goal actions implementation
      addGoal: (goal) => {
        const newGoalId = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newGoal: Goal = { 
          ...goal, 
          id: newGoalId,
          // 确保必需字段有默认值
          progress: goal.progress ?? 0,
          status: goal.status ?? 'active'
        };
        
        set((state) => ({ goals: [...state.goals, newGoal] }));
        
        // 如果目标有任务，将它们同步到任务库
        if (newGoal.tasks && newGoal.tasks.length > 0) {
          console.log(`目标 "${newGoal.title}" 包含 ${newGoal.tasks.length} 个任务，正在同步到 All Tasks...`);
          
          const { addTask } = get();
          
          newGoal.tasks.forEach(goalTask => {
            // 只处理有标题的任务
            if (goalTask.title.trim() === '') return;
            
            // 将 GoalTask 转换为 Task
            const newTask = goalTaskToTask(goalTask, newGoalId);
            addTask(newTask);
            console.log(`- 已添加任务: "${goalTask.title}"`);
          });
        }
      },
      
      updateGoal: (id, updatedGoal) => {
        const currentGoal = get().goals.find(goal => goal.id === id);
        if (!currentGoal) {
          console.log(`找不到 ID 为 ${id} 的目标，无法更新`);
          return;
        }
        
        console.log(`更新目标: ${id} - ${currentGoal.title}`);
        console.log('更新内容:', updatedGoal);
        
        const newGoal = { ...currentGoal, ...updatedGoal };
        
        set((state) => ({ 
          goals: state.goals.map(goal => 
            goal.id === id ? newGoal : goal
          ) 
        }));
        
        // 如果更新了目标状态为完成，则更新所有关联任务
        if (updatedGoal.status === 'completed') {
          const { tasks, updateTask } = get();
          tasks.forEach(task => {
            if (task.goalId === id && task.status !== 'completed') {
              updateTask(task.id, { status: 'completed' });
              console.log(`目标完成，更新关联任务状态: ${task.id} - ${task.title}`);
            }
          });
        }
        
        // 如果更新了目标的任务列表，同步到任务库
        if (updatedGoal.tasks) {
          const { syncGoalTasksToTaskLibrary } = get();
          syncGoalTasksToTaskLibrary(id);
        }
      },
      
      deleteGoal: (id) => 
        set((state) => ({ 
          goals: state.goals.filter(goal => goal.id !== id),
          // 同时删除与此目标关联的所有任务
          tasks: state.tasks.filter(task => task.goalId !== id)
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