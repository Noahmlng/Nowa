'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/store';
import SaveModelData from '@/components/SaveModelData';
import Link from 'next/link';

export default function ModelDataPage() {
  const [modelData, setModelData] = useState<any>(null);
  const [dataFiles, setDataFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get the entire store state
  const storeState = useAppStore();
  
  // Fetch the list of data files
  useEffect(() => {
    const fetchDataFiles = async () => {
      try {
        const response = await fetch('/api/list-model-data');
        if (response.ok) {
          const data = await response.json();
          setDataFiles(data.files || []);
        }
      } catch (error) {
        console.error('Error fetching data files:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDataFiles();
  }, []);
  
  // Load the current store state
  useEffect(() => {
    setModelData(storeState);
  }, [storeState]);
  
  // Load a specific data file
  const handleLoadFile = async (filename: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/get-model-data?filename=${encodeURIComponent(filename)}`);
      if (response.ok) {
        const data = await response.json();
        setModelData(data);
        setSelectedFile(filename);
      }
    } catch (error) {
      console.error('Error loading data file:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link href="/" className="text-blue-500 hover:underline">
          &larr; Back to Home
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Model Data</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left sidebar - Save and load options */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <SaveModelData />
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-medium mb-4">Load Data</h2>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  setModelData(storeState);
                  setSelectedFile(null);
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Current Store State
              </button>
              
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Saved Data Files:</h3>
                  {dataFiles.length > 0 ? (
                    <ul className="max-h-60 overflow-y-auto border border-gray-200 rounded-md divide-y">
                      {dataFiles.map((file, index) => (
                        <li key={index}>
                          <button
                            onClick={() => handleLoadFile(file)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${selectedFile === file ? 'bg-blue-50' : ''}`}
                          >
                            {file}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No saved data files found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side - Data display */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-medium mb-4">
              {selectedFile ? `Data from: ${selectedFile}` : 'Current Store State'}
            </h2>
            
            <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[70vh]">
              <pre className="text-xs">
                {JSON.stringify(modelData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 