'use client';

import { useState, useEffect } from 'react';
import { isToday, parseISO } from 'date-fns';
import { 
  Sun, 
  CheckCircle2, 
  Target, 
  Plus,
  Settings,
  Star,
  ListTodo,
  Coffee,
  Music,
  BookOpen,
  Smile,
  Moon,
  Zap,
  X,
  Briefcase,
  User,
  Flag
} from 'lucide-react';
import { useAppStore } from '@/store/store';
import UserProfileModal from './UserProfileModal';

/**
 * Custom icon component for the "All Tasks" section
 */
function HouseWithCheck() {
  return <ListTodo size={18} className="text-green-500" />;
}

/**
 * 用户状态选项
 */
const statusOptions = [
  { id: 'working', label: '工作中', icon: <Zap size={16} className="text-yellow-500" /> },
  { id: 'studying', label: '学习中', icon: <BookOpen size={16} className="text-blue-500" /> },
  { id: 'coffee', label: '喝咖啡', icon: <Coffee size={16} className="text-brown-500" /> },
  { id: 'music', label: '听音乐', icon: <Music size={16} className="text-purple-500" /> },
  { id: 'relaxing', label: '放松中', icon: <Smile size={16} className="text-green-500" /> },
  { id: 'sleeping', label: '睡觉中', icon: <Moon size={16} className="text-indigo-500" /> },
];

/**
 * Sidebar Component
 * 
 * Provides navigation for the application, displaying default lists,
 * custom user-created lists, and controls for creating new lists.
 * Allows users to switch between different views (Today, All Tasks, etc.)
 */
