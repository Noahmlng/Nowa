import { NextResponse } from 'next/server';

/**
 * API Route for generating task suggestions
 * POST /api/suggestions
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const { taskTitle, userProfile, implicitNeeds, recentFeedback, userContextHistory } = await request.json();
    
    if (!taskTitle) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    const suggestions = await generateSuggestions(taskTitle, userProfile, implicitNeeds, recentFeedback, userContextHistory);
    
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
  implicitNeeds?: string[],
  recentFeedback?: string,
  userContextHistory?: string
): Promise<string[]> {
  try {
    // Construct the prompt
    const prompt = constructSuggestionPrompt(taskTitle, userProfile, implicitNeeds, recentFeedback, userContextHistory);
    console.log('[API-Suggestions] 构建的提示词:', prompt.substring(0, 200) + '...');
    
    // 请求配置
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    console.log('[API-Suggestions] 请求配置:', { 
      apiUrl, 
      model, 
      apiKeyProvided: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0
    });
    
    // Call DeepSeek API
    const requestBody = {
      model: model,
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
    };
    
    console.log('[API-Suggestions] 发送请求...');
    const startTime = Date.now();
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseTime = Date.now() - startTime;
    console.log(`[API-Suggestions] 收到响应: 状态=${response.status}, 耗时=${responseTime}ms`);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[API-Suggestions] DeepSeek API 错误:', data);
      throw new Error(`Failed to generate task suggestions: ${response.status} ${response.statusText}`);
    }

    console.log('[API-Suggestions] 解析响应数据...');
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[API-Suggestions] 返回的数据格式不正确:', data);
      throw new Error('Invalid response format from DeepSeek API');
    }

    // Parse the response to extract suggestions
    const suggestions = parseSuggestions(data.choices[0].message.content, taskTitle);
    console.log('[API-Suggestions] 解析后的建议:', suggestions);
    
    return suggestions;
  } catch (error) {
    console.error('[API-Suggestions] 生成建议时出错:', error);
    // Fallback suggestions
    return getDefaultSuggestions(taskTitle);
  }
}

/**
 * 获取默认建议选项
 */
function getDefaultSuggestions(taskTitle: string): string[] {
  if (/运动|锻炼|有氧|跑步/.test(taskTitle)) {
    return ['慢跑', '室内单车', '健身操'];
  } else if (/饮食|禁食|6pm/.test(taskTitle)) {
    return ['喝水', '嚼无糖口香糖', '吃蔬菜'];
  } else if (/学习|读书|复习|写作/.test(taskTitle)) {
    return ['番茄工作法', '闪卡复习', '思维导图'];
  } else {
    return ['方案A', '方案B', '方案C'];
  }
}

/**
 * Construct prompt for generating task suggestions
 */
