'use client';

import { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  ListTodo, 
  Target, 
  Plus,
  Settings
} from 'lucide-react';
import { useAppStore } from '@/store/store';

/**
 * Props for the Sidebar component
 */
interface SidebarProps {
  selectedList: string;           // Currently selected list ID
  setSelectedList: (list: string) => void; // Function to change the selected list
}

/**
 * Sidebar Component
 * 
 * Provides navigation for the application, displaying default lists,
 * custom user-created lists, and controls for creating new lists.
 * Allows users to switch between different views (Today, All Tasks, etc.)
 */
export default function Sidebar({ selectedList, setSelectedList }: SidebarProps) {
  const { taskLists, addTaskList } = useAppStore();
  
  // Local state
  const [isAddingList, setIsAddingList] = useState(false); // Controls new list input visibility
  const [newListName, setNewListName] = useState(''); // New list name input value

  /**
   * Default navigation lists that are always present
   * These are not stored in the database but are hardcoded
   */
  const defaultLists = [
    { id: 'today', name: 'Today', icon: <Calendar size={20} /> },
    { id: 'goals', name: 'My Goals', icon: <Target size={20} /> },
    { id: 'all', name: 'All Tasks', icon: <ListTodo size={20} /> },
    { id: 'completed', name: 'Completed', icon: <CheckCircle2 size={20} /> },
  ];

  /**
   * Filter out custom lists (user-created) from the default lists
   */
  const customLists = taskLists.filter(list => 
    !['today', 'all', 'completed', 'goals'].includes(list.id)
  );

  /**
   * Handle adding a new custom list
   */
  const handleAddList = () => {
    if (newListName.trim()) {
      addTaskList({
        name: newListName.trim(),
        description: '',
      });
      
      setNewListName(''); // Clear the input
      setIsAddingList(false); // Hide the input form
    }
  };

  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-200 p-4 flex flex-col h-full">
      {/* App title and description */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-blue-600">Nowa</h1>
        <p className="text-sm text-gray-500">AI-powered Todo App</p>
      </div>
      
      <nav className="flex-1">
        {/* Default lists section */}
        <ul className="space-y-1">
          {defaultLists.map((list) => (
            <li key={list.id}>
              <button
                className={`w-full text-left px-3 py-2 rounded-md flex items-center space-x-3 ${
                  selectedList === list.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedList(list.id)}
              >
                <span className="text-gray-500">{list.icon}</span>
                <span>{list.name}</span>
              </button>
            </li>
          ))}
        </ul>
        
        {/* Custom lists section - only shown if custom lists exist */}
        {customLists.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              My Lists
            </h3>
            <ul className="space-y-1">
              {customLists.map((list) => (
                <li key={list.id}>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center space-x-3 ${
                      selectedList === list.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedList(list.id)}
                  >
                    <span className="text-gray-500">
                      <ListTodo size={20} />
                    </span>
                    <span>{list.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Add new list section */}
        <div className="mt-4 px-3">
          {isAddingList ? (
            // Form for adding a new list
            <div className="flex flex-col space-y-2">
              <input
                type="text"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md"
                  onClick={handleAddList}
                >
                  Add
                </button>
                <button
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md"
                  onClick={() => setIsAddingList(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Button to show the add list form
            <button
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsAddingList(true)}
            >
              <Plus size={18} />
              <span>New List</span>
            </button>
          )}
        </div>
      </nav>
      
      {/* Footer with settings button */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <button className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2">
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
} 