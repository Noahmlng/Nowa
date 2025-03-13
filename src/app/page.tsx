'use client'; // This directive enables client-side rendering for this component

import { useEffect } from 'react';
import { format } from 'date-fns';
import TaskList from '@/components/TaskList';
import EnhancedGoalList from '@/components/EnhancedGoalList';
import Sidebar from '@/components/Sidebar';
import { useAppStore } from '@/store/store';

/**
 * Home Component - Main application page
 * 
 * This component serves as the main layout for the application, including:
 * - A sidebar for navigation between lists and goals
 * - A dynamic main content area that shows either tasks or goals
 * - A header that displays the current selected list or goal section
 */
export default function Home() {
  // Get state and actions from the global store
  const { 
    tasks, 
    goals, 
    selectedList, 
    setSelectedList 
  } = useAppStore();

  // Log for debugging
  useEffect(() => {
    console.log("Current selected list:", selectedList);
  }, [selectedList]);

  return (
    <div className="flex h-screen">
      {/* Sidebar navigation */}
      <Sidebar 
        selectedList={selectedList}
        setSelectedList={setSelectedList}
      />
      
      {/* Main content area */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header with dynamic title based on selected list */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              {selectedList === 'today' 
                ? `Today - ${format(new Date(), 'EEEE, MMMM d')}` // Format today's date
                : selectedList === 'goals' 
                  ? 'My Goals' 
                  : selectedList}
            </h1>
          </header>
          
          {/* Main content - conditionally render EnhancedGoalList or TaskList */}
          <main>
            {selectedList === 'goals' ? (
              <EnhancedGoalList />
            ) : (
              <TaskList filter={selectedList} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
} 