'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Check } from 'lucide-react';
import { useAppStore } from '@/store/store';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 预设选项
const personalityOptions = ['分析型', '创造型', '社交型', '实践型', '领导型', '合作型'];
const workStyleOptions = ['专注型', '多任务型', '计划型', '灵活型', '结果导向', '过程导向'];
const timeBlockOptions = ['早晨(6-9点)', '上午(9-12点)', '下午(12-17点)', '晚上(17-22点)', '深夜(22-6点)'];
const learningPrefOptions = ['视觉型', '听觉型', '动手型', '阅读型', '社交型'];
const challengeOptions = ['时间管理', '专注力', '拖延', '优先级设置', '跟踪进度', '过度承诺'];

// 定义选项卡类型
type TabType = 'personal' | 'work' | 'learning' | 'priorities';

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { userProfile, updateUserProfile } = useAppStore();
  
  // 选项卡状态
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  
  // Local state for form fields - 基本信息
  const [weight, setWeight] = useState(userProfile.weight || '');
  const [height, setHeight] = useState(userProfile.height || '');
  const [personality, setPersonality] = useState<string[]>(userProfile.personality || []);
  const [interests, setInterests] = useState<string[]>(userProfile.interests || []);
  const [hobbies, setHobbies] = useState<string[]>(userProfile.hobbies || []);
  const [personalGoals, setPersonalGoals] = useState<string[]>(userProfile.goals || []);
  const [notes, setNotes] = useState(userProfile.notes || '');
  
  // 新增字段 - 工作偏好
  const [workStyle, setWorkStyle] = useState<string[]>(userProfile.workStyle || []);
  const [productivityPeaks, setProductivityPeaks] = useState<string[]>(userProfile.productivityPeaks || []);
  
  // 新增字段 - 学习偏好
  const [learningPreferences, setLearningPreferences] = useState<string[]>(userProfile.learningPreferences || []);
  const [challengeAreas, setChallengeAreas] = useState<string[]>(userProfile.challengeAreas || []);
  
  // 新增字段 - 优先级偏好
  const [priorityFocus, setPriorityFocus] = useState({
    efficiency: userProfile.priorityFocus?.efficiency || 5,
    quality: userProfile.priorityFocus?.quality || 5,
    creativity: userProfile.priorityFocus?.creativity || 5
  });
  
  // 模型选择
  const [preferredModel, setPreferredModel] = useState<'deepseek-r1' | 'gpt-4o'>(
    userProfile.preferredModel || 'gpt-4o'
  );
  
  // New item inputs
  const [newPersonality, setNewPersonality] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newHobby, setNewHobby] = useState('');
  const [newGoal, setNewGoal] = useState('');
  
  // Update local state when userProfile changes
  useEffect(() => {
    if (isOpen) {
      // 基本信息
      setWeight(userProfile.weight || '');
      setHeight(userProfile.height || '');
      setPersonality(userProfile.personality || []);
      setInterests(userProfile.interests || []);
      setHobbies(userProfile.hobbies || []);
      setPersonalGoals(userProfile.goals || []);
      setNotes(userProfile.notes || '');
      setPreferredModel(userProfile.preferredModel || 'gpt-4o');
      
      // 工作偏好
      setWorkStyle(userProfile.workStyle || []);
      setProductivityPeaks(userProfile.productivityPeaks || []);
      
      // 学习偏好
      setLearningPreferences(userProfile.learningPreferences || []);
      setChallengeAreas(userProfile.challengeAreas || []);
      
      // 优先级偏好
      setPriorityFocus({
        efficiency: userProfile.priorityFocus?.efficiency || 5,
        quality: userProfile.priorityFocus?.quality || 5,
        creativity: userProfile.priorityFocus?.creativity || 5
      });
    }
  }, [isOpen, userProfile]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateUserProfile({
      // 基本信息
      weight,
      height,
      personality,
      interests,
      hobbies,
      goals: personalGoals,
      notes,
      preferredModel,
      
      // 工作偏好
      workStyle,
      productivityPeaks,
      
      // 学习偏好
      learningPreferences,
      challengeAreas,
      
      // 优先级偏好
      priorityFocus
    });
    
    onClose();
  };
  
  // Add new item to a list
  const addItem = (item: string, list: string[], setList: (list: string[]) => void, setNewItem: (value: string) => void) => {
    if (item.trim()) {
      setList([...list, item.trim()]);
      setNewItem('');
    }
  };
  
  // Remove item from a list
  const removeItem = (index: number, list: string[], setList: (list: string[]) => void) => {
    setList(list.filter((_, i) => i !== index));
  };
  
  // 切换预设选项
  const toggleOption = (option: string, list: string[], setList: (list: string[]) => void) => {
    if (list.includes(option)) {
      setList(list.filter(item => item !== option));
    } else {
      setList([...list, option]);
    }
  };
  
  // 处理优先级滑块变化
  const handlePriorityChange = (key: keyof typeof priorityFocus, value: number) => {
    setPriorityFocus(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">About Me</h2>
          <button 
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            onClick={onClose}
            aria-label="关闭个人资料窗口"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* 选项卡导航 */}
        <div className="flex border-b border-gray-200 px-4">
          <button 
            className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'personal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('personal')}
            aria-label="切换到个人信息选项卡"
          >
            个人信息
          </button>
          <button 
            className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'work' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('work')}
            aria-label="切换到工作偏好选项卡"
          >
            工作偏好
          </button>
          <button 
            className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'learning' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('learning')}
            aria-label="切换到学习偏好选项卡"
          >
            学习偏好
          </button>
          <button 
            className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'priorities' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('priorities')}
            aria-label="切换到优先级设置选项卡"
          >
            优先级设置
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {/* 个人信息选项卡 */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., 70kg"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., 175cm"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">个性特征</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {personalityOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`px-3 py-1 rounded-full text-sm ${
                        personality.includes(option)
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                      onClick={() => toggleOption(option, personality, setPersonality)}
                      aria-label={`${personality.includes(option) ? '取消选择' : '选择'}个性特征: ${option}`}
                    >
                      {option}
                      {personality.includes(option) && <Check size={14} className="inline ml-1" />}
                    </button>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="添加其他个性特征"
                    value={newPersonality}
                    onChange={(e) => setNewPersonality(e.target.value)}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                    onClick={() => addItem(newPersonality, personality, setPersonality, setNewPersonality)}
                    aria-label="添加个性特征"
                  >
                    <Plus size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">兴趣爱好</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {interests.map((interest, index) => (
                    <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                      <span className="text-sm text-gray-700">{interest}</span>
                      <button 
                        type="button"
                        className="ml-1 text-gray-400 hover:text-gray-600"
                        onClick={() => removeItem(index, interests, setInterests)}
                        aria-label={`移除个性特征: ${interest}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="添加兴趣爱好"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                    onClick={() => addItem(newInterest, interests, setInterests, setNewInterest)}
                    aria-label="添加兴趣爱好"
                  >
                    <Plus size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">个人目标</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {personalGoals.map((goal, index) => (
                    <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                      <span className="text-sm text-gray-700">{goal}</span>
                      <button 
                        type="button"
                        className="ml-1 text-gray-400 hover:text-gray-600"
                        onClick={() => removeItem(index, personalGoals, setPersonalGoals)}
                        aria-label={`移除个人目标: ${goal}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="添加个人目标"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                    onClick={() => addItem(newGoal, personalGoals, setPersonalGoals, setNewGoal)}
                    aria-label="添加个人目标"
                  >
                    <Plus size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={4}
                  placeholder="关于你的其他信息..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
          )}
          
          {/* 工作偏好选项卡 */}
          {activeTab === 'work' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">工作风格</label>
                <p className="text-xs text-gray-500 mb-3">选择最符合你的工作习惯，这将帮助 AI 生成更适合你的任务计划</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {workStyleOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`px-3 py-1 rounded-full text-sm ${
                        workStyle.includes(option)
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                      onClick={() => toggleOption(option, workStyle, setWorkStyle)}
                      aria-label={`${workStyle.includes(option) ? '取消选择' : '选择'}工作风格: ${option}`}
                    >
                      {option}
                      {workStyle.includes(option) && <Check size={14} className="inline ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">高效时段</label>
                <p className="text-xs text-gray-500 mb-3">选择你精力最充沛、工作效率最高的时间段</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {timeBlockOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`px-3 py-1 rounded-full text-sm ${
                        productivityPeaks.includes(option)
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                      onClick={() => toggleOption(option, productivityPeaks, setProductivityPeaks)}
                      aria-label={`${productivityPeaks.includes(option) ? '取消选择' : '选择'}高效时段: ${option}`}
                    >
                      {option}
                      {productivityPeaks.includes(option) && <Check size={14} className="inline ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 学习偏好选项卡 */}
          {activeTab === 'learning' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">学习偏好</label>
                <p className="text-xs text-gray-500 mb-3">选择你偏好的学习方式，这将帮助 AI 推荐更适合你的学习计划</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {learningPrefOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`px-3 py-1 rounded-full text-sm ${
                        learningPreferences.includes(option)
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                      onClick={() => toggleOption(option, learningPreferences, setLearningPreferences)}
                      aria-label={`${learningPreferences.includes(option) ? '取消选择' : '选择'}学习偏好: ${option}`}
                    >
                      {option}
                      {learningPreferences.includes(option) && <Check size={14} className="inline ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">挑战领域</label>
                <p className="text-xs text-gray-500 mb-3">选择你在任务管理中经常面临的挑战</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {challengeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`px-3 py-1 rounded-full text-sm ${
                        challengeAreas.includes(option)
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                      onClick={() => toggleOption(option, challengeAreas, setChallengeAreas)}
                      aria-label={`${challengeAreas.includes(option) ? '取消选择' : '选择'}挑战领域: ${option}`}
                    >
                      {option}
                      {challengeAreas.includes(option) && <Check size={14} className="inline ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 优先级设置选项卡 */}
          {activeTab === 'priorities' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  设置你的优先级偏好，这将帮助 AI 了解在任务管理中你更注重的方面，从而提供更符合你偏好的方案。
                </p>
              </div>
              
              <div>
                <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>效率重要性 (快速完成任务的能力)</span>
                  <span>{priorityFocus.efficiency}/10</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={priorityFocus.efficiency}
                  onChange={(e) => handlePriorityChange('efficiency', parseInt(e.target.value))}
                  aria-label="效率重要性评分"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>低优先级</span>
                  <span>高优先级</span>
                </div>
              </div>
              
              <div>
                <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>质量重要性 (确保高质量结果的能力)</span>
                  <span>{priorityFocus.quality}/10</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={priorityFocus.quality}
                  onChange={(e) => handlePriorityChange('quality', parseInt(e.target.value))}
                  aria-label="质量重要性评分"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>低优先级</span>
                  <span>高优先级</span>
                </div>
              </div>
              
              <div>
                <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>创意重要性 (寻找创新解决方案的能力)</span>
                  <span>{priorityFocus.creativity}/10</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={priorityFocus.creativity}
                  onChange={(e) => handlePriorityChange('creativity', parseInt(e.target.value))}
                  aria-label="创意重要性评分"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>低优先级</span>
                  <span>高优先级</span>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI 模型设置</h3>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">AI 模型选择</h4>
                      <p className="text-sm text-gray-500">选择用于生成任务建议和计划的 AI 模型</p>
                    </div>
                    
                    <div className="relative inline-block w-16 align-middle select-none">
                      <input 
                        type="checkbox" 
                        id="modelToggle" 
                        checked={preferredModel === 'gpt-4o'} 
                        onChange={() => setPreferredModel(preferredModel === 'gpt-4o' ? 'deepseek-r1' : 'gpt-4o')}
                        className="hidden" 
                        aria-label="切换 AI 模型"
                        aria-checked={preferredModel === 'gpt-4o' ? 'true' : 'false'}
                      />
                      <label 
                        htmlFor="modelToggle"
                        className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                          preferredModel === 'gpt-4o' ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                            preferredModel === 'gpt-4o' ? 'translate-x-10' : 'translate-x-0'
                          }`} 
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm">
                    <span className="font-medium">当前选择：</span> 
                    {preferredModel === 'gpt-4o' ? 'GPT-4o (OpenAI)' : 'DeepSeek R1'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md mr-2 hover:bg-gray-200"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
            >
              <Save size={16} className="mr-1" />
              保存资料
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 