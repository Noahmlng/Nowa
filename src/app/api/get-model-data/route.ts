import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    // Get the filename from the query parameters
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json({ 
        success: false, 
        message: 'Filename is required' 
      }, { status: 400 });
    }
    
    // Ensure the filename is safe (no path traversal)
    const safeName = path.basename(filename);
    
    // Get the file path
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, safeName);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        message: 'File not found' 
      }, { status: 404 });
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting model data file:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to get data file',
      error: (error as Error).message 
    }, { status: 500 });
  }
} 