/**
 * AI Service Client
 * 
 * This module provides an abstraction layer for interacting with various AI services
 * like DeepSeek, OpenAI, etc. It handles authentication, request formatting,
 * and response parsing.
 */

// Types for AI requests and responses
export interface AIRequest {
  prompt: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    service?: 'deepseek' | 'openai'; // Which AI service to use
  };
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  isSimulated?: boolean; // 添加标识是否为模拟数据的标志
}

export interface GoalAnalysisResult {
  suggestedTasks: Array<{
    title: string;
    timeline?: string;
  }>;
  insights: string;
  isSimulated?: boolean; // 添加标识是否为模拟数据的标志
}

/**
 * The API URL for AI services. In a production environment,
 * this should be set via environment variables.
 */
const AI_API_URL = '/api/ai'; // This will be handled by a Next.js API route

/**
 * Default options for AI requests
 */
const defaultOptions = {
  temperature: 0.7,
  maxTokens: 500,
  service: 'deepseek' as const,
};

/**
 * Send a request to the AI service and get the generated response
 */
export async function getAICompletion(request: AIRequest): Promise<AIResponse> {
  console.log('Sending AI request:', request);
  
  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        options: {
          ...defaultOptions,
          ...request.options,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI API error:', errorData);
      return { 
        text: '', 
        error: errorData.message || 'Failed to get AI response' 
      };
    }

    const data = await response.json();
    console.log('AI response received:', data);
    return data;
  } catch (error) {
    console.error('Error calling AI service:', error);
    return { 
      text: '', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Analyze a goal and suggest tasks to achieve it
 * 
 * @param goalTitle The title of the goal to analyze
 * @returns A promise that resolves to a GoalAnalysisResult
 */
export async function analyzeGoal(goalTitle: string): Promise<GoalAnalysisResult> {
  console.log('Analyzing goal:', goalTitle);
  
  try {
    // 构建系统提示
    const systemPrompt = `你是一个目标规划助手，帮助用户将大目标拆解为可执行的具体任务。
请分析用户的目标，并提供以下内容：
1. 对目标的简短见解（不超过2-3句话）
2. 3-5个具体的任务建议，每个任务都应该：
   - 明确具体，可执行
   - 包含清晰的时间线描述（如"本周内"、"下周五前"、"下个月10号前"等）
   - 有助于实现最终目标

目标: ${goalTitle}
`;
    
    // 构建用户提示
    const userPrompt = `请帮我分析这个目标，并提供实用的任务建议。每个任务都需要有明确的时间线，比如"本周内"、"下周五前"、"每天"等具体时间描述。`;
    
    // 发送请求到 AI API
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        format: {
          "insights": "string",
          "suggestedTasks": [
            {
              "title": "string",
              "timeline": "string"
            }
          ]
        }
      }),
    });
    
    if (!response.ok) {
      console.error('AI API error:', response.statusText);
      return generateFallbackAnalysis(goalTitle);
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error('AI API returned error:', data.error);
      return generateFallbackAnalysis(goalTitle);
    }
    
    return {
      ...data,
      isSimulated: data.isSimulated || false
    };
  } catch (error) {
    console.error('Error analyzing goal:', error);
    return generateFallbackAnalysis(goalTitle);
  }
}

/**
 * Generate fallback analysis when the AI service is unavailable
 */
function generateFallbackAnalysis(goalTitle: string): GoalAnalysisResult {
  console.log('Generating fallback analysis for:', goalTitle);
  
  // 根据目标标题中的关键词生成不同类型的任务
  const goalText = goalTitle.toLowerCase();
  
  // 健身相关目标
  if (goalText.includes('健身') || 
      goalText.includes('workout') || 
      goalText.includes('exercise') || 
      goalText.includes('fitness')) {
    return {
      insights: '保持规律的锻炼习惯是实现健身目标的关键。建议将大目标分解为每周可执行的小任务，并逐步增加强度。',
      suggestedTasks: [
        { title: '制定每周健身计划', timeline: '本周内' },
        { title: '每周进行3次30分钟有氧运动', timeline: '每周一/三/五' },
        { title: '每周进行2次力量训练', timeline: '每周二/四' },
        { title: '记录每次锻炼数据和感受', timeline: '每次锻炼后' },
      ],
      isSimulated: true
    };
  }
  
  // 职业相关目标
  else if (goalText.includes('工作') || 
      goalText.includes('职业') || 
      goalText.includes('job') || 
      goalText.includes('career')) {
    return {
      insights: '职业发展需要明确的方向和持续的学习。建议设定短期和长期目标，并定期评估进展。',
      suggestedTasks: [
        { title: '更新简历和LinkedIn档案', timeline: '本周内' },
        { title: '每周申请5个符合目标的职位', timeline: '每周' },
        { title: '参加行业线上研讨会或课程', timeline: '下两周内' },
        { title: '与行业内3位专业人士建立联系', timeline: '本月内' },
      ],
      isSimulated: true
    };
  }
  
  // 学习相关目标
  else if (goalText.includes('学习') || 
      goalText.includes('学校') || 
      goalText.includes('study') || 
      goalText.includes('learn')) {
    return {
      insights: '有效的学习需要明确的计划和持续的实践。建议将学习内容分解为小模块，并设定具体的完成时间。',
      suggestedTasks: [
        { title: '制定详细的学习计划和时间表', timeline: '本周内' },
        { title: '每天专注学习至少1小时', timeline: '每天' },
        { title: '完成一个小型实践项目', timeline: '两周内' },
        { title: '参加相关学习小组或论坛', timeline: '下周前' },
      ],
      isSimulated: true
    };
  }
  
  // 默认通用目标
  else {
    return {
      insights: '实现目标需要明确的计划和持续的行动。建议将大目标分解为可管理的小任务，并设定具体的完成时间。',
      suggestedTasks: [
        { title: '制定详细的行动计划', timeline: '本周内' },
        { title: '设定可衡量的阶段性目标', timeline: '下周前' },
        { title: '每周回顾进展并调整计划', timeline: '每周日' },
        { title: '寻找相关资源和支持', timeline: '持续进行' },
      ],
      isSimulated: true
    };
  }
} 