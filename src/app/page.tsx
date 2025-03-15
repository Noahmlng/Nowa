'use client'; // This directive enables client-side rendering for this component

import { format } from 'date-fns';
import { useState } from 'react';
import { useAppStore } from '@/store/store';
import TaskList from '@/components/TaskList';
import EnhancedGoalList from '@/components/EnhancedGoalList';
import Sidebar from '@/components/Sidebar';
import DailySummary from '@/components/DailySummary';
import { BarChart2, Calendar } from 'lucide-react';

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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryType, setSummaryType] = useState<'yesterday' | 'today'>('yesterday');
  
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
  
  // Open summary modal with the specified type
  const openSummary = (type: 'yesterday' | 'today') => {
    setSummaryType(type);
    setSummaryOpen(true);
  };

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
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-medium">
              {selectedList === 'goals' ? 'Goals' : 
               selectedList === 'today' ? 'My Day' : 
               selectedList === 'important' ? 'Important' : 
               selectedList === 'all' ? 'Tasks' : 
               currentList}
            </h1>
            
            {/* Summary buttons - only show for My Day */}
            {selectedList === 'today' && (
              <div className="flex space-x-2">
                <button 
                  onClick={() => openSummary('yesterday')}
                  className="flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <Calendar size={14} className="mr-1" />
                  昨日总结
                </button>
                <button 
                  onClick={() => openSummary('today')}
                  className="flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                >
                  <BarChart2 size={14} className="mr-1" />
                  评估今天
                </button>
              </div>
            )}
          </div>
          {selectedList === 'today' && (
            <p className={`text-sm mt-1 ${theme.text}`}>{todayFormatted}</p>
          )}
        </header>
        
        {/* Page content */}
        <div className="flex-1 px-6 pt-3">
          {selectedList === 'goals' ? (
            <EnhancedGoalList />
          ) : (
            <TaskList filter={selectedList} />
          )}
        </div>
      </div>
      
      {/* Daily Summary Modal */}
      <DailySummary 
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        summaryType={summaryType}
      />
    </main>
  );
} 