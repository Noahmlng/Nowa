import { NextRequest, NextResponse } from 'next/server';
import { callAI, log } from '@/services/aiClient';

/**
 * Environment variables for AI services
 * These should be set in your .env.local file
 */
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

/**
 * AI models to use
 */
// 常见的 DeepSeek 模型有:
// - deepseek-chat (最新的聊天模型)
// - deepseek-coder (针对代码优化的模型)
// 根据 DeepSeek 文档选择适合的模型
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

/**
 * Simulate a response for development when API key is not available
 */
function simulateResponse(prompt: string) {
  log('simulate', 'Simulating AI response for prompt:', prompt);
  
  // Generate a simulated response based on the prompt
  let simulatedResponse = '';
  
  if (prompt.toLowerCase().includes('goal')) {
    simulatedResponse = JSON.stringify({
      suggestedTasks: [
        { title: '制定详细计划', timeline: '本周内' },
        { title: '每周评估进度', timeline: '每周日' },
        { title: '调整策略和方法', timeline: '每月' },
      ],
      insights: '将大目标分解为小步骤，更容易保持动力和取得进展。使用SMART原则设定具体、可衡量、可实现、相关和有时限的任务。'
    });
  } else {
    simulatedResponse = '我理解你的问题，但需要更具体的信息才能提供帮助。请提供更多关于您的目标的详细信息。';
  }
  
  return NextResponse.json({
    text: simulatedResponse,
    usage: {
      promptTokens: prompt.length / 4,
      completionTokens: simulatedResponse.length / 4,
      totalTokens: (prompt.length + simulatedResponse.length) / 4,
    },
    isSimulated: true
  });
}

/**
 * Handle POST requests to the AI API endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt, options = {} } = await request.json();
    
    // Validate the request
    if (!prompt) {
      return NextResponse.json(
        { message: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    log('main', 'AI API request received:', { prompt, options });
    
    // Check if API key is configured
    if (!process.env.DEEPSEEK_API_KEY) {
      log('main', 'DeepSeek API key is not configured');
      
      // Return simulated data in development
      if (process.env.NODE_ENV === 'development') {
        log('main', 'Using simulated response in development environment');
        return simulateResponse(prompt);
      }
      
      return NextResponse.json(
        { message: 'DeepSeek API key is not configured' },
        { status: 500 }
      );
    }
    
    // Use the centralized AI client
    const data = await callAI(
      'main',
      '你是一个专业的任务规划助手，擅长帮助用户分解目标为可行的任务步骤。请输出JSON格式。',
      prompt,
      {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      }
    );
    
    return NextResponse.json({
      text: typeof data === 'string' ? data : JSON.stringify(data),
      isSimulated: false
    });
    
  } catch (error) {
    log('main', 'AI API error:', error);
    
    // Return simulated data in development
    if (process.env.NODE_ENV === 'development') {
      log('main', 'Using simulated response after exception');
      return simulateResponse("goal planning");
    }
    
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 