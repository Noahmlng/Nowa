import { NextResponse } from 'next/server';
import type { GoalTask } from '@/types/goal';
import { callAI, log, handleError } from '@/services/aiClient';

export async function POST(request: Request) {
  try {
    const { goal, context, prompt } = await request.json();
    
    log('generate-plan', 'Received request:', { goal, context });
    
    const data = await callAI(
      'generate-plan',
      'You are an AI task planning assistant. Your task is to break down goals into actionable tasks with clear timelines and dependencies.',
      prompt
    );
    
    // Parse and validate the AI response
    const tasks: GoalTask[] = Array.isArray(data) ? data.map((task: any) => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: task.title || 'Untitled Task',
      description: task.description,
      timeline: task.timeline,
      completed: false,
      priority: task.priority || 'medium',
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : []
    })) : [];
    
    log('generate-plan', 'Generated tasks:', tasks);
    
    return NextResponse.json(tasks);
  } catch (error) {
    return handleError('generate-plan', error);
  }
} 