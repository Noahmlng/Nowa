'use client'; // This directive enables client-side rendering for this component

import { format } from 'date-fns';
import { useAppStore } from '@/store/store';
import TaskList from '@/components/TaskList';
import GoalList from '@/components/GoalList';
import Sidebar from '@/components/Sidebar';

/**
 * Home Component - Main application page
 * 
 * This component serves as the main layout for the application, including:
 * - A sidebar for navigation between lists and goals
 * - A dynamic main content area that shows either tasks or goals
 * - A header that displays the current selected list or goal section
 */
export default function Home() {
  const { selectedList, taskLists } = useAppStore();
  
  // Calculate today's date in the required format - example: "Friday 14 March"
  const todayFormatted = format(new Date(), 'EEEE d MMMM');
  
  // Find the name of the currently selected list
  const currentList = taskLists.find(list => list.id === selectedList)?.name || '';

  // Generate theme color for the current list
  const getThemeColor = () => {
    switch (selectedList) {
      case 'goals':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-800'
        };
      case 'today':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800'
        };
      case 'important':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800'
        };
      case 'all':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800'
        };
    }
  };

  const theme = getThemeColor();

  return (
    <main className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 shadow-lg z-10">
        <Sidebar />
      </div>
      
      {/* Main content */}
      <div className={`flex-1 flex flex-col ${theme.bg}`}>
        {/* Page header */}
        <header className="px-6 pt-4 pb-3">
          <h1 className="text-xl font-medium">
            {selectedList === 'goals' ? 'Goals' : 
             selectedList === 'today' ? 'My Day' : 
             selectedList === 'important' ? 'Important' : 
             selectedList === 'all' ? 'Tasks' : 
             currentList}
          </h1>
          {selectedList === 'today' && (
            <p className={`text-sm mt-1 ${theme.text}`}>{todayFormatted}</p>
          )}
        </header>
        
        {/* Page content */}
        <div className="flex-1 px-6 pt-3">
          {selectedList === 'goals' ? (
            <GoalList />
          ) : (
            <TaskList filter={selectedList} />
          )}
        </div>
      </div>
    </main>
  );
} 