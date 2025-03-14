import { NextResponse } from 'next/server';

/**
 * API Route for generating detailed task plans
 * POST /api/plan
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const { 
      taskTitle, 
      selectedSuggestion, 
      userProfile, 
      recentFeedback 
    } = await request.json();
    
    if (!taskTitle || !selectedSuggestion) {
      return NextResponse.json(
        { error: 'Task title and selected suggestion are required' },
        { status: 400 }
      );
    }

    const plan = await generateDetailedPlan(
      taskTitle,
      selectedSuggestion,
      userProfile,
      recentFeedback
    );
    
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error generating detailed plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate detailed plan' },
      { status: 500 }
    );
  }
}

/**
 * Generate detailed task plan based on user selection
 */
async function generateDetailedPlan(
  taskTitle: string,
  selectedSuggestion: string,
  userProfile: any,
  recentFeedback?: string
): Promise<{ 
  title: string, 
  description: string, 
  subtasks: { id: string, title: string, completed: boolean }[] 
}> {
  try {
    // Construct the prompt
    const prompt = constructDetailedPlanPrompt(taskTitle, selectedSuggestion, userProfile, recentFeedback);
    
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
            content: '你是一个专注于详细运动和任务规划的AI助手。请创建具体、可操作的子任务清单，确保用户可以立即执行。请使用中文回复，保持绝对简洁清晰，确保每个子任务都直接明了。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error from DeepSeek API:', data);
      throw new Error('Failed to generate detailed plan');
    }

    // Parse the response to extract the detailed plan
    return parseDetailedPlan(data.choices[0].message.content, taskTitle, selectedSuggestion);
  } catch (error) {
    console.error('Error generating detailed plan:', error);
    
    // Fallback plan in case of API failure
    return {
      title: taskTitle,
      description: `${selectedSuggestion}\n\n根据您的偏好和目标生成的计划。`,
      subtasks: [
        { id: `subtask-${Date.now()}-1`, title: '热身 5 分钟', completed: false },
        { id: `subtask-${Date.now()}-2`, title: '完成主要活动（20 分钟）', completed: false },
        { id: `subtask-${Date.now()}-3`, title: '放松和拉伸（5 分钟）', completed: false }
      ]
    };
  }
}

/**
 * Construct prompt for generating detailed plan
 */
function constructDetailedPlanPrompt(
  taskTitle: string,
  selectedSuggestion: string,
  userProfile: any,
  recentFeedback?: string
): string {
  let prompt = `请为任务"${taskTitle}"基于所选方法："${selectedSuggestion}"创建一个详细计划\n\n`;
  
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
  
  prompt += `\n请创建一个简洁的任务计划，包括：
1. 简短摘要（1-2句话）
2. 5-10个具体子任务，每个都是清晰、可执行的项目

请按以下格式回复：
摘要：[计划简短摘要]
子任务：
- [第一个子任务]
- [第二个子任务]
...等等

请使用中文回复，保持绝对简洁清晰，确保每个子任务都直接明了。`;
  
  return prompt;
}

/**
 * Parse detailed plan from DeepSeek API response
 */
function parseDetailedPlan(
  content: string, 
  taskTitle: string, 
  selectedSuggestion: string
): { 
  title: string, 
  description: string, 
  subtasks: { id: string, title: string, completed: boolean }[] 
} {
  try {
    let summary = '';
    const subtasks: { id: string, title: string, completed: boolean }[] = [];
    
    // Extract summary - using multiline string-friendly regex pattern
    const summaryMatch = content.match(/摘要：\s*([\s\S]*?)(?=\n子任务：|$)/);
    if (summaryMatch && summaryMatch[1]) {
      summary = summaryMatch[1].trim();
    }
    
    // Extract subtasks
    const subtasksMatch = content.match(/子任务：\s*([\s\S]*?)$/);
    if (subtasksMatch && subtasksMatch[1]) {
      const subtaskLines = subtasksMatch[1].split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('*'))
        .map(line => line.substring(1).trim());
      
      // Add an ID to each subtask
      subtasks.push(...subtaskLines.map((title, index) => ({
        id: `subtask-${Date.now()}-${index}`,
        title, 
        completed: false
      })));
    }
    
    // If no subtasks found, add default ones
    if (subtasks.length === 0) {
      subtasks.push(
        { id: `subtask-${Date.now()}-1`, title: '热身 5 分钟', completed: false },
        { id: `subtask-${Date.now()}-2`, title: '完成主要活动（20 分钟）', completed: false },
        { id: `subtask-${Date.now()}-3`, title: '放松和拉伸（5 分钟）', completed: false }
      );
    }
    
    return {
      title: taskTitle,
      description: summary || selectedSuggestion,
      subtasks
    };
  } catch (error) {
    console.error('Error parsing detailed plan:', error);
    return {
      title: taskTitle,
      description: selectedSuggestion,
      subtasks: [
        { id: `subtask-${Date.now()}-1`, title: '热身 5 分钟', completed: false },
        { id: `subtask-${Date.now()}-2`, title: '完成主要活动（20 分钟）', completed: false },
        { id: `subtask-${Date.now()}-3`, title: '放松和拉伸（5 分钟）', completed: false }
      ]
    };
  }
} 