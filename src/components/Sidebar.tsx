'use client';

import { useState, useEffect } from 'react';
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
  const { taskLists, addTaskList, tasks, user, updateUser } = useAppStore();
  
  // Local state
  const [isAddingList, setIsAddingList] = useState(false); // Controls new list input visibility
  const [newListName, setNewListName] = useState(''); // New list name input value
  
  // User profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // User status state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<typeof statusOptions[0] | null>(null);
  
  // 用户状态处理函数
  const handleSetStatus = (status: typeof statusOptions[0]) => {
    setUserStatus(status);
    setIsStatusModalOpen(false);
    // 如果有 updateUser 函数，同时更新用户状态到全局状态
    if (updateUser && user) {
      updateUser({
        ...user,
        status: status.id
      });
    }
  };
  
  // 获取列表主题颜色
  const getListThemeColor = (listId: string) => {
    const colorMap: Record<string, {bg: string, text: string, countBg?: string}> = {
      today: { bg: 'bg-blue-50', text: 'text-blue-700', countBg: 'bg-blue-100' },
      goals: { bg: 'bg-green-50', text: 'text-green-700', countBg: 'bg-green-100' },
      all: { bg: 'bg-purple-50', text: 'text-purple-700', countBg: 'bg-purple-100' },
      completed: { bg: 'bg-gray-50', text: 'text-gray-700', countBg: 'bg-gray-100' },
      important: { bg: 'bg-amber-50', text: 'text-amber-700', countBg: 'bg-amber-100' },
    };
    
    return colorMap[listId] || { bg: 'bg-gray-50', text: 'text-gray-700', countBg: 'bg-gray-100' };
  };
  
  // 获取未完成任务数量
  const getIncompleteTaskCount = (listId: string) => {
    if (listId === 'today') {
      const today = new Date().toDateString();
      return tasks.filter(
        task => task.status === 'pending' && 
        task.dueDate && new Date(task.dueDate).toDateString() === today
      ).length;
    } else if (listId === 'all') {
      return tasks.filter(task => task.status === 'pending').length;
    } else if (listId === 'completed') {
      return tasks.filter(task => task.status === 'completed').length;
    } else if (listId === 'important') {
      return tasks.filter(task => task.status === 'pending' && task.important).length;
    }
    return 0;
  };

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

  /**
   * Default navigation lists that are always present
   * These are not stored in the database but are hardcoded
   */
  const defaultLists = [
    { id: 'goals', name: 'Goals', icon: <Target size={18} className="text-purple-500" /> },
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
    <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col h-full">
      {/* User profile section */}
      <div className="py-6 px-4 border-b border-gray-100 relative">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">{user.nickname}</h2>
          <div 
            className="ml-2 px-2.5 py-0.5 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => setIsProfileModalOpen(true)}
            role="button"
            aria-label="打开个人资料"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsProfileModalOpen(true);
              }
            }}
          >
            <div className="flex items-center">
              <User size={10} className="text-gray-500 mr-1" />
              <span className="text-xs font-medium text-gray-600">About Me</span>
            </div>
          </div>
        </div>
        
        {/* User Profile Modal */}
        <UserProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
        
        {/* 用户状态区域 */}
        <div 
          className="mt-2 flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors"
          onClick={() => setIsStatusModalOpen(true)}
          role="button"
          aria-label="设置状态"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsStatusModalOpen(true);
            }
          }}
        >
          {userStatus ? (
            <>
              <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5">
                <span className="mr-1.5">{userStatus.icon}</span>
                <span className="text-sm text-gray-700">{userStatus.label}</span>
              </div>
              <span className="text-xs text-gray-400 ml-2">今日有效</span>
            </>
          ) : (
            <div className="text-sm text-gray-500 flex items-center">
              <Smile size={16} className="mr-1.5 text-gray-400" />
              <span>设置今日状态...</span>
            </div>
          )}
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
                  aria-label="关闭状态选择"
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
                    aria-label={`设置状态为${status.label}`}
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
                  aria-label={`选择${list.name}列表${count && count > 0 ? `，有${count}个任务待完成` : ''}`}
                  aria-current={isSelected ? 'page' : undefined}
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
                      <span className="text-gray-500">
                        <CheckCircle2 size={18} />
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
        <div className="mt-4 px-2">
          {isAddingList ? (
            // Form for adding a new list
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
              <input
                type="text"
                className="w-full px-3 py-1.5 mb-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-between">
                <button
                  className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors"
                  onClick={handleAddList}
                >
                  Add
                </button>
                <button
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300 transition-colors"
                  onClick={() => setIsAddingList(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Button to show the add list form
            <button
              className="w-full flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => setIsAddingList(true)}
              aria-label="创建新列表"
            >
              <Plus size={16} className="text-gray-500" />
              <span className="text-sm font-medium">New List</span>
            </button>
          )}
        </div>
      </nav>
      
      {/* Footer with settings button */}
      <div className="py-3 px-3 border-t border-gray-200">
        <button 
          className="w-full flex items-center space-x-3 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="打开设置"
        >
          <Settings size={18} className="text-gray-500" />
          <span className="text-sm">Settings</span>
        </button>
      </div>
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