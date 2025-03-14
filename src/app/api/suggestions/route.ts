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
            content: '你是一个专注于个人任务规划的AI助手。你的目标是基于用户的个人资料和最近反馈，提供简洁、具体且可操作的任务建议。请使用中文回复，保持绝对简洁清晰，确保建议可直接执行。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
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
  let prompt = `请基于以下用户信息，为任务"${taskTitle}"生成三个具体的计划选项：\n\n`;
  
  // Add physical data if available
  if (userProfile.height || userProfile.weight) {
    prompt += '身体数据：\n';
    if (userProfile.height) prompt += `- 身高：${userProfile.height}\n`;
    if (userProfile.weight) prompt += `- 体重：${userProfile.weight}\n`;
  }
  
  // Add user interests, hobbies, goals
  if (userProfile.interests && userProfile.interests.length > 0) {
    prompt += `\n兴趣爱好：${userProfile.interests.join('、')}\n`;
  }
  if (userProfile.hobbies && userProfile.hobbies.length > 0) {
    prompt += `\n爱好：${userProfile.hobbies.join('、')}\n`;
  }
  if (userProfile.goals && userProfile.goals.length > 0) {
    prompt += `\n目标：${userProfile.goals.join('、')}\n`;
  }
  
  // Add recent feedback if available
  if (recentFeedback) {
    prompt += `\n最近反馈：${recentFeedback}\n`;
  }
  
  // Add notes if available
  if (userProfile.notes) {
    prompt += `\n附加说明：${userProfile.notes}\n`;
  }
  
  prompt += `\n请提供三个简洁具体的计划选项（每个1-2句话），针对这个任务的不同方法。直接明了，可立即执行。不要编号，不要解释，只需提供三个建议，每个建议用换行符分隔。请使用中文回复。`;
  
  return prompt;
}

/**
 * Parse suggestions from DeepSeek API response
 */
function parseSuggestions(content: string): string[] {
  // Split by newlines and filter out empty lines
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Ensure we have exactly three suggestions
  const suggestions = lines.slice(0, 3);
  
  // If we don't have enough suggestions, add generic ones
  while (suggestions.length < 3) {
    suggestions.push('Personalized plan based on your profile');
  }
  
  return suggestions;
} 