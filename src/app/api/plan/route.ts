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
            content: '你是一个全能型任务管理专家，具备以下能力架构：\n\n【核心角色】  \n1. **领域识别者**：自动判断任务类型（健康/学习/职业等）  \n2. **风险审计员**：检测用户输入中的潜在矛盾/危险信号  \n3. **方案架构师**：生成结构化提案  \n\n【跨领域知识库】  \n- 健康管理：运动医学/营养学/康复原理  \n- 学习规划：认知科学/时间管理/知识体系构建  \n- 职业发展：OKR制定/技能迁移策略/行业趋势分析  \n\n【交互协议】  \n1. 提案必须包含：  \n   - 风险评估（使用❗️分级标记）  \n   - 领域交叉建议（如「学习计划与生物钟匹配度」）  \n   - 3种可选路径（保守/平衡/激进策略）  \n2. 使用类比手法解释专业概念（如「这个学习计划像金字塔，基础层是...」）'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        top_p: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.2
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
  let prompt = `请处理任务「${taskTitle}」，基于所选方案：「${selectedSuggestion}」\n\n`;
  
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
  
  // 修改输出要求，使生成的内容更符合app体验
  prompt += '【输出要求】\n';
  prompt += '▸ 输出格式：\n';
  prompt += '1. 标题：简短直接，不超过15字\n';
  prompt += '2. 描述：最多50字，只提及核心要点和注意事项\n';
  prompt += '3. 子任务清单：4-6个，每个不超过15字，必须满足以下要求：\n';
  prompt += '   - 只关注当天的任务执行，不要包含长期计划\n';
  prompt += '   - 每个子任务都应该简洁明了，像app的选项一样\n';
  prompt += '   - 不要使用多余的修饰语，直接表达核心动作\n';
  prompt += '   - 不要包含无关的长期目标(如马拉松训练/语言学习等)，除非与当天任务直接相关\n';
  prompt += '   - 避免使用"第一周"、"第二周"等长期规划表述\n';
  
  prompt += '▸ 子任务格式范例：\n';
  prompt += '设置6PM提醒\n';
  prompt += '准备无糖饮料\n';
  prompt += '记录饥饿感受\n';
  prompt += '保持水分摄入\n';
  
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
    console.log('[API-Plan] 解析原始内容:', content);
    
    // Extract title
    let title = taskTitle;
    const titleMatch = content.match(/##\s*(.*?)(?=\n|$)/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    // Extract description (including method logic and notes)
    let description = '';
    
    // Extract method logic
    const logicMatch = content.match(/###\s*方案逻辑\s*([\s\S]*?)(?=###|$)/);
    if (logicMatch && logicMatch[1]) {
      description += logicMatch[1].trim();
    }
    
    // Extract notes/risks
    const notesMatch = content.match(/###\s*注意事项\s*([\s\S]*?)(?=###|$)/);
    if (notesMatch && notesMatch[1]) {
      if (description) description += ' ';
      description += notesMatch[1].trim();
    }
    
    // If no description was extracted, use the selected suggestion
    if (!description) {
      description = selectedSuggestion;
    }
    
    // 限制描述长度
    if (description.length > 100) {
      description = description.substring(0, 97) + '...';
    }
    
    // Extract subtasks - 简化提取方式，更适合简短的子任务
    const subtasks: { id: string, title: string, completed: boolean }[] = [];
    const subtasksListPattern = /###\s*子任务清单\s*([\s\S]*?)(?=###|$)/;
    const subtasksMatch = content.match(subtasksListPattern);
    
    if (subtasksMatch && subtasksMatch[1]) {
      const subtaskList = subtasksMatch[1].split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        // 简化子任务内容，移除前缀和一些冗余标记
        .map(line => line.replace(/^[-*\d\.\[\]]\s*(\[.\])?\s*/, '').trim())
        .filter(line => line.length > 0 && line.length <= 30);
      
      // 只保留4-6个子任务
      const maxTasks = Math.min(6, subtaskList.length);
      for (let i = 0; i < maxTasks; i++) {
        subtasks.push({
          id: `subtask-${Date.now()}-${i}`,
          title: subtaskList[i],
          completed: false
        });
      }
    }
    
    console.log('[API-Plan] 提取结果:', { title, description: description.substring(0, 30) + '...', subtasksCount: subtasks.length });
    
    // 如果没有提取到子任务，创建基本任务
    if (subtasks.length === 0) {
      const defaultSubtasks = [
        '设置6PM提醒',
        '准备无糖饮料',
        '记录饥饿感受',
        '保持水分摄入'
      ];
      
      defaultSubtasks.forEach((task, index) => {
        subtasks.push({
          id: `subtask-${Date.now()}-${index}`,
          title: task,
          completed: false
        });
      });
    }
    
    return {
      title,
      description,
      subtasks
    };
  } catch (error) {
    console.error('[API-Plan] 解析详细计划时出错:', error);
    
    // Fallback plan in case of API failure
    return {
      title: taskTitle,
      description: selectedSuggestion,
      subtasks: [
        { id: `subtask-${Date.now()}-1`, title: '设置提醒', completed: false },
        { id: `subtask-${Date.now()}-2`, title: '准备应对策略', completed: false },
        { id: `subtask-${Date.now()}-3`, title: '记录执行情况', completed: false },
        { id: `subtask-${Date.now()}-4`, title: '调整时间安排', completed: false }
      ]
    };
  }
} 