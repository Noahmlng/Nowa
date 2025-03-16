'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/store';

export default function SaveModelData() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
    filePath?: string;
  } | null>(null);
  
  // Get the entire store state
  const storeState = useAppStore();
  
  const handleSaveToFile = async () => {
    try {
      setIsSaving(true);
      setSaveResult(null);
      
      // Create a Blob with the data
      const blob = new Blob([JSON.stringify(storeState, null, 2)], { type: 'application/json' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model-data-${new Date().toISOString().replace(/:/g, '-')}.json`;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      setSaveResult({
        success: true,
        message: 'Data downloaded successfully'
      });
    } catch (error) {
      console.error('Error saving model data:', error);
      setSaveResult({
        success: false,
        message: `Error: ${(error as Error).message}`
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveToServer = async () => {
    try {
      setIsSaving(true);
      setSaveResult(null);
      
      // Send the data to the server
      const response = await fetch('/api/save-model-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storeState)
      });
      
      const result = await response.json();
      
      setSaveResult({
        success: result.success,
        message: result.message,
        filePath: result.filePath
      });
    } catch (error) {
      console.error('Error saving model data to server:', error);
      setSaveResult({
        success: false,
        message: `Error: ${(error as Error).message}`
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-medium mb-4">Save Model Data</h2>
      
      <div className="space-y-4">
        <button
          onClick={handleSaveToFile}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Download Data'}
        </button>
        
        <button
          onClick={handleSaveToServer}
          disabled={isSaving}
          className="ml-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save to Server'}
        </button>
        
        {saveResult && (
          <div className={`mt-4 p-3 rounded-md ${saveResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p>{saveResult.message}</p>
            {saveResult.filePath && (
              <p className="text-sm mt-1">Saved to: {saveResult.filePath}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 