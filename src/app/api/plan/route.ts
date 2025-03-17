import { NextResponse } from 'next/server';

/**
 * API Route for generating task plans
 * POST /api/plan
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const { 
      taskId, 
      taskTitle, 
      selectedSuggestion, 
      userProfile, 
      implicitNeeds,
      recentFeedback,
      userContextHistory
    } = await request.json();
    
    if (!taskTitle) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    const plan = await generateDetailedPlan(
      taskTitle,
      selectedSuggestion,
      userProfile,
      implicitNeeds,
      recentFeedback,
      userContextHistory
    );
    
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('[API-Plan] Error generating plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate plan' },
      { status: 500 }
    );
  }
}

/**
 * Extract implicit needs from user profile and context history
 */
function extractImplicitNeeds(
  userProfile: any, 
  userContextHistory?: string,
  taskTitle?: string
): string[] {
  const implicitNeeds: string[] = [];
  
  // Extract from user goals
  if (userProfile.goals && Array.isArray(userProfile.goals)) {
    implicitNeeds.push(...userProfile.goals);
  }
  
  // Extract from user context history if available
  if (userContextHistory && userContextHistory.length > 0 && taskTitle) {
    // Simple keyword-based extraction
    const entries = userContextHistory.split('\n').filter(entry => entry.trim().length > 0);
    
    // Keywords from task title
    const taskKeywords = taskTitle.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    
    // Find entries that might contain implicit needs
    const relevantEntries = entries.filter(entry => {
      const lowerEntry = entry.toLowerCase();
      // Check if entry contains any task keywords
      return taskKeywords.some(keyword => lowerEntry.includes(keyword));
    });
    
    // Extract potential needs from relevant entries
    const needsRegexPatterns = [
      /\[Goal\]:\s*(.+?)(?=\n|$)/i,
      /want(?:s|ed)? to\s+(.+?)(?=\.|,|\n|$)/i,
      /need(?:s|ed)? to\s+(.+?)(?=\.|,|\n|$)/i,
      /trying to\s+(.+?)(?=\.|,|\n|$)/i,
      /aim(?:s|ed)? to\s+(.+?)(?=\.|,|\n|$)/i,
      /hope(?:s|d)? to\s+(.+?)(?=\.|,|\n|$)/i
    ];
    
    relevantEntries.forEach(entry => {
      needsRegexPatterns.forEach(pattern => {
        const match = entry.match(pattern);
        if (match && match[1]) {
          const need = match[1].trim();
          if (need.length > 0 && need.length < 100) { // Reasonable length check
            implicitNeeds.push(need);
          }
        }
      });
    });
  }
  
  // Remove duplicates and limit to top 5
  return [...new Set(implicitNeeds)].slice(0, 5);
}

/**
 * Extract relevant context from user history
 */
function extractRelevantContext(
  userContextHistory: string, 
  taskTitle: string, 
  selectedSuggestion: string = '',
  maxChars = 1000
): string {
  if (!userContextHistory || userContextHistory.length === 0) {
    return '';
  }
  
  // Split history into individual entries
  const entries = userContextHistory.split('\n').filter(entry => entry.trim().length > 0);
  if (entries.length === 0) {
    return '';
  }
  
  // Simple implementation: select entries containing keywords
  const keywordsSet = new Set<string>([
    ...taskTitle.toLowerCase().split(/\s+/),
    ...(selectedSuggestion ? selectedSuggestion.toLowerCase().split(/\s+/) : [])
  ]);
  const keywords = Array.from(keywordsSet).filter(word => word.length > 3); // Only use longer words as keywords
  
  // Score each entry based on the number of keywords it contains
  const scoredEntries = entries.map(entry => {
    const lowerEntry = entry.toLowerCase();
    // Calculate score: number of keywords found + newer entries score higher
    let score = 0;
    keywords.forEach(word => {
      if (lowerEntry.includes(word)) {
        score += 1;
      }
    });
    
    // Specific types of entries get bonus points
    if (entry.includes('[Task Feedback]')) score += 2;
    if (entry.includes('[Task Update]')) score += 1;
    if (entry.includes('[New Task]')) score += 1;
    
    return { entry, score };
  });
  
  // Sort by score and keep the most relevant entries
  scoredEntries.sort((a, b) => b.score - a.score);
  
  // Combine the most relevant entries until reaching the maximum character count
  let relevantContext = '';
  for (const { entry } of scoredEntries) {
    if (relevantContext.length + entry.length + 1 > maxChars) {
      break;
    }
    relevantContext += entry + '\n';
  }
  
  return relevantContext;
}

/**
 * Generate task plan using DeepSeek API
 */
