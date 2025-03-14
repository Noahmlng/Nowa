import { NextResponse } from 'next/server';

/**
 * API Route for generating task suggestions
 * POST /api/suggestions
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const { taskTitle, userProfile, recentFeedback } = await request.json();
    
    if (!taskTitle) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    const suggestions = await generateSuggestions(taskTitle, userProfile, recentFeedback);
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

/**
 * Generate task suggestions using DeepSeek API
 */
async function generateSuggestions(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): Promise<string[]> {
  try {
    // Construct the prompt
    const prompt = constructSuggestionPrompt(taskTitle, userProfile, recentFeedback);
    
    // Call DeepSeek API
    const response = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个全能型任务管理专家，具备以下能力架构：\n\n【核心角色】  \n1. **领域识别者**：自动判断任务类型（健康/学习/职业等）  \n2. **风险审计员**：检测用户输入中的潜在矛盾/危险信号  \n3. **方案架构师**：生成结构化提案  \n\n【跨领域知识库】  \n- 健康管理：运动医学/营养学/康复原理  \n- 学习规划：认知科学/时间管理/知识体系构建  \n- 职业发展：OKR制定/技能迁移策略/行业趋势分析  \n\n【交互协议】  \n1. 提案必须包含：  \n   - 风险评估（使用❗️分级标记）  \n   - 领域交叉建议（如「学习计划与生物钟匹配度」）  \n   - 3种可选路径（保守/平衡/激进策略）  \n2. 使用类比手法解释专业概念（如「这个学习计划像金字塔，基础层是...」）'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        top_p: 0.7,
        max_tokens: 800,
        presence_penalty: 0.2
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error from DeepSeek API:', data);
      throw new Error('Failed to generate task suggestions');
    }

    // Parse the response to extract suggestions
    return parseSuggestions(data.choices[0].message.content);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    // Fallback suggestions
    return [
      '针对髋关节不适的恢复性训练',
      '结合有氧和力量的核心肌群训练',
      '低强度渐进式耐力训练'
    ];
  }
}

/**
 * Construct prompt for generating task suggestions
 */
function constructSuggestionPrompt(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): string {
  let prompt = `请处理任务「${taskTitle}」：\n\n`;
  
  // Add user profile information
  prompt += '【用户画像】\n';
  prompt += '◆ 基础档案：';
  const basicInfo = [];
  if (userProfile.age) basicInfo.push(`年龄 ${userProfile.age}`);
  if (userProfile.occupation) basicInfo.push(`职业 ${userProfile.occupation}`);
  if (userProfile.location) basicInfo.push(`地理位置 ${userProfile.location}`);
  if (userProfile.height) basicInfo.push(`身高 ${userProfile.height}`);
  if (userProfile.weight) basicInfo.push(`体重 ${userProfile.weight}`);
  prompt += basicInfo.join('、') + '\n';
  
  // Add ability characteristics
  prompt += '◆ 能力特征：';
  const abilities = [];
  if (userProfile.strengths && userProfile.strengths.length > 0) {
    abilities.push(`优势 ${userProfile.strengths.join('、')}`);
  }
  if (userProfile.weaknesses && userProfile.weaknesses.length > 0) {
    abilities.push(`短板 ${userProfile.weaknesses.join('、')}`);
  }
  prompt += abilities.join('、') + '\n';
  
  // Add historical trajectory
  prompt += '◆ 历史轨迹：';
  if (userProfile.history) {
    prompt += userProfile.history;
  } else if (recentFeedback) {
    prompt += recentFeedback;
  } else {
    prompt += '无历史记录';
  }
  prompt += '\n\n';
  
  // Add task context
  prompt += '【任务上下文】\n';
  prompt += `★ 显性需求：${taskTitle}\n`;
  
  // Add implicit needs based on goals
  prompt += '★ 隐性需求：';
  if (userProfile.goals && userProfile.goals.length > 0) {
    prompt += userProfile.goals.join('、');
  } else {
    prompt += '未明确';
  }
  prompt += '\n';
  
  // Add constraints
  prompt += '★ 约束条件：';
  const constraints = [];
  if (userProfile.timeConstraints) constraints.push(`时间 ${userProfile.timeConstraints}`);
  if (userProfile.resourceConstraints) constraints.push(`资源 ${userProfile.resourceConstraints}`);
  if (userProfile.restrictions && userProfile.restrictions.length > 0) {
    constraints.push(`限制 ${userProfile.restrictions.join('、')}`);
  }
  prompt += constraints.length > 0 ? constraints.join('、') : '无明确约束';
  prompt += '\n\n';
  
  // Add interaction mode with new constraints
  prompt += '【交互模式】\n';
  prompt += '▸ 输出格式：提供3个简短建议，每个建议必须以疑问句开头，后跟简短方案\n';
  prompt += '▸ 语气要求：专业、亲切、激励\n';
  prompt += '▸ 长度限制：每个建议不超过20个字符\n';
  prompt += '▸ 输出示例：\n1. 髋关节好些了吗？做恢复训练\n2. 想增强核心吗？尝试平板支撑\n3. 需要放松吗？试试瑜伽拉伸\n';
  
  return prompt;
}

/**
 * Parse suggestions from DeepSeek API response
 */
function parseSuggestions(content: string): string[] {
  try {
    // Split by newlines and filter out empty lines
    const lines = content.split('\n')
      .filter(line => line.trim().length > 0)
      // Remove any numbering or bullet points at the beginning
      .map(line => line.replace(/^(\d+\.|\*|\-)\s*/, '').trim())
      // Ensure each suggestion is not longer than 20 characters
      .map(line => line.length > 20 ? line.substring(0, 20) : line);
    
    // Ensure we have exactly three suggestions
    const suggestions = lines.slice(0, 3);
    
    // If we don't have enough suggestions, add generic ones
    while (suggestions.length < 3) {
      const defaultSuggestions = [
        '需要恢复吗？做轻度训练',
        '想增强体能吗？核心训练',
        '关节不适吗？试试拉伸'
      ];
      suggestions.push(defaultSuggestions[suggestions.length % defaultSuggestions.length]);
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error parsing suggestions:', error);
    return [
      '需要恢复吗？做轻度训练',
      '想增强体能吗？核心训练',
      '关节不适吗？试试拉伸'
    ];
  }
} 