function constructSuggestionPrompt(
  taskTitle: string,
  userProfile: any,
  implicitNeeds?: string[],
  recentFeedback?: string,
  userContextHistory?: string
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
  
  // Add special conditions (health, work, learning, etc.)
  prompt += '◆ 特殊状况：';
  if (userProfile.healthConditions && userProfile.healthConditions.length > 0) {
    prompt += `健康：${userProfile.healthConditions.join('、')}`;
  }
  if (userProfile.workConditions && userProfile.workConditions.length > 0) {
    prompt += `工作：${userProfile.workConditions.join('、')}`;
  }
  if (userProfile.learningConditions && userProfile.learningConditions.length > 0) {
    prompt += `学习：${userProfile.learningConditions.join('、')}`;
  }
  if (!userProfile.healthConditions && !userProfile.workConditions && !userProfile.learningConditions) {
    prompt += '无特殊状况';
  }
  prompt += '\n';
  
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
  
  // Add implicit needs based on active goals, 使用从前端传来的implicitNeeds
  prompt += '★ 隐性需求：';
  if (implicitNeeds && implicitNeeds.length > 0) {
    prompt += implicitNeeds.join('、');
  } else if (userProfile.goals && userProfile.goals.length > 0) {
    // 如果没有传入implicitNeeds，则使用userProfile.goals作为后备
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
  
  // 添加注意事项，关注当前任务和隐性需求的关系
  if (implicitNeeds && implicitNeeds.length > 0) {
    prompt += '【注意事项】\n';
    prompt += `★ 当前任务与用户长期目标的关系：请考虑当前任务"${taskTitle}"如何与用户的隐性需求(${implicitNeeds.join('、')})建立关联。\n`;
    prompt += '★ 优先考虑最相关的目标：在生成建议时，请优先考虑与当前任务最相关的目标，而不是考虑所有目标。\n\n';
  }
  
  // 添加相关的用户上下文历史（如果有）
  if (userContextHistory && userContextHistory.length > 0) {
    // 使用与plan API相同的方法提取相关上下文
    const relevantContext = extractRelevantContext(userContextHistory, taskTitle, '');
    if (relevantContext.length > 0) {
      prompt += '【用户历史上下文】\n';
      prompt += relevantContext + '\n\n';
    }
  }
  
  // 修改输出要求为同一维度下的不同选项
  prompt += '【输出要求】\n';
  prompt += '1. 分析任务，确定对这个任务最重要的一个核心维度\n';
  prompt += '2. 在该维度下，提供三个不同的具体选项\n';
  prompt += '3. 每个选项必须：\n';
  prompt += `   - 都与当天任务"${taskTitle}"直接相关\n`;
  prompt += '   - 长度控制在10字以内\n';
  prompt += '   - 像app选项一样简洁明了\n';
  prompt += '   - 避免啰嗦的解释和修饰词\n';
  prompt += '4. 三个选项应该：\n';
  prompt += '   - 属于同一维度（如都是运动类型、都是执行方式等）\n';
  prompt += '   - 互相排他（用户只能选择其中一个）\n';
  prompt += '   - 考虑用户情况和偏好\n';
  prompt += '   - 可能与用户的隐性需求/长期目标保持一致\n';
  prompt += '5. 直接输出三行文本，每行一个选项，无需额外解释\n';
  prompt += '6. 示例输出格式：\n';
  
  // 根据任务类型提供适当的示例
  if (taskTitle.includes('运动') || taskTitle.includes('锻炼') || taskTitle.includes('有氧')) {
    // 运动类型选项示例
    prompt += '跳绳\n慢跑\n室内单车\n';
  } else if (taskTitle.includes('6pm') || taskTitle.includes('饮食') || taskTitle.includes('禁食')) {
    // 饮食管理方式选项
    prompt += '喝水缓解饥饿\n嚼无糖口香糖\n准备低热量蔬菜\n';
  } else if (taskTitle.includes('学习') || taskTitle.includes('读书')) {
    // 学习方法选项
    prompt += '番茄工作法\n闪卡记忆\n思维导图\n';
  } else {
    // 通用选项
    prompt += '选项A\n选项B\n选项C\n';
  }
  
  return prompt;
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
  
  // 简单实现：选择含有关键词的条目
  const keywordsSet = new Set<string>([
    ...taskTitle.toLowerCase().split(/\s+/),
    ...(selectedSuggestion ? selectedSuggestion.toLowerCase().split(/\s+/) : [])
  ]);
  const keywords = Array.from(keywordsSet).filter(word => word.length > 3); // 只使用较长的单词作为关键词
  
  // 给每个条目评分，根据它包含的关键词数量
  const scoredEntries = entries.map(entry => {
    const lowerEntry = entry.toLowerCase();
    // 计算分数：找到的关键词数量 + 越新的条目分数越高
    let score = 0;
    keywords.forEach(word => {
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
 * Parse suggestions from DeepSeek API response
 */
function parseSuggestions(content: string, taskTitle: string): string[] {
  try {
    console.log('[API-Suggestions] 原始内容:', content);
    
    // 简化解析，只提取简短的选项
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length <= 12) // 控制长度更严格
      // 移除任何行首的标记、序号等
      .map(line => line.replace(/^([0-9]+\.|\*|\-|>|#|【|】)\s*/, ''))
      .map(line => line.replace(/^\*\*|\*\*$/g, ''))
      // 过滤掉空行、太短的行、包含标点的行
      .filter(line => line.length >= 2 && 
                      !line.includes(':') && 
                      !line.includes('：') &&
                      !line.includes('维度') &&
                      !line.includes('选项') &&
                      !line.includes('建议'));
    
    console.log('[API-Suggestions] 清理后的行:', lines);
    
    // 提取最多3个简洁选项
    const suggestions: string[] = [];
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      suggestions.push(lines[i]);
    }
    
    // 补充不足的选项（针对任务类型）
    const defaultSuggestions = getDefaultSuggestions(taskTitle);
    
    while (suggestions.length < 3) {
      suggestions.push(defaultSuggestions[suggestions.length % defaultSuggestions.length]);
    }
    
    console.log('[API-Suggestions] 最终选项:', suggestions);
    return suggestions;
  } catch (error) {
    console.error('[API-Suggestions] 解析建议时出错:', error);
    return getDefaultSuggestions(taskTitle);
  }
}

/**
 * Evaluate the relevance of a suggestion to a task
 */
function evaluateRelevance(suggestion: string, taskTitle: string): number {
  // Implementation of relevance evaluation logic
  // This is a placeholder and should be replaced with actual implementation
  return 0.8; // Placeholder return, actual implementation needed
} 