async function generatePlan(
  taskId: string,
  taskTitle: string,
  selectedSuggestion: string,
  userProfile: any,
  implicitNeeds?: string[],
  recentFeedback?: string,
  userContextHistory?: string
): Promise<{ 
  title: string, 
  description: string, 
  subtasks: { id: string, title: string, completed: boolean }[] 
}> {
  try {
    // 添加日志显示接收到的反馈
    console.log('[API-Plan] 收到的反馈参数:', {
      taskTitle,
      selectedSuggestion,
      recentFeedback: recentFeedback ? `${recentFeedback.substring(0, 100)}${recentFeedback.length > 100 ? '...' : ''}` : '无反馈',
      hasUserContextHistory: !!userContextHistory,
      userContextHistoryLength: userContextHistory?.length || 0
    });
    
    // Construct the prompt
    const prompt = constructPlanPrompt(
      taskTitle,
      selectedSuggestion,
      userProfile,
      implicitNeeds,
      recentFeedback,
      userContextHistory
    );
    
    // 确定使用哪个模型
    const preferredModel = userProfile.preferredModel || 'gpt-4o';
    console.log('[API-Plan] 使用模型:', preferredModel);
    
    // 根据用户偏好选择不同的API配置
    let responseContent;
    if (preferredModel === 'deepseek-r1') {
      responseContent = await callDeepseekAPI(prompt);
    } else {
      responseContent = await callOpenAIAPI(prompt);
    }
    
    // 解析响应
    return parsePlanResponse(responseContent);
  } catch (error) {
    console.error('Error in generateDetailedPlan:', error);
    // 提供默认回退计划
    return {
      title: `${taskTitle} 计划`,
      description: `基于你的选择「${selectedSuggestion}」，这是一个简化的计划。`,
      subtasks: [
        { id: `subtask-${Date.now()}-1`, title: '第 1 步: 开始', completed: false },
        { id: `subtask-${Date.now()}-2`, title: '第 2 步: 执行', completed: false },
        { id: `subtask-${Date.now()}-3`, title: '第 3 步: 完成', completed: false }
      ]
    };
  }
}

/**
 * 调用 DeepSeek API
 */
async function callDeepseekAPI(prompt: string): Promise<string> {
  // Call DeepSeek API
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  
  console.log('[API-Plan] DeepSeek 请求配置:', { 
    apiUrl, 
    model, 
    apiKeyProvided: !!apiKey
  });
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个全能型任务管理专家，具备以下能力架构：\n\n【核心角色】  \n1. **领域识别者**：自动判断任务类型（健康/学习/职业等）  \n2. **风险审计员**：检测用户输入中的潜在矛盾/危险信号  \n3. **方案架构师**：生成结构化提案  \n\n【跨领域知识库】  \n- 健康管理：运动医学/营养学/康复原理  \n- 学习规划：认知科学/时间管理/知识体系构建  \n- 职业发展：OKR制定/技能迁移策略/行业趋势分析  \n\n【输出格式】\n你提供的行动项将采用：**【任务类别】X分钟 | 具体行动（量化标准）**\n- 任务类别如【写作】【研究】【练习】【优化】【整理】等\n- 包含每个行动项的预计时长\n- 具体行动需包含量化指标，描述具体可执行内容'
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
    throw new Error(`Failed to generate plan: ${response.status} ${response.statusText}`);
  }
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid response format from DeepSeek API:', data);
    throw new Error('Invalid response format from DeepSeek API');
  }
  
  return data.choices[0].message.content;
}

/**
 * 调用 OpenAI API
 */
async function callOpenAIAPI(prompt: string): Promise<string> {
  // Call OpenAI API
  const apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.OPENAI_API_KEY;
  const model = 'gpt-4o';
  
  console.log('[API-Plan] OpenAI 请求配置:', { 
    apiUrl, 
    model, 
    apiKeyProvided: !!apiKey
  });
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个全能型任务管理专家，具备以下能力架构：\n\n【核心角色】  \n1. **领域识别者**：自动判断任务类型（健康/学习/职业等）  \n2. **风险审计员**：检测用户输入中的潜在矛盾/危险信号  \n3. **方案架构师**：生成结构化提案  \n\n【跨领域知识库】  \n- 健康管理：运动医学/营养学/康复原理  \n- 学习规划：认知科学/时间管理/知识体系构建  \n- 职业发展：OKR制定/技能迁移策略/行业趋势分析  \n\n【输出格式】\n你提供的行动项将采用：**【任务类别】X分钟 | 具体行动（量化标准）**\n- 任务类别如【写作】【研究】【练习】【优化】【整理】等\n- 包含每个行动项的预计时长\n- 具体行动需包含量化指标，描述具体可执行内容'
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
    console.error('Error from OpenAI API:', data);
    throw new Error(`Failed to generate plan: ${response.status} ${response.statusText}`);
  }
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid response format from OpenAI API:', data);
    throw new Error('Invalid response format from OpenAI API');
  }
  
  return data.choices[0].message.content;
}

