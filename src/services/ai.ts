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
  category: string;
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
 * Analyze a goal and suggest tasks and insights
 */
export async function analyzeGoal(goalTitle: string, category?: string): Promise<GoalAnalysisResult> {
  console.log('Analyzing goal:', goalTitle, 'category:', category);
  
  const systemPrompt = `你是一个AI助手，擅长帮助用户分解目标为可执行的任务。
分析用户的目标，并提供适当的任务建议和时间线。
如果提供了类别，请根据该类别定制你的建议。`;
  
  const userPrompt = `目标: ${goalTitle}
${category ? `类别: ${category}` : ''}

请分析这个目标并提供:
1. 适合这个目标的类别（健康、职业、教育等）
2. 3-5个可行的任务，附带建议时间线
3. 简短的见解或成功提示

请使用以下JSON格式输出你的回答:
{
  "category": "string",
  "suggestedTasks": [
    {
      "title": "string",
      "timeline": "string"
    }
  ],
  "insights": "string"
}`;

  try {
    // 创建 AI 请求
    const aiResponse = await getAICompletion({
      prompt: userPrompt,
      options: {
        temperature: 0.7,
        maxTokens: 1000,
        service: 'deepseek',
      }
    });
    
    // 检查错误
    if (aiResponse.error) {
      console.error('AI analysis error:', aiResponse.error);
      throw new Error(aiResponse.error);
    }
    
    // 解析响应
    console.log('AI raw response:', aiResponse.text);
    
    try {
      // 尝试解析 JSON
      const parsedResponse = JSON.parse(aiResponse.text) as GoalAnalysisResult;
      // 保留模拟标志
      parsedResponse.isSimulated = aiResponse.isSimulated || false;
      return parsedResponse;
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      console.log('Raw response that failed to parse:', aiResponse.text);
      
      // 如果无法解析 JSON，返回 fallback
      return generateFallbackAnalysis(goalTitle, category);
    }
  } catch (error) {
    console.error('Error analyzing goal:', error);
    
    // 返回 fallback 结果
    return generateFallbackAnalysis(goalTitle, category);
  }
}

/**
 * 当 API 调用失败时生成一个后备的分析结果
 */
function generateFallbackAnalysis(goalTitle: string, category?: string): GoalAnalysisResult {
  console.log('Generating fallback analysis for:', goalTitle);
  
  // 基于关键词进行简单分类
  const goalText = goalTitle.toLowerCase();
  
  let result: GoalAnalysisResult;
  
  if (goalText.includes('健身') || 
      goalText.includes('fitness') || 
      goalText.includes('workout') ||
      category?.toLowerCase().includes('health')) {
    
    result = {
      category: 'Health & Fitness',
      suggestedTasks: [
        { title: '制定每周健身计划', timeline: '本周内' },
        { title: '每周进行3次力量训练', timeline: '周一/周三/周五' },
        { title: '记录训练进度和体重变化', timeline: '每次训练后' },
        { title: '调整饮食结构，增加蛋白质摄入', timeline: '持续进行' }
      ],
      insights: '保持一致性比高强度更重要。开始时先适应规律训练，然后再逐步增加强度。'
    };
  } 
  else if (goalText.includes('工作') || 
           goalText.includes('job') || 
           goalText.includes('career') ||
           category?.toLowerCase().includes('career')) {
    
    result = {
      category: 'Career',
      suggestedTasks: [
        { title: '更新简历和求职信模板', timeline: '本周内' },
        { title: '每周申请10个职位', timeline: '每周' },
        { title: '准备常见面试问题答案', timeline: '下两周' },
        { title: '扩展专业网络，联系行业内人士', timeline: '本月' }
      ],
      insights: '质量优于数量。针对每个职位定制申请材料会比大量发送通用简历更有效。'
    };
  }
  else if (goalText.includes('学习') || 
           goalText.includes('学') || 
           goalText.includes('study') ||
           category?.toLowerCase().includes('education')) {
    
    result = {
      category: 'Education',
      suggestedTasks: [
        { title: '制定学习计划和目标', timeline: '本周内' },
        { title: '每天固定时间学习', timeline: '每天' },
        { title: '完成一个实际项目或作业', timeline: '每周' },
        { title: '定期复习已学内容', timeline: '每周日' }
      ],
      insights: '间隔重复学习法可以显著提高记忆效果。尝试教给别人你学到的知识，这是检验理解的好方法。'
    };
  }
  else {
    // 通用回应
    result = {
      category: 'Personal Development',
      suggestedTasks: [
        { title: '明确目标的具体成功标准', timeline: '本周' },
        { title: '分解成每周可执行的小任务', timeline: '本周' },
        { title: '安排定期检查进度的时间', timeline: '每周日' },
        { title: '寻找相关资源或支持', timeline: '持续进行' }
      ],
      insights: '将大目标分解为小步骤，更容易保持动力和取得进展。设置明确的里程碑来庆祝进步。使用SMART原则（具体、可衡量、可实现、相关且有时限）来设计每个任务。'
    };
  }
  
  // 标记为模拟数据
  result.isSimulated = true;
  return result;
} 