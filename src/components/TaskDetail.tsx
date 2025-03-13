'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Calendar, Flag, MessageSquare, CheckCircle } from 'lucide-react';
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
 * Props for the TaskDetail component
 */
interface TaskDetailProps {
  task: Task;                  // The task to display and edit
  onClose: () => void;         // Function to call when closing the detail view
  onUpdate: (task: Task) => void; // Function to call when updating the task
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
    const today = new Date().toISOString().split('T')[0];
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
              <div className="relative">
                <button
                  className="flex items-center space-x-2 p-2 border border-gray-300 rounded-md"
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                >
                  <Calendar size={18} />
                  <span>
                    {editedTask.dueDate
                      ? format(parseISO(editedTask.dueDate), 'MMM d, yyyy')
                      : 'Set due date'}
                  </span>
                </button>

                {/* Date picker dropdown */}
                {isDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-10">
                    {/* Simple date picker - in a real app, use a proper date picker component */}
                    <div className="space-y-1">
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
                        onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
                      >
                        Today
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          handleDateChange(tomorrow.toISOString().split('T')[0]);
                        }}
                      >
                        Tomorrow
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
                        onClick={() => {
                          const nextWeek = new Date();
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          handleDateChange(nextWeek.toISOString().split('T')[0]);
                        }}
                      >
                        Next Week
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
                        onClick={() => handleDateChange('')}
                      >
                        No Date
                      </button>
                    </div>
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

          {/* Related Goal selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Goal
            </label>
            <div className="relative">
              <button
                className="flex items-center justify-between w-full p-2 border border-gray-300 rounded-md"
                onClick={() => setIsGoalSelectorOpen(!isGoalSelectorOpen)}
              >
                <span>
                  {selectedGoal ? selectedGoal.title : 'Select a goal'}
                </span>
                <span className="text-gray-400">▼</span>
              </button>

              {/* Goal selector dropdown */}
              {isGoalSelectorOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-10 max-h-[200px] overflow-y-auto">
                  <div className="space-y-1">
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
                      onClick={() => handleGoalSelect(undefined)}
                    >
                      No Goal
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
                </div>
              )}
            </div>
          </div>

          {/* Feedback section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Feedback
            </label>
            <div className="space-y-2">
              {/* Feedback input */}
              <div className="flex">
                <textarea
                  className="flex-1 p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Add your feedback about this task..."
                />
                <button
                  className="px-4 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  onClick={handleSubmitFeedback}
                >
                  <MessageSquare size={20} />
                </button>
              </div>

              {/* Feedback history list */}
              {editedTask.feedback && editedTask.feedback.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Feedback History</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {editedTask.feedback.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">{item}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {/* In a real app, store timestamps with feedback */}
                          {format(new Date(), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Contains save button */}
        <div className="p-4 border-t flex justify-end">
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