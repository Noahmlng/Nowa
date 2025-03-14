import { NextResponse } from 'next/server';
import type { GoalTask } from '@/types/goal';
import { callAI, log, handleError } from '@/services/aiClient';

export async function POST(request: Request) {
  try {
    const { goal, feedback, context, prompt } = await request.json();
    
    log('process-feedback', 'Received request:', { goal, feedback, context });
    
    const data = await callAI(
      'process-feedback',
      'You are an AI task refinement assistant. Your task is to improve task plans based on user feedback.',
      prompt
    );
    
    // Parse and validate the AI response
    const result = {
      updatedTasks: Array.isArray(data.updatedTasks) ? data.updatedTasks.map((task: any) => ({
        id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: task.title || 'Untitled Task',
        description: task.description,
        timeline: task.timeline,
        completed: false,
        priority: task.priority || 'medium',
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : []
      })) : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      confidenceLevel: parseFloat(data.confidenceLevel) || 0
    };
    
    log('process-feedback', 'Processed feedback result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    return handleError('process-feedback', error);
  }
} 