/**
 * Construct a prompt for generating a detailed plan
 */
function constructPlanPrompt(
  taskTitle: string,
  selectedSuggestion: string,
  userProfile: any,
  implicitNeeds?: string[],
  recentFeedback?: string,
  userContextHistory?: string
): string {
  let prompt = `请为任务「${taskTitle}」生成详细计划：\n\n`;
  
  // Add context from the selected suggestion
  prompt += `选择的建议：${selectedSuggestion}\n\n`;
  
  // Add user profile information (simplified)
  prompt += '【用户信息】\n';
  const profileInfo = [];
  if (userProfile.personality && userProfile.personality.length > 0) {
    profileInfo.push(`性格特点: ${userProfile.personality.join(', ')}`);
  }
  if (userProfile.interests && userProfile.interests.length > 0) {
    profileInfo.push(`兴趣爱好: ${userProfile.interests.join(', ')}`);
  }
  if (userProfile.healthConditions && userProfile.healthConditions.length > 0) {
    profileInfo.push(`健康状况: ${userProfile.healthConditions.join(', ')}`);
  }
  prompt += profileInfo.join('\n') + '\n\n';
  
  // Add implicit needs
  if (implicitNeeds && implicitNeeds.length > 0) {
    prompt += `【相关目标】\n${implicitNeeds.join('\n')}\n\n`;
  }
  
  // Add recent feedback if available
  if (recentFeedback) {
    prompt += `【最近反馈】\n${recentFeedback}\n\n`;
    console.log('[API-Plan] 添加最近反馈到提示:', recentFeedback.substring(0, 100) + (recentFeedback.length > 100 ? '...' : ''));
  } else {
    console.log('[API-Plan] 没有最近反馈可添加');
  }
  
  // 添加相关的用户上下文历史（如果有）
  if (userContextHistory && userContextHistory.length > 0) {
    prompt += `【用户历史上下文】\n${extractRelevantContext(userContextHistory, taskTitle, selectedSuggestion)}\n\n`;
  }
  
  // 更新输出要求为新格式
  prompt += '【输出要求】\n';
  prompt += '请为任务生成以下内容：\n';
  prompt += '1. 标题：任务的简短标题（最多12个字符）\n';
  prompt += '2. 描述：任务的简短描述（最多40个字符）\n';
  prompt += '3. 子任务清单：4-6个行动项，必须满足以下格式：\n';
  prompt += '   **【任务类别】X分钟 | 具体行动（量化标准）**\n';
  prompt += '   - 任务类别：如【写作】【研究】【练习】【优化】【整理】等\n';
  prompt += '   - 时间：每个任务的预计时长\n';
  prompt += '   - 具体行动：用量化指标描述可执行内容\n';
  prompt += '   - 只关注当天的任务执行，不要包含长期计划\n';
  prompt += '   - 避免使用"第一周"、"第二周"等长期规划表述\n';
  
  prompt += '请直接以JSON格式返回，格式如下：\n';
  prompt += '{\n';
  prompt += '  "title": "简短标题",\n';
  prompt += '  "description": "简短描述",\n';
  prompt += '  "subtasks": [\n';
  prompt += '    { "id": "ID-1", "title": "【任务类别】X分钟 | 具体行动（量化标准）", "completed": false },\n';
  prompt += '    { "id": "ID-2", "title": "【任务类别】X分钟 | 具体行动（量化标准）", "completed": false },\n';
  prompt += '    { "id": "ID-3", "title": "【任务类别】X分钟 | 具体行动（量化标准）", "completed": false }\n';
  prompt += '  ]\n';
  prompt += '}\n';
  
  return prompt;
}

/**
 * Extract relevant context from user history based on task and suggestion
 */
