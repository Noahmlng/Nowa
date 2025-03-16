import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Ensure the data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      return NextResponse.json({ files: [] });
    }
    
    // Get all JSON files in the data directory
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        // Sort by modification time (newest first)
        const statA = fs.statSync(path.join(dataDir, a));
        const statB = fs.statSync(path.join(dataDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing model data files:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to list data files',
      error: (error as Error).message 
    }, { status: 500 });
  }
} 