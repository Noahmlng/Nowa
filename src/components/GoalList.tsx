'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Target } from 'lucide-react';
import { useAppStore } from '@/store/store';

/**
 * Goal interface - Represents a goal in the application
 * This should match the Goal interface in the store
 */
interface Goal {
  id: string;
  title: string;
  description?: string;
  category?: string;
  progress: number;
  status: 'active' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  finishDate?: string;
}

/**
 * GoalList Component
 * 
 * Displays a list of user goals with progress tracking.
 * Allows adding new goals, editing existing goals, and tracking progress.
 * Provides a modal interface for detailed goal editing.
 */
export default function GoalList() {
  // Get goals and goal actions from the global store
  const { goals, addGoal, updateGoal, deleteGoal, updateGoalProgress } = useAppStore();
  
  // Local state
  const [newGoalTitle, setNewGoalTitle] = useState(''); // For the new goal input
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null); // Currently editing goal
  const [isEditing, setIsEditing] = useState(false); // Whether the edit modal is open

  /**
   * Handle adding a new goal
   * Creates a goal with the entered title and default values
   */
  const handleAddGoal = () => {
    if (newGoalTitle.trim()) {
      addGoal({
        title: newGoalTitle.trim(),
        description: '',
        progress: 0,
        status: 'active',
      });
      
      setNewGoalTitle(''); // Clear the input after adding
    }
  };

  /**
   * Open the edit modal for a specific goal
   */
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsEditing(true);
  };

  /**
   * Update a goal with new values from the edit modal
   */
  const handleUpdateGoal = (updatedGoal: Goal) => {
    updateGoal(updatedGoal.id, updatedGoal);
    setIsEditing(false);
    setEditingGoal(null);
  };

  /**
   * Cancel the goal editing process and close the modal
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingGoal(null);
  };

  /**
   * Update the progress of a goal using the progress slider
   */
  const handleProgressChange = (goalId: string, progress: number) => {
    updateGoalProgress(goalId, progress);
  };

  return (
    <div className="space-y-8">
      {/* Add new goal input */}
      <div className="flex items-center space-x-2 mb-6">
        <input
          type="text"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a new goal..."
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
        />
        <button
          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={handleAddGoal}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Goals list - displays all goals or an empty state */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          // Empty state when no goals exist
          <div className="text-center py-8">
            <Target size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No goals yet. Add your first goal to get started!</p>
          </div>
        ) : (
          // Map through and display each goal
          goals.map(goal => (
            <div 
              key={goal.id} 
              className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              {/* Goal header with title and action buttons */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{goal.title}</h3>
                <div className="flex space-x-1">
                  <button
                    className="p-1 text-gray-400 hover:text-blue-600"
                    onClick={() => handleEditGoal(goal)}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-red-600"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {/* Goal description (if available) */}
              {goal.description && (
                <p className="text-gray-600 mb-3">{goal.description}</p>
              )}
              
              {/* Progress bar visualization */}
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(goal.progress * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${goal.progress * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Goal footer with category and progress slider */}
              <div className="flex justify-between items-center mt-4">
                {goal.category && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {goal.category}
                  </span>
                )}
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={goal.progress * 100}
                  onChange={(e) => handleProgressChange(goal.id, Number(e.target.value) / 100)}
                  className="w-1/2"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit goal modal - appears when editing a goal */}
      {isEditing && editingGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Edit Goal</h2>
            
            <div className="space-y-4">
              {/* Title input field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                />
              </div>
              
              {/* Description textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingGoal.description || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                />
              </div>
              
              {/* Category input field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingGoal.category || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, category: e.target.value })}
                  placeholder="e.g. Health, Career, Personal"
                />
              </div>
              
              {/* Progress slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress ({Math.round(editingGoal.progress * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingGoal.progress * 100}
                  onChange={(e) => setEditingGoal({ ...editingGoal, progress: Number(e.target.value) / 100 })}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Modal action buttons */}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => handleUpdateGoal(editingGoal)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 