function extractRelevantContext(
  userContextHistory: string, 
  taskTitle: string, 
  selectedSuggestion: string,
  maxChars = 1000
): string {
  if (!userContextHistory || userContextHistory.length === 0) {
    return '';
  }
  
  // Split history into individual entries
  const entries = userContextHistory.split('\n').filter(entry => entry.trim().length > 0);
  if (entries.length === 0) {
    return '';
  }
  
  // 简单实现：选择含有关键词的条目
  const taskWordsSet = new Set<string>([
    ...taskTitle.toLowerCase().split(/\s+/),
    ...selectedSuggestion.toLowerCase().split(/\s+/)
  ]);
  const taskWords = Array.from(taskWordsSet).filter(word => word.length > 3); // 只使用较长的单词作为关键词
  
  // 给每个条目评分，根据它包含的关键词数量
  const scoredEntries = entries.map(entry => {
    const lowerEntry = entry.toLowerCase();
    // 计算分数：找到的关键词数量 + 越新的条目分数越高
    let score = 0;
    taskWords.forEach(word => {
      if (lowerEntry.includes(word)) {
        score += 1;
      }
    });
    
    // 特定类型的条目加分
    if (entry.includes('[任务反馈]')) score += 2;
    if (entry.includes('[任务更新]')) score += 1;
    if (entry.includes('[新任务]')) score += 1;
    
    return { entry, score };
  });
  
  // 根据分数排序，并保留最相关的条目
  scoredEntries.sort((a, b) => b.score - a.score);
  
  // 合并最相关的条目，直到达到最大字符数
  let relevantContext = '';
  for (const { entry } of scoredEntries) {
    if (relevantContext.length + entry.length + 1 > maxChars) {
      break;
    }
    relevantContext += entry + '\n';
  }
  
  return relevantContext;
}

/**
 * Parse the response from DeepSeek API into a structured plan
 */
function parsePlanResponse(content: string): any {
  try {
    // 尝试直接解析JSON
    // 找到JSON开始的位置
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonContent = content.substring(jsonStart, jsonEnd + 1);
      const parsedPlan = JSON.parse(jsonContent);
      
      // 确保有ID
      if (parsedPlan.subtasks && Array.isArray(parsedPlan.subtasks)) {
        parsedPlan.subtasks = parsedPlan.subtasks.map((subtask: any, index: number) => ({
          ...subtask,
          id: subtask.id || `subtask-${Date.now()}-${index + 1}`,
          completed: false
        }));
      }
      
      return parsedPlan;
    }
    
    // 如果无法解析JSON，尝试提取信息
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // 简单解析标题、描述和子任务
    let title = '';
    let description = '';
    const subtasks = [];
    
    // 查找标题和描述
    for (const line of lines) {
      if (line.toLowerCase().includes('标题') || line.toLowerCase().includes('title')) {
        title = line.split(/[:：]/).pop()?.trim() || '';
        continue;
      }
      
      if (line.toLowerCase().includes('描述') || line.toLowerCase().includes('description')) {
        description = line.split(/[:：]/).pop()?.trim() || '';
        continue;
      }
      
      // 查找子任务 - 匹配新格式【任务类别】X分钟 | 具体行动（量化标准）
      if (line.match(/【.*?】\d+分钟\s*\|\s*.*?（.*?）/) || 
          line.match(/^\d+[\.\)]\s/) || 
          line.match(/^[\-\*]\s/)) {
        
        let taskText = line;
        // 如果有编号或列表符号，去掉
        if (line.match(/^\d+[\.\)]\s/) || line.match(/^[\-\*]\s/)) {
          taskText = line.replace(/^\d+[\.\)]\s/, '').replace(/^[\-\*]\s/, '').trim();
        }
        
        if (taskText) {
          subtasks.push({
            id: `subtask-${Date.now()}-${subtasks.length + 1}`,
            title: taskText,
            completed: false
          });
        }
      }
    }
    
    // 如果未找到标题，使用任务标题
    if (!title) {
      title = "详细计划";
    }
    
    // 如果未找到描述，使用前两个子任务
    if (!description && subtasks.length >= 2) {
      description = `包含 ${subtasks.length} 个步骤的计划`;
    } else if (!description) {
      description = "分步骤完成任务";
    }
    
    return {
      title,
      description,
      subtasks: subtasks.length > 0 ? subtasks : [
        { id: `subtask-${Date.now()}-1`, title: '准备工作', completed: false },
        { id: `subtask-${Date.now()}-2`, title: '执行第一步', completed: false },
        { id: `subtask-${Date.now()}-3`, title: '完成任务', completed: false }
      ]
    };
  } catch (error) {
    console.error('[API-Plan] 解析计划响应时出错:', error);
    
    // 提供默认计划
    return {
      title: '详细计划',
      description: '分步骤完成任务',
      subtasks: [
        { id: `subtask-${Date.now()}-1`, title: '准备工作', completed: false },
        { id: `subtask-${Date.now()}-2`, title: '执行任务', completed: false },
        { id: `subtask-${Date.now()}-3`, title: '总结完成', completed: false }
      ]
    };
  }
}