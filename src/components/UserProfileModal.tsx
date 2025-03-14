'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/store';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { userProfile, updateUserProfile } = useAppStore();
  
  // Local state for form fields
  const [weight, setWeight] = useState(userProfile.weight || '');
  const [height, setHeight] = useState(userProfile.height || '');
  const [personality, setPersonality] = useState<string[]>(userProfile.personality || []);
  const [interests, setInterests] = useState<string[]>(userProfile.interests || []);
  const [hobbies, setHobbies] = useState<string[]>(userProfile.hobbies || []);
  const [personalGoals, setPersonalGoals] = useState<string[]>(userProfile.goals || []);
  const [notes, setNotes] = useState(userProfile.notes || '');
  
  // New item inputs
  const [newPersonality, setNewPersonality] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newHobby, setNewHobby] = useState('');
  const [newGoal, setNewGoal] = useState('');
  
  // Update local state when userProfile changes
  useEffect(() => {
    if (isOpen) {
      setWeight(userProfile.weight || '');
      setHeight(userProfile.height || '');
      setPersonality(userProfile.personality || []);
      setInterests(userProfile.interests || []);
      setHobbies(userProfile.hobbies || []);
      setPersonalGoals(userProfile.goals || []);
      setNotes(userProfile.notes || '');
    }
  }, [isOpen, userProfile]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateUserProfile({
      weight,
      height,
      personality,
      interests,
      hobbies,
      goals: personalGoals,
      notes
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
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">About Me</h2>
          <button 
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
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
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Personality Traits</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {personality.map((trait, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-sm text-gray-700">{trait}</span>
                  <button 
                    type="button"
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => removeItem(index, personality, setPersonality)}
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
                placeholder="Add personality trait"
                value={newPersonality}
                onChange={(e) => setNewPersonality(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                onClick={() => addItem(newPersonality, personality, setPersonality, setNewPersonality)}
              >
                <Plus size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {interests.map((interest, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-sm text-gray-700">{interest}</span>
                  <button 
                    type="button"
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => removeItem(index, interests, setInterests)}
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
                placeholder="Add interest"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                onClick={() => addItem(newInterest, interests, setInterests, setNewInterest)}
              >
                <Plus size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hobbies</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {hobbies.map((hobby, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-sm text-gray-700">{hobby}</span>
                  <button 
                    type="button"
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => removeItem(index, hobbies, setHobbies)}
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
                placeholder="Add hobby"
                value={newHobby}
                onChange={(e) => setNewHobby(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                onClick={() => addItem(newHobby, hobbies, setHobbies, setNewHobby)}
              >
                <Plus size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Personal Goals</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {personalGoals.map((goal, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-sm text-gray-700">{goal}</span>
                  <button 
                    type="button"
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => removeItem(index, personalGoals, setPersonalGoals)}
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
                placeholder="Add personal goal"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                onClick={() => addItem(newGoal, personalGoals, setPersonalGoals, setNewGoal)}
              >
                <Plus size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={4}
              placeholder="Any additional information about yourself..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md mr-2 hover:bg-gray-200"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
            >
              <Save size={16} className="mr-1" />
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 