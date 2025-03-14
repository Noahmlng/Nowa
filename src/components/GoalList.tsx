'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, Calendar, CheckCircle2, Circle, Target, ArrowDown } from 'lucide-react';
import GoalDetail from '@/components/GoalDetail';
import { useAppStore } from '@/store/store';
import { format, parseISO } from 'date-fns';

/**
 * Goal interface - Represents a goal in the application
 * This should match the Goal interface in the store
 */
interface Goal {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  progress: number;
  status: 'active' | 'completed' | 'cancelled';
  taskIds: string[];
}

/**
 * KeyResult interface - Represents a key result for a goal
 */
interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  status: 'pending' | 'completed';
}

/**
 * GoalList Component
 * 
 * Displays a list of goals, allows creating new goals and opening goal details.
 */
export default function GoalList() {
  // Get goals and goal actions from the global store
  const { 
    goals, 
    keyResults, 
    addGoal, 
    deleteGoal, 
    addKeyResult, 
    toggleKeyResultComplete, 
    deleteKeyResult,
    updateKeyResult,
    updateGoal
  } = useAppStore();
  
  // Local state
  const [newGoalTitle, setNewGoalTitle] = useState(''); // For the new goal input
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null); // Currently selected goal for showing details
  const [isDetailOpen, setIsDetailOpen] = useState(false); // Whether the goal detail modal is open
  const [newKeyResultTitle, setNewKeyResultTitle] = useState<{[goalId: string]: string}>({});
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalTitle, setEditingGoalTitle] = useState('');
  const [editingKeyResultId, setEditingKeyResultId] = useState<string | null>(null);
  const [editingKeyResultTitle, setEditingKeyResultTitle] = useState('');
  
  // Refs for focus management
  const goalTitleInputRef = useRef<HTMLInputElement>(null);
  const keyResultInputRef = useRef<HTMLInputElement>(null);
  
  // Focus title input when editing mode is activated
  useEffect(() => {
    if (editingGoalId && goalTitleInputRef.current) {
      goalTitleInputRef.current.focus();
    }
  }, [editingGoalId]);
  
  // Focus key result input when editing mode is activated
  useEffect(() => {
    if (editingKeyResultId && keyResultInputRef.current) {
      keyResultInputRef.current.focus();
    }
  }, [editingKeyResultId]);

  /**
   * Handle adding a new goal
   * Creates a goal with the entered title and default values
   */
  const handleAddGoal = () => {
    if (newGoalTitle.trim()) {
      addGoal({
        title: newGoalTitle.trim(),
        progress: 0,
        status: 'active',
        taskIds: [],
      });
      
      setNewGoalTitle(''); // Clear the input after adding
    }
  };

  /**
   * Handle adding a new key result to a goal
   */
  const handleAddKeyResult = (goalId: string) => {
    const title = newKeyResultTitle[goalId]?.trim();
    if (title) {
      addKeyResult({
        goalId,
        title,
        status: 'pending',
      });
      
      // Clear the input after adding
      setNewKeyResultTitle({
        ...newKeyResultTitle,
        [goalId]: ''
      });
    }
  };

  /**
   * Open the goal detail modal for a specific goal
   */
  const handleOpenDetail = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsDetailOpen(true);
  };

  /**
   * Close the goal detail modal
   */
  const handleCloseDetail = () => {
    setSelectedGoal(null);
    setIsDetailOpen(false);
  };

  /**
   * Get key results for a specific goal
   */
  const getGoalKeyResults = (goalId: string) => {
    return keyResults.filter(kr => kr.goalId === goalId);
  };
  
  /**
   * Start editing a goal title
   */
  const handleStartEditingGoal = (goal: Goal, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening goal detail
    setEditingGoalId(goal.id);
    setEditingGoalTitle(goal.title);
  };
  
  /**
   * Save edited goal title
   */
  const handleSaveGoalTitle = () => {
    if (editingGoalId && editingGoalTitle.trim()) {
      updateGoal(editingGoalId, { title: editingGoalTitle });
      setEditingGoalId(null);
    }
  };
  
  /**
   * Start editing a key result title
   */
  const handleStartEditingKeyResult = (keyResult: KeyResult, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening goal detail
    setEditingKeyResultId(keyResult.id);
    setEditingKeyResultTitle(keyResult.title);
  };
  
  /**
   * Save edited key result title
   */
  const handleSaveKeyResultTitle = () => {
    if (editingKeyResultId && editingKeyResultTitle.trim()) {
      updateKeyResult(editingKeyResultId, { title: editingKeyResultTitle });
      setEditingKeyResultId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto pb-20">
        <ul className="space-y-3">
          {goals.length > 0 ? (
            goals.map(goal => {
              const goalKeyResults = getGoalKeyResults(goal.id);
              return (
                <li 
                  key={goal.id}
                  className="rounded-lg bg-white shadow hover:shadow-md transition-shadow overflow-hidden relative cursor-pointer group"
                  onClick={() => handleOpenDetail(goal)}
                >
                  {/* Progress background overlay */}
                  <div 
                    className="absolute inset-0 bg-purple-50 pointer-events-none" 
                    style={{ width: `${goal.progress}%` }}
                  />
                  
                  {/* Goal card content - above the background */}
                  <div className="relative p-3.5">
                    {/* Goal title and action buttons */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 group">
                        <div className="flex items-start">
                          {/* 移除完成标记 */}
                          
                          {editingGoalId === goal.id ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <input
                                ref={goalTitleInputRef}
                                type="text"
                                className="w-full text-base font-medium border-b border-purple-500 focus:outline-none py-1 px-0"
                                value={editingGoalTitle}
                                onChange={(e) => setEditingGoalTitle(e.target.value)}
                                onBlur={handleSaveGoalTitle}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault(); // 阻止默认行为，防止表单提交
                                    handleSaveGoalTitle();
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div>
                              <h3 
                                className="text-base font-medium text-gray-900 hover:bg-gray-100 py-1 px-2 rounded cursor-text group-hover:bg-gray-100"
                                onClick={(e) => handleStartEditingGoal(goal, e)}
                              >
                                {goal.title}
                              </h3>
                              {goal.description && (
                                <p className="text-sm text-gray-600 mt-0.5">{goal.description}</p>
                              )}
                              {goal.dueDate && (
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  <Calendar size={12} className="mr-1" />
                                  <span>{format(parseISO(goal.dueDate), 'MMMM d, yyyy')}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-1 shrink-0">
                        <div className="text-xs font-medium text-purple-700 mr-2 flex items-center">
                          {goalKeyResults.filter(kr => kr.status === 'completed').length}/{goalKeyResults.length} 完成
                        </div>
                        {/* 移除编辑按钮，只保留删除按钮 */}
                        <button
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening goal detail
                            deleteGoal(goal.id);
                          }}
                          title="删除目标"
                        >
                          <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Key Results section - only shown if there are key results */}
                    <div className="mt-3">
                      {/* Key Results list */}
                      {goalKeyResults.length > 0 && (
                        <ul className="space-y-1.5 mt-1.5">
                          {goalKeyResults.map(kr => (
                            <li 
                              key={kr.id} 
                              className="flex items-center group"
                              onClick={(e) => e.stopPropagation()} // Prevent opening goal detail
                            >
                              <button
                                className="mr-2 flex-shrink-0"
                                onClick={() => toggleKeyResultComplete(kr.id)}
                                title={kr.status === 'completed' ? "标记为未完成" : "标记为已完成"}
                              >
                                {kr.status === 'completed' ? (
                                  <CheckCircle2 size={16} className="text-green-500" />
                                ) : (
                                  <Circle size={16} className="text-gray-400" />
                                )}
                              </button>
                              
                              {editingKeyResultId === kr.id ? (
                                <div className="flex-1">
                                  <input
                                    ref={keyResultInputRef}
                                    type="text"
                                    className="w-full border-b border-purple-500 focus:outline-none py-1 px-0 text-sm"
                                    value={editingKeyResultTitle}
                                    onChange={(e) => setEditingKeyResultTitle(e.target.value)}
                                    onBlur={handleSaveKeyResultTitle}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault(); // 阻止默认行为，防止表单提交
                                        handleSaveKeyResultTitle();
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <span 
                                  className={`flex-1 text-sm ${kr.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-700'} hover:bg-gray-100 py-1 px-2 rounded cursor-text`}
                                  onClick={(e) => handleStartEditingKeyResult(kr, e)}
                                >
                                  {kr.title}
                                </span>
                              )}
                              
                              <button
                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    console.log("Deleting key result:", kr.id);
                                    deleteKeyResult(kr.id);
                                  } catch (error) {
                                    console.error("Error deleting key result:", error);
                                  }
                                }}
                                title="删除子目标"
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {/* New add key result control that looks like an inactive key result */}
                      <div 
                        className={`h-0 opacity-0 group-hover:opacity-100 group-hover:h-auto group-hover:mt-1.5 transition-all duration-200 overflow-hidden`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {newKeyResultTitle[goal.id] ? (
                          <div className="flex items-center">
                            <Circle size={16} className="text-gray-300 mr-2 flex-shrink-0" />
                            <input
                              type="text"
                              className="flex-1 border-b border-gray-300 focus:outline-none focus:border-purple-500 py-1 px-0 text-sm bg-transparent"
                              placeholder="输入新的子目标..."
                              value={newKeyResultTitle[goal.id] || ''}
                              onChange={(e) => setNewKeyResultTitle({
                                ...newKeyResultTitle,
                                [goal.id]: e.target.value
                              })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault(); // 阻止默认行为，防止表单提交
                                  handleAddKeyResult(goal.id);
                                }
                              }}
                              onBlur={() => {
                                if (!newKeyResultTitle[goal.id]?.trim()) {
                                  setNewKeyResultTitle({
                                    ...newKeyResultTitle,
                                    [goal.id]: ''
                                  });
                                }
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div 
                            className="flex items-center cursor-pointer"
                            onClick={() => setNewKeyResultTitle({
                              ...newKeyResultTitle,
                              [goal.id]: ' ' // Set to space to trigger input mode
                            })}
                          >
                            <Circle size={16} className="text-gray-300 mr-2 flex-shrink-0" />
                            <span className="flex-1 text-sm text-gray-400 py-1 px-2 hover:bg-gray-100 rounded">
                              新的子目标
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow flex flex-col items-center">
              <Target size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">暂无目标</p>
              <div className="flex items-center text-sm text-purple-500">
                <ArrowDown size={16} className="mr-1 animate-bounce" />
                <span>在下方添加你的第一个目标</span>
              </div>
            </div>
          )}
        </ul>
      </div>

      {/* Add new goal input - fixed at the bottom */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-purple-100 shadow-md p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm text-sm"
              placeholder="添加新目标..."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // 阻止默认行为，防止表单提交
                  handleAddGoal();
                }
              }}
            />
            <button
              className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-sm transition-colors"
              onClick={handleAddGoal}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Goal detail modal - opens when a goal is selected */}
      {selectedGoal && (
        <GoalDetail
          goal={selectedGoal}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
} 