export default function Sidebar() {
  const { taskLists, addTaskList, user, tasks, selectedList, setSelectedList } = useAppStore();
  
  // Local state
  const [isAddingList, setIsAddingList] = useState(false); // Controls new list input visibility
  const [newListName, setNewListName] = useState(''); // New list name input value
  const [userStatus, setUserStatus] = useState<{id: string, label: string, icon: JSX.Element} | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 检查状态是否过期（每天24点自动失效）
  useEffect(() => {
    const storedStatus = localStorage.getItem('userStatus');
    const storedDate = localStorage.getItem('userStatusDate');
    
    if (storedStatus && storedDate) {
      const today = new Date().toDateString();
      if (storedDate === today) {
        // 如果是今天设置的状态，恢复它
        const parsedStatus = JSON.parse(storedStatus);
        const matchedStatus = statusOptions.find(option => option.id === parsedStatus.id);
        if (matchedStatus) {
          setUserStatus(matchedStatus);
        }
      } else {
        // 如果不是今天设置的，清除状态
        localStorage.removeItem('userStatus');
        localStorage.removeItem('userStatusDate');
      }
    }
  }, []);

  // 设置用户状态
  const handleSetStatus = (status: {id: string, label: string, icon: JSX.Element}) => {
    setUserStatus(status);
    setIsStatusModalOpen(false);
    
    // 保存状态和日期到本地存储
    localStorage.setItem('userStatus', JSON.stringify({id: status.id, label: status.label}));
    localStorage.setItem('userStatusDate', new Date().toDateString());
  };

  /**
   * Default navigation lists that are always present
   * These are not stored in the database but are hardcoded
   */
  const defaultLists = [
    { id: 'goals', name: 'My Goals', icon: <Target size={18} className="text-purple-500" /> },
    { id: 'today', name: 'My Day', icon: <Sun size={18} className="text-blue-500" /> },
    { 
      id: 'important', 
      name: 'Important', 
      icon: <Flag size={18} className="text-red-500" /> 
    },
    { id: 'all', name: 'Tasks', icon: <HouseWithCheck /> },
  ];

  /**
   * Filter out custom lists (user-created) from the default lists
   */
  const customLists = taskLists.filter(list => 
    !['today', 'important', 'all', 'completed', 'goals'].includes(list.id)
  );

  /**
   * Calculate the number of incomplete tasks for a list
   */
  const getIncompleteTaskCount = (listId: string) => {
    // 只在 "My Day" 和 "Important" 列表中显示剩余任务数量
    if (listId !== 'today' && listId !== 'important') {
      return null; // 对于其他列表，不显示数量
    }
    
    // 筛选未完成的任务（状态为 pending）
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    
    if (listId === 'today') {
      // 对于 "My Day"，统计截止日期是今天的未完成任务
      return pendingTasks.filter(task => 
        task.dueDate && isToday(parseISO(task.dueDate))
      ).length;
    } else if (listId === 'important') {
      // 对于 "Important"，统计标记为重要的未完成任务
      return pendingTasks.filter(task => task.important).length;
    }
    
    return null; // 默认不显示
  };

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
    <aside className="h-full flex flex-col bg-white">
      {/* User profile section */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">{user.nickname}</h2>
          {userStatus && (
            <div className="ml-2 flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {userStatus.icon}
              <span className="ml-1">{userStatus.label}</span>
            </div>
          )}
        </div>
        
        <div className="flex mt-2">
          {user.tags.map((tag, index) => (
            <span 
              key={index}
              className="mr-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex mt-3 space-x-2">
          <button 
            className="flex items-center text-xs text-gray-500 hover:text-gray-700"
            onClick={() => setIsStatusModalOpen(true)}
          >
            <Flag size={14} className="mr-1" />
            {userStatus ? '更改状态' : '设个状态'}
          </button>
          <button 
            className="flex items-center text-xs text-gray-500 hover:text-gray-700"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <User size={14} className="mr-1" />
            个人资料
          </button>
        </div>
        
        {/* 状态选择模态框 */}
        {isStatusModalOpen && (
          <div className="absolute top-0 left-0 w-full h-screen bg-white z-10">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">设个状态</h3>
                <button 
                  className="p-1 rounded-full hover:bg-gray-100"
                  onClick={() => setIsStatusModalOpen(false)}
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-400">朋友24小时内可见</p>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                {statusOptions.map(status => (
                  <button
                    key={status.id}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => handleSetStatus(status)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      {status.icon}
                    </div>
                    <span className="text-xs text-gray-700">{status.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <nav className="flex-1 pt-4 pb-2 px-3 overflow-y-auto">
        {/* Default lists section */}
        <ul className="space-y-1">
          {defaultLists.map((list) => {
            const count = getIncompleteTaskCount(list.id);
            const isSelected = selectedList === list.id;
            const themeColor = getListThemeColor(list.id);
            
            return (
              <li key={list.id}>
                <button
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center space-x-3 transition-colors ${
                    isSelected
                      ? `${themeColor.bg} ${themeColor.text} font-medium`
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedList(list.id)}
                >
                  <span>{list.icon}</span>
                  <span className="flex-1">{list.name}</span>
                  {count !== null && count > 0 && (
                    <span className={`px-1.5 py-0.5 ${isSelected ? themeColor.countBg : 'bg-gray-100'} text-xs rounded-full font-medium`}>
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        
        {/* Custom lists section - only shown if custom lists exist */}
        {customLists.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-medium text-gray-500 uppercase px-3 mb-2">
              My Lists
            </h3>
            <ul className="space-y-1">
              {customLists.map((list) => {
                const count = getIncompleteTaskCount(list.id);
                const isSelected = selectedList === list.id;
                
                return (
                  <li key={list.id}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center space-x-3 transition-colors ${
                        isSelected
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedList(list.id)}
                    >
                      <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {list.name.charAt(0).toUpperCase()}
                        </span>
                      </span>
                      <span className="flex-1">{list.name}</span>
                      {count !== null && count > 0 && (
                        <span className={`px-1.5 py-0.5 ${isSelected ? 'bg-gray-200' : 'bg-gray-100'} text-xs rounded-full font-medium`}>
                          {count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        {/* Add new list section */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          {isAddingList ? (
            // Form for adding a new list
            <div className="px-3">
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newListName.trim()) {
                    handleAddList();
                  } else if (e.key === 'Escape') {
                    setIsAddingList(false);
                    setNewListName('');
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListName('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAddList}
                  disabled={!newListName.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            // Button to show the add list form
            <button
              className="w-full text-left px-3 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-2"
              onClick={() => setIsAddingList(true)}
            >
              <Plus size={18} />
              <span>New List</span>
            </button>
          )}
        </div>
      </nav>
      
      {/* Bottom actions section */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <button
          className="w-full text-left px-3 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-2"
          onClick={() => {/* Open settings */}}
        >
          <Settings size={18} className="text-gray-500" />
          <span className="text-sm">Settings</span>
        </button>
      </div>
      
      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </aside>
  );
}

// Helper function to get theme colors for list items
function getListThemeColor(listId: string) {
  switch (listId) {
    case 'goals':
      return {
        bg: 'bg-purple-50',
        border: 'border-purple-500',
        text: 'text-purple-700',
        countBg: 'bg-purple-100'
      };
    case 'today':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        text: 'text-blue-700',
        countBg: 'bg-blue-100'
      };
    case 'important':
      return {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-700',
        countBg: 'bg-red-100'
      };
    case 'all':
      return {
        bg: 'bg-green-50',
        border: 'border-green-500',
        text: 'text-green-700',
        countBg: 'bg-green-100'
      };
    default:
      return {
        bg: 'bg-gray-100',
        border: 'border-gray-500',
        text: 'text-gray-700',
        countBg: 'bg-gray-200'
      };
  }
} 