import { NextRequest, NextResponse } from 'next/server';

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
 * Handle POST requests to the AI API endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { prompt, options = {} } = body;
    
    // Validate the request
    if (!prompt) {
      return NextResponse.json(
        { message: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    console.log('AI API request received:', { prompt, options });
    
    // Check if API key is configured
    if (!DEEPSEEK_API_KEY) {
      console.error('DeepSeek API key is not configured');
      
      // 返回模拟数据以便开发时测试（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('Using simulated response in development environment');
        return simulateResponse(prompt);
      }
      
      return NextResponse.json(
        { message: 'DeepSeek API key is not configured' },
        { status: 500 }
      );
    }
    
    // Make a request to the DeepSeek API
    console.log(`Making request to DeepSeek API: ${DEEPSEEK_API_URL}`);
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { 
            role: 'system', 
            content: '你是一个专业的任务规划助手，擅长帮助用户分解目标为可行的任务步骤。请输出JSON格式。' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800,
        response_format: { type: "json_object" },
      }),
    });
    
    // Log the response status
    console.log(`DeepSeek API response status: ${response.status}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('DeepSeek API error:', error);
      
      // 返回模拟数据以便开发时测试（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('Using simulated response after API error');
        console.error('具体错误状态码:', response.status, '- 可能需要检查 API 密钥或账户余额');
        return simulateResponse(prompt);
      }
      
      return NextResponse.json(
        { message: error.error?.message || 'Failed to get AI response' },
        { status: response.status }
      );
    }
    
    // Process the successful response
    const data = await response.json();
    console.log('DeepSeek API response data:', data);
    
    const generatedText = data.choices[0].message.content;
    
    return NextResponse.json({
      text: generatedText,
      usage: data.usage,
      isSimulated: false // 标记为真实 API 响应
    });
    
  } catch (error) {
    console.error('AI API error:', error);
    
    // 返回模拟数据以便开发时测试（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('Using simulated response after exception');
      return simulateResponse("goal planning");
    }
    
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Simulate a response for development when API key is not available
 */
function simulateResponse(prompt: string) {
  console.log('Simulating AI response for prompt:', prompt);
  
  // Simulate processing time
  // 在实际代码中可以移除这个延迟，这里只是为了模拟真实API的延迟
  // await new Promise(resolve => setTimeout(resolve, 800));
  
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
  
  // Return the simulated response
  return NextResponse.json({
    text: simulatedResponse,
    usage: {
      promptTokens: prompt.length / 4, // Rough token estimation
      completionTokens: simulatedResponse.length / 4,
      totalTokens: (prompt.length + simulatedResponse.length) / 4,
    },
    isSimulated: true // 标记为模拟数据
  });
} 