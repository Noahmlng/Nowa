'use client';

import { useState, useEffect } from 'react';
import { X, Check, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/store';

interface TaskSuggestionsProps {
  taskId: string;
  onClose: () => void;
}

// Match the Subtask interface from the store
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * TaskSuggestions Component
 * 
 * Displays AI-generated task suggestions when the AI button is clicked.
 * Allows users to select a suggestion and see a detailed plan.
 */
export default function TaskSuggestions({ taskId, onClose }: TaskSuggestionsProps) {
  const { tasks, userProfile, updateTask, addTaskFeedback } = useAppStore();
  
  // Find the target task
  const task = tasks.find(t => t.id === taskId);
  
  // States
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [detailedPlan, setDetailedPlan] = useState<{
    title: string;
    description: string;
    subtasks: Subtask[];
  } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  
  // Load suggestions when component mounts
  useEffect(() => {
    if (!task) {
      setLoading(false);
      return;
    }
    
    // Find the most recent feedback if available (mimic what's in the example)
    // In a real implementation, you'd query for actual recent feedback
    let recentFeedback: string | undefined;
    if (task.title.toLowerCase().includes('exercise') || 
        task.title.toLowerCase().includes('workout') || 
        task.title.toLowerCase().includes('run') || 
        task.title.toLowerCase().includes('training')) {
      recentFeedback = "In the last workout, there was right leg hip joint pain and tight right thigh muscles.";
    }
    
    const loadSuggestions = async () => {
      try {
        // Call the API route
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskTitle: task.title,
            userProfile,
            recentFeedback
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to load suggestions');
        }
        
        const data = await response.json();
        setSuggestions(data.suggestions);
      } catch (error) {
        console.error('Error loading suggestions:', error);
        setSuggestions([
          'Recovery-focused training to address your hip discomfort',
          'Combined cardio and strength workout targeting core muscles',
          'Gradual endurance building with low-impact exercises'
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadSuggestions();
  }, [task, userProfile]);
  
  // Handle selecting a suggestion
  const handleSelectSuggestion = async (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    setLoadingPlan(true);
    
    try {
      if (!task) return;
      
      // Find the most recent feedback if available (same as above)
      let recentFeedback: string | undefined;
      if (task.title.toLowerCase().includes('exercise') || 
          task.title.toLowerCase().includes('workout') || 
          task.title.toLowerCase().includes('run') || 
          task.title.toLowerCase().includes('training')) {
        recentFeedback = "In the last workout, there was right leg hip joint pain and tight right thigh muscles.";
      }
      
      // Call the API route
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskTitle: task.title,
          selectedSuggestion: suggestion,
          userProfile,
          recentFeedback
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to load detailed plan');
      }
      
      const plan = await response.json();
      setDetailedPlan(plan);
    } catch (error) {
      console.error('Error loading detailed plan:', error);
      
      // Create fallback subtasks with proper IDs
      const fallbackSubtasks: Subtask[] = [
        { 
          id: `subtask-${Date.now()}-1`, 
          title: 'Warm up for 5 minutes', 
          completed: false 
        },
        { 
          id: `subtask-${Date.now()}-2`, 
          title: 'Complete main activity (20 minutes)', 
          completed: false 
        },
        { 
          id: `subtask-${Date.now()}-3`, 
          title: 'Cool down and stretch (5 minutes)', 
          completed: false 
        }
      ];
      
      setDetailedPlan({
        title: task?.title || 'Exercise Plan',
        description: suggestion,
        subtasks: fallbackSubtasks
      });
    } finally {
      setLoadingPlan(false);
    }
  };
  
  // Handle applying the selected plan
  const handleApplyPlan = () => {
    if (!task || !detailedPlan) return;
    
    // Update the task with subtasks and description
    updateTask(task.id, {
      description: task.description 
        ? `${task.description}\n\n${detailedPlan.description}`
        : detailedPlan.description,
      subtasks: [
        ...(task.subtasks || []),
        ...detailedPlan.subtasks
      ]
    });
    
    // Add feedback record
    addTaskFeedback(task.id, `Applied AI-suggested plan: ${selectedSuggestion}`);
    
    // Close the suggestions panel
    onClose();
  };
  
  // Handle declining the plan
  const handleDecline = () => {
    onClose();
  };
  
  // If task doesn't exist, don't show anything
  if (!task) return null;
  
  return (
    <>
      {/* Suggestions Bubbles */}
      {!selectedSuggestion && (
        <div className="absolute right-8 top-0 bg-white shadow-lg rounded-lg p-4 max-w-xs w-64 z-50 animate-fadeIn">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">AI 建议</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 border border-gray-200 transition-colors"
                >
                  {suggestion}
                  <ChevronRight className="inline-block ml-2 h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Detailed Plan Panel */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/30" 
            onClick={handleDecline}
          />
          
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">任务计划</h2>
                  <button 
                    onClick={handleDecline}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-600">{selectedSuggestion}</p>
              </div>
              
              {/* Content */}
              <div className="flex-1 p-4 overflow-y-auto">
                {loadingPlan ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : detailedPlan ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-800">描述</h3>
                      <p className="mt-1 text-sm text-gray-600">{detailedPlan.description}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-800">子任务</h3>
                      <ul className="mt-2 space-y-2">
                        {detailedPlan.subtasks.map((subtask, index) => (
                          <li key={index} className="flex items-start gap-2 p-2 border border-gray-200 rounded-md">
                            <div className="flex-shrink-0 pt-0.5">
                              <div className="h-5 w-5 rounded-full border border-gray-300"></div>
                            </div>
                            <span className="text-sm">{subtask.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">加载计划详情失败</p>
                )}
              </div>
              
              {/* Footer with buttons */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDecline}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleApplyPlan}
                    disabled={loadingPlan || !detailedPlan}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    应用
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 