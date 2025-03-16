import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Get the data from the request body
    const data = await request.json();
    
    // Ensure the data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save the data to a file with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filePath = path.join(dataDir, `model-data-${timestamp}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Also save to a fixed filename for easy access
    const latestFilePath = path.join(dataDir, 'latest-model-data.json');
    fs.writeFileSync(latestFilePath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data saved successfully',
      filePath,
      latestFilePath
    });
  } catch (error) {
    console.error('Error saving model data:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to save data',
      error: (error as Error).message 
    }, { status: 500 });
  }
} 