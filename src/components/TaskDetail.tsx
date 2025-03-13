'use client';

import { useState, useEffect, useRef } from 'react';
import { format, parseISO, addDays, isValid } from 'date-fns';
import { X, Calendar, Flag, MessageSquare, CheckCircle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/store';
import { formatDateDisplay } from '@/utils/dateUtils';

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
 * Props for the TaskDetail component
 */
interface TaskDetailProps {
  task: Task;                  // The task to display and edit
  onClose: () => void;         // Function to call when closing the detail view
  onUpdate: (task: Task) => void; // Function to call when updating the task
}

/**
 * DatePicker Component
 * 增强的日期选择器组件，支持日历视图选择日期
 */
function DatePicker({ 
  currentDate, 
  onDateSelect, 
  onClose 
}: { 
  currentDate?: string; 
  onDateSelect: (date: string) => void; 
  onClose: () => void;
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    currentDate && isValid(parseISO(currentDate))
      ? parseISO(currentDate)
      : today
  );
  
  // 获取当前月份的第一天
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  
  // 获取当前月份的天数
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  
  // 获取当前月份第一天是星期几（0 = 星期日，1 = 星期一，...）
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // 调整为从星期一开始（1 = 星期一，...，0 = 星期日）
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  // 构建日期网格
  const days = [];
  
  // 添加上个月的最后几天
  for (let i = 0; i < adjustedFirstDay; i++) {
    const prevMonthDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), -adjustedFirstDay + i + 1);
    days.push({ date: prevMonthDay, isCurrentMonth: false });
  }
  
  // 添加当前月份的所有天
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
    days.push({ date, isCurrentMonth: true });
  }
  
  // 添加下个月的前几天以填满网格
  const remainingDays = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonthDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, i);
    days.push({ date: nextMonthDay, isCurrentMonth: false });
  }
  
  // 判断日期是否是今天
  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };
  
  // 判断日期是否是当前选择的日期
  const isSelected = (date: Date) => {
    if (!currentDate) return false;
    const selected = parseISO(currentDate);
    return date.getDate() === selected.getDate() &&
           date.getMonth() === selected.getMonth() &&
           date.getFullYear() === selected.getFullYear();
  };
  
  // 前一个月
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  
  // 下一个月
  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72">
      {/* 月份导航 */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
          aria-label="上个月"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-medium">
          {format(viewDate, 'yyyy年 MM月')}
        </h3>
        <button 
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
          aria-label="下个月"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      {/* 星期标题 */}
      <div className="grid grid-cols-7 mb-2">
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, isCurrentMonth }, index) => (
          <button
            key={index}
            onClick={() => {
              onDateSelect(date.toISOString());
              onClose();
            }}
            className={`
              h-8 w-8 flex items-center justify-center rounded-full text-sm
              ${isToday(date) ? 'bg-blue-100 text-blue-700 font-bold' : ''}
              ${isSelected(date) ? 'bg-blue-500 text-white' : ''}
              ${!isCurrentMonth ? 'text-gray-400' : ''}
              ${isCurrentMonth && !isToday(date) && !isSelected(date) ? 'hover:bg-gray-100' : ''}
            `}
            disabled={!isCurrentMonth}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
      
      {/* 快捷选项 */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="space-y-1">
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center"
            onClick={() => {
              onDateSelect(today.toISOString());
              onClose();
            }}
          >
            <span className="w-5 h-5 mr-2 flex items-center justify-center">
              <Calendar size={16} className="text-blue-600" />
            </span>
            今天
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center"
            onClick={() => {
              onDateSelect(addDays(today, 1).toISOString());
              onClose();
            }}
          >
            <span className="w-5 h-5 mr-2 flex items-center justify-center">
              <Calendar size={16} className="text-green-600" />
            </span>
            明天
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center"
            onClick={() => {
              onDateSelect(addDays(today, 7).toISOString());
              onClose();
            }}
          >
            <span className="w-5 h-5 mr-2 flex items-center justify-center">
              <Calendar size={16} className="text-purple-600" />
            </span>
            下周
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center"
            onClick={() => {
              onDateSelect('');
              onClose();
            }}
          >
            <span className="w-5 h-5 mr-2 flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </span>
            无日期
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * TaskDetail Component
 * 
 * Provides a detailed view and editing interface for a single task.
 * Allows editing task properties including title, description, due date,
 * priority, and associated goal. Also provides feedback functionality.
 */
export default function TaskDetail({ task, onClose, onUpdate }: TaskDetailProps) {
  const { addTaskFeedback, goals } = useAppStore();
  
  // Local state
  const [editedTask, setEditedTask] = useState<Task>({ ...task }); // Copy of task for editing
  const [feedback, setFeedback] = useState(''); // New feedback text
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false); // Controls date picker visibility
  const [isGoalSelectorOpen, setIsGoalSelectorOpen] = useState(false); // Controls goal selector visibility
  
  // Reference to the date picker container for outside click detection
  const datePickerRef = useRef<HTMLDivElement>(null);

  /**
   * 点击事件监听，用于检测点击日期选择器外部时关闭选择器
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    
    // 添加事件监听
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // 清理事件监听
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Handle changes to input fields
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedTask({ ...editedTask, [name]: value });
  };

  /**
   * Update the task priority
   */
  const handlePriorityChange = (priority: 'low' | 'medium' | 'high') => {
    setEditedTask({ ...editedTask, priority });
  };

  /**
   * Update the task due date
   */
  const handleDateChange = (date: string) => {
    console.log(`Setting due date: ${date}`);
    setEditedTask({ ...editedTask, dueDate: date });
    setIsDatePickerOpen(false);
  };

  /**
   * Add feedback to the task
   */
  const handleSubmitFeedback = () => {
    if (feedback.trim()) {
      addTaskFeedback(task.id, feedback);
      setFeedback('');
    }
  };

  /**
   * Set the task due date to today
   */
  const handleAddToToday = () => {
    const today = new Date().toISOString();
    setEditedTask({ ...editedTask, dueDate: today });
    onUpdate({ ...editedTask, dueDate: today });
  };

  /**
   * Save changes to the task
   */
  const handleSave = () => {
    onUpdate(editedTask);
  };

  /**
   * Toggle the completion status of the task
   */
  const handleToggleComplete = () => {
    const newStatus = editedTask.status === 'completed' ? 'pending' : 'completed';
    setEditedTask({ ...editedTask, status: newStatus });
    onUpdate({ ...editedTask, status: newStatus });
  };

  /**
   * Associate the task with a goal
   */
  const handleGoalSelect = (goalId: string | undefined) => {
    setEditedTask({ ...editedTask, goalId });
    setIsGoalSelectorOpen(false);
  };

  /**
   * Auto-save when task is edited after a delay
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (JSON.stringify(task) !== JSON.stringify(editedTask)) {
        onUpdate(editedTask);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [editedTask, onUpdate, task]);

  // Get the selected goal if any
  const selectedGoal = editedTask.goalId 
    ? goals.find(goal => goal.id === editedTask.goalId) 
    : undefined;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Contains task title and completion toggle */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <button
              className="mr-3 text-gray-400 hover:text-blue-600"
              onClick={handleToggleComplete}
            >
              {editedTask.status === 'completed' ? (
                <CheckCircle className="text-green-500" size={24} />
              ) : (
                <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
              )}
            </button>
            <input
              type="text"
              name="title"
              className="text-xl font-semibold focus:outline-none"
              value={editedTask.title}
              onChange={handleChange}
              placeholder="Task title"
            />
          </div>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
            title="关闭"
            aria-label="关闭"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Main task editing area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Description field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              value={editedTask.description || ''}
              onChange={handleChange}
              placeholder="Add a description..."
            />
          </div>

          {/* Due date selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <div className="flex items-center">
              <div className="relative" ref={datePickerRef}>
                <button
                  className="flex items-center space-x-2 p-2 border border-gray-300 rounded-md"
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                >
                  <Calendar size={18} className="text-blue-600" />
                  <span className={editedTask.dueDate ? 'text-gray-700' : 'text-gray-400'}>
                    {editedTask.dueDate
                      ? formatDateDisplay(editedTask.dueDate)
                      : 'Set due date'}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>

                {/* 增强的日期选择器 */}
                {isDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <DatePicker 
                      currentDate={editedTask.dueDate} 
                      onDateSelect={handleDateChange}
                      onClose={() => setIsDatePickerOpen(false)}
                    />
                  </div>
                )}
              </div>

              {/* Quick "Add to Today" button */}
              {!editedTask.dueDate && (
                <button
                  className="ml-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  onClick={handleAddToToday}
                >
                  Add to Today
                </button>
              )}
            </div>
          </div>

          {/* Priority selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <div className="flex space-x-2">
              <button
                className={`px-3 py-2 rounded-md flex items-center space-x-1 ${
                  editedTask.priority === 'low'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handlePriorityChange('low')}
              >
                <Flag size={16} />
                <span>Low</span>
              </button>
              <button
                className={`px-3 py-2 rounded-md flex items-center space-x-1 ${
                  editedTask.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handlePriorityChange('medium')}
              >
                <Flag size={16} />
                <span>Medium</span>
              </button>
              <button
                className={`px-3 py-2 rounded-md flex items-center space-x-1 ${
                  editedTask.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handlePriorityChange('high')}
              >
                <Flag size={16} />
                <span>High</span>
              </button>
            </div>
          </div>

          {/* Associated goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Associated Goal
            </label>
            <div className="relative">
              <button
                className="w-full flex justify-between items-center p-2 border border-gray-300 rounded-md"
                onClick={() => setIsGoalSelectorOpen(!isGoalSelectorOpen)}
              >
                <span className={selectedGoal ? 'text-gray-700' : 'text-gray-400'}>
                  {selectedGoal ? selectedGoal.title : 'Select a goal'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Goal selector dropdown */}
              {isGoalSelectorOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-10 max-h-40 overflow-y-auto">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
                    onClick={() => handleGoalSelect(undefined)}
                  >
                    No goal
                  </button>
                  {goals.map(goal => (
                    <button
                      key={goal.id}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md ${
                        editedTask.goalId === goal.id ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => handleGoalSelect(goal.id)}
                    >
                      {goal.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feedback section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback
            </label>
            {task.feedback && task.feedback.length > 0 ? (
              <div className="border border-gray-200 rounded-md mb-2">
                <ul className="divide-y divide-gray-200">
                  {task.feedback.map((item, index) => (
                    <li key={index} className="p-3">
                      <p className="text-sm text-gray-700">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2">No feedback yet.</p>
            )}

            {/* Add new feedback */}
            <div className="flex">
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitFeedback()}
              />
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                onClick={handleSubmitFeedback}
                title="提交反馈"
                aria-label="提交反馈"
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Contains save and cancel buttons */}
        <div className="flex justify-end space-x-2 p-4 border-t">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 