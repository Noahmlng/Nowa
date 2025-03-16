/**
 * aiUtils.ts
 * 
 * Utility functions for interacting with DeepSeek AI API
 */

/**
 * Task types and their characteristics for template selection
 */
const TASK_TYPES = {
  work: {
    keywords: ['work', 'job', 'project', 'deadline', 'meeting', 'presentation', 'client', 'report', 'email'],
    structure: ['planning', 'research', 'preparation', 'execution', 'review'],
    typical_risks: ['time constraints', 'resource limitations', 'stakeholder expectations', 'technical challenges']
  },
  learning: {
    keywords: ['learn', 'study', 'course', 'read', 'book', 'education', 'skill', 'practice', 'knowledge'],
    structure: ['understanding goals', 'gathering resources', 'structured learning', 'practical application', 'review'],
    typical_risks: ['complexity', 'time management', 'staying motivated', 'information overload']
  },
  health: {
    keywords: ['health', 'exercise', 'workout', 'diet', 'nutrition', 'medical', 'doctor', 'fitness', 'wellbeing'],
    structure: ['assessment', 'goal setting', 'scheduling', 'execution', 'tracking progress'],
    typical_risks: ['injury', 'burnout', 'consistency challenges', 'technique issues']
  }
};

/**
 * Detect task type based on title and description
 */
function detectTaskType(taskTitle: string): 'work' | 'learning' | 'health' | 'other' {
  const lowerTitle = taskTitle.toLowerCase();
  
  // Check each task type for keyword matches
  for (const [type, metadata] of Object.entries(TASK_TYPES)) {
    if (metadata.keywords.some(keyword => lowerTitle.includes(keyword))) {
      console.log(`[aiUtils] Detected task type: ${type} for "${taskTitle}"`);
      return type as 'work' | 'learning' | 'health';
    }
  }
  
  // Default to other if no specific type is detected
  console.log(`[aiUtils] No specific type detected for "${taskTitle}", using "other"`);
  return 'other';
}

/**
 * Generate task suggestions based on user profile and task information
 * 
 * @param taskTitle - The title of the newly created task
 * @param userProfile - The user's profile information
 * @param recentFeedback - Recent task feedback if available
 * @returns Array of three task plan suggestions
 */
export async function generateTaskSuggestions(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): Promise<string[]> {
  try {
    // Construct the prompt for DeepSeek AI
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
            content: 'You are an AI assistant specializing in personal task planning. Your goal is to provide concise, specific, and actionable suggestions for tasks based on the user\'s profile and recent feedback.'
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

    // Parse the response to extract the three suggestions
    const suggestions = parseSuggestions(data.choices[0].message.content);
    return suggestions;
  } catch (error) {
    console.error('Error generating task suggestions:', error);
    return [
      'Personalized exercise plan based on your goals',
      'Recovery-focused training due to your recent hip pain',
      'Endurance-building cardio workout'
    ];
  }
}

/**
 * Generate detailed task plan based on user selection
 * 
 * @param taskTitle - The title of the task
 * @param selectedSuggestion - The suggestion selected by the user
 * @param userProfile - The user's profile information
 * @param recentFeedback - Recent task feedback if available
 * @returns Detailed plan with subtasks
 */
export async function generateDetailedPlan(
  taskTitle: string,
  selectedSuggestion: string,
  userProfile: any,
  recentFeedback?: string
): Promise<{ title: string, description: string, subtasks: { id: string, title: string, completed: boolean }[] }> {
  try {
    // Construct the prompt for DeepSeek AI
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
            content: 'You are an AI assistant specializing in detailed exercise and task planning. Create specific, actionable subtask lists that are highly executable.'
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
      description: `${selectedSuggestion}\n\nGenerated plan based on your preferences and goals.`,
      subtasks: [
        { id: `subtask-${Date.now()}-1`, title: 'Warm up for 5 minutes', completed: false },
        { id: `subtask-${Date.now()}-2`, title: 'Complete main activity (20 minutes)', completed: false },
        { id: `subtask-${Date.now()}-3`, title: 'Cool down and stretch (5 minutes)', completed: false }
      ]
    };
  }
}

/**
 * Construct prompt for generating task suggestions with dynamic templates
 */
function constructSuggestionPrompt(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): string {
  console.log(`[aiUtils] Constructing suggestion prompt for: ${taskTitle}`);
  
  // Detect task type
  const taskType = detectTaskType(taskTitle);
  
  // Select template structure based on task type
  let promptTemplate = '';
  switch(taskType) {
    case 'work':
      promptTemplate = workSuggestionTemplate(taskTitle, userProfile, recentFeedback);
      break;
    case 'learning':
      promptTemplate = learningSuggestionTemplate(taskTitle, userProfile, recentFeedback);
      break;
    case 'health':
      promptTemplate = healthSuggestionTemplate(taskTitle, userProfile, recentFeedback);
      break;
    default:
      promptTemplate = generalSuggestionTemplate(taskTitle, userProfile, recentFeedback);
  }
  
  console.log(`[aiUtils] Using ${taskType} template for suggestions`);
  
  return promptTemplate;
}

/**
 * Work-specific suggestion template
 */
function workSuggestionTemplate(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): string {
  let prompt = `请针对工作任务「${taskTitle}」提供三种不同侧重点的方案：\n\n`;
  
  // Add user profile information
  prompt += '【用户画像】\n';
  prompt += '◆ 基础档案：';
  const basicInfo = [];
  if (userProfile.age) basicInfo.push(`年龄 ${userProfile.age}`);
  if (userProfile.occupation) basicInfo.push(`职业 ${userProfile.occupation}`);
  if (userProfile.location) basicInfo.push(`地理位置 ${userProfile.location}`);
  prompt += basicInfo.join('、') + '\n';
  
  // Add work-specific context
  prompt += '◆ 工作特征：';
  const workTraits = [];
  if (userProfile.strengths) {
    const workStrengths = userProfile.strengths.filter((s: string) => 
      ['organized', 'detail-oriented', 'strategic', 'creative', 'analytical'].includes(s.toLowerCase())
    );
    if (workStrengths.length > 0) workTraits.push(`优势 ${workStrengths.join('、')}`);
  }
  if (userProfile.weaknesses) {
    const workWeaknesses = userProfile.weaknesses.filter((w: string) => 
      ['procrastination', 'distraction', 'planning', 'delegation'].includes(w.toLowerCase())
    );
    if (workWeaknesses.length > 0) workTraits.push(`短板 ${workWeaknesses.join('、')}`);
  }
  prompt += workTraits.join('、') + '\n';
  
  // Add historical trajectory with work focus
  prompt += '◆ 历史轨迹：';
  if (recentFeedback) {
    // Filter feedback to focus on work-relevant aspects
    const workRelevantFeedback = recentFeedback
      .split('.')
      .filter(sentence => 
        TASK_TYPES.work.keywords.some(keyword => 
          sentence.toLowerCase().includes(keyword)
        )
      )
      .join('. ');
    
    prompt += workRelevantFeedback || recentFeedback;
  } else {
    prompt += '无历史记录';
  }
  prompt += '\n\n';
  
  // Add task context
  prompt += '【任务上下文】\n';
  prompt += `★ 显性需求：${taskTitle}\n`;
  
  // Add work-specific implicit needs
  prompt += '★ 隐性需求：';
  if (userProfile.goals) {
    const workGoals = userProfile.goals.filter((g: string) => 
      TASK_TYPES.work.keywords.some(keyword => g.toLowerCase().includes(keyword))
    );
    prompt += workGoals.join('、') || '提高工作效率与质量';
  } else {
    prompt += '提高工作效率与质量';
  }
  prompt += '\n';
  
  // Add work-specific constraints
  prompt += '★ 约束条件：';
  const constraints = [];
  if (userProfile.timeConstraints) constraints.push(`时间 ${userProfile.timeConstraints}`);
  if (userProfile.resourceConstraints) constraints.push(`资源 ${userProfile.resourceConstraints}`);
  prompt += constraints.length > 0 ? constraints.join('、') : '工作时间与资源有限';
  prompt += '\n\n';
  
  // Add interaction mode with focus on professional output
  prompt += '【交互模式】\n';
  prompt += '▸ 输出格式：提供3个差异化方案，每个方案包含:\n';
  prompt += '  1. 问题引导（以"您是否需要..."开头的问题）\n';
  prompt += '  2. 简洁方案描述（10-15字）\n';
  prompt += '▸ 方案差异化：\n';
  prompt += '  • 方案1：侧重效率与速度\n';
  prompt += '  • 方案2：侧重质量与完整性\n'; 
  prompt += '  • 方案3：侧重创新与差异化\n';
  prompt += '▸ 语气要求：专业、简洁、实用\n';
  prompt += '▸ 输出示例：\n';
  prompt += '1. 您是否需要快速完成？精简交付方案\n';
  prompt += '2. 您是否追求完美？全面质量方案\n';
  prompt += '3. 您是否寻求突破？创新差异化方案\n';

  return prompt;
}

/**
 * Learning-specific suggestion template
 */
function learningSuggestionTemplate(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): string {
  let prompt = `请针对学习任务「${taskTitle}」提供三种不同学习方法的方案：\n\n`;
  
  // Add user profile information
  prompt += '【用户画像】\n';
  prompt += '◆ 基础档案：';
  const basicInfo = [];
  if (userProfile.age) basicInfo.push(`年龄 ${userProfile.age}`);
  if (userProfile.occupation) basicInfo.push(`职业 ${userProfile.occupation}`);
  prompt += basicInfo.join('、') + '\n';
  
  // Add learning-specific context
  prompt += '◆ 学习特征：';
  const learningTraits = [];
  if (userProfile.interests && userProfile.interests.length > 0) {
    learningTraits.push(`兴趣领域 ${userProfile.interests.join('、')}`);
  }
  if (userProfile.strengths) {
    const learningStrengths = userProfile.strengths.filter((s: string) => 
      ['focused', 'analytical', 'visual', 'auditory', 'kinesthetic'].includes(s.toLowerCase())
    );
    if (learningStrengths.length > 0) learningTraits.push(`学习优势 ${learningStrengths.join('、')}`);
  }
  prompt += learningTraits.join('、') + '\n';
  
  // Add historical trajectory with learning focus
  prompt += '◆ 历史轨迹：';
  if (recentFeedback) {
    // Filter feedback to focus on learning-relevant aspects
    const learningRelevantFeedback = recentFeedback
      .split('.')
      .filter(sentence => 
        TASK_TYPES.learning.keywords.some(keyword => 
          sentence.toLowerCase().includes(keyword)
        )
      )
      .join('. ');
    
    prompt += learningRelevantFeedback || recentFeedback;
  } else {
    prompt += '无历史记录';
  }
  prompt += '\n\n';
  
  // Add task context
  prompt += '【任务上下文】\n';
  prompt += `★ 显性需求：${taskTitle}\n`;
  
  // Add learning-specific implicit needs
  prompt += '★ 隐性需求：';
  if (userProfile.goals) {
    const learningGoals = userProfile.goals.filter((g: string) => 
      TASK_TYPES.learning.keywords.some(keyword => g.toLowerCase().includes(keyword))
    );
    prompt += learningGoals.join('、') || '有效吸收知识并应用';
  } else {
    prompt += '有效吸收知识并应用';
  }
  prompt += '\n';
  
  // Add learning-specific constraints
  prompt += '★ 约束条件：';
  const constraints = [];
  if (userProfile.timeConstraints) constraints.push(`时间 ${userProfile.timeConstraints}`);
  prompt += constraints.length > 0 ? constraints.join('、') : '学习时间有限，需要高效方法';
  prompt += '\n\n';
  
  // Add interaction mode with focus on learning styles
  prompt += '【交互模式】\n';
  prompt += '▸ 输出格式：提供3个差异化学习方案，每个方案包含:\n';
  prompt += '  1. 问题引导（以"您喜欢..."开头的问题）\n';
  prompt += '  2. 简洁方案描述（10-15字）\n';
  prompt += '▸ 方案差异化：\n';
  prompt += '  • 方案1：结构化学习路径\n';
  prompt += '  • 方案2：实践导向学习\n'; 
  prompt += '  • 方案3：社交互动学习\n';
  prompt += '▸ 语气要求：鼓励、支持、清晰\n';
  prompt += '▸ 输出示例：\n';
  prompt += '1. 您喜欢系统掌握？结构化学习计划\n';
  prompt += '2. 您喜欢边做边学？项目实践学习法\n';
  prompt += '3. 您喜欢互动交流？学习小组讨论法\n';

  return prompt;
}

/**
 * Health-specific suggestion template
 */
function healthSuggestionTemplate(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): string {
  let prompt = `请针对健康任务「${taskTitle}」提供三种适合的健康方案：\n\n`;
  
  // Add user profile information with health focus
  prompt += '【用户画像】\n';
  prompt += '◆ 身体数据：';
  const physicalInfo = [];
  if (userProfile.height) physicalInfo.push(`身高 ${userProfile.height}`);
  if (userProfile.weight) physicalInfo.push(`体重 ${userProfile.weight}`);
  prompt += physicalInfo.join('、') + '\n';
  
  // Add health-specific context
  prompt += '◆ 健康特征：';
  const healthTraits = [];
  if (userProfile.hobbies) {
    const activeHobbies = userProfile.hobbies.filter((h: string) => 
      ['running', 'swimming', 'cycling', 'hiking', 'yoga', 'gym'].includes(h.toLowerCase())
    );
    if (activeHobbies.length > 0) healthTraits.push(`活动爱好 ${activeHobbies.join('、')}`);
  }
  if (userProfile.notes && userProfile.notes.toLowerCase().includes('health')) {
    healthTraits.push(`健康笔记 ${userProfile.notes}`);
  }
  prompt += healthTraits.join('、') + '\n';
  
  // Add historical trajectory with health focus
  prompt += '◆ 历史轨迹：';
  if (recentFeedback) {
    // Filter feedback to focus on health-relevant aspects
    const healthRelevantFeedback = recentFeedback
      .split('.')
      .filter(sentence => 
        TASK_TYPES.health.keywords.some(keyword => 
          sentence.toLowerCase().includes(keyword)
        )
      )
      .join('. ');
    
    prompt += healthRelevantFeedback || recentFeedback;
  } else {
    prompt += '无历史记录';
  }
  prompt += '\n\n';
  
  // Add task context
  prompt += '【任务上下文】\n';
  prompt += `★ 显性需求：${taskTitle}\n`;
  
  // Add health-specific implicit needs
  prompt += '★ 隐性需求：';
  if (userProfile.goals) {
    const healthGoals = userProfile.goals.filter((g: string) => 
      TASK_TYPES.health.keywords.some(keyword => g.toLowerCase().includes(keyword))
    );
    prompt += healthGoals.join('、') || '提升健康水平与身心状态';
  } else {
    prompt += '提升健康水平与身心状态';
  }
  prompt += '\n';
  
  // Add health-specific constraints
  prompt += '★ 约束条件：';
  const constraints = [];
  if (userProfile.timeConstraints) constraints.push(`时间 ${userProfile.timeConstraints}`);
  if (userProfile.restrictions) constraints.push(`限制 ${userProfile.restrictions.join('、')}`);
  prompt += constraints.length > 0 ? constraints.join('、') : '需要安全有效的方法';
  prompt += '\n\n';
  
  // Add interaction mode with focus on health and wellbeing
  prompt += '【交互模式】\n';
  prompt += '▸ 输出格式：提供3个差异化健康方案，每个方案包含:\n';
  prompt += '  1. 问题引导（以"您想要..."开头的问题）\n';
  prompt += '  2. 简洁方案描述（10-15字）\n';
  prompt += '▸ 方案差异化：\n';
  prompt += '  • 方案1：温和循序渐进\n';
  prompt += '  • 方案2：平衡全面发展\n'; 
  prompt += '  • 方案3：挑战性目标导向\n';
  prompt += '▸ 语气要求：关怀、支持、专业\n';
  prompt += '▸ 输出示例：\n';
  prompt += '1. 您想要循序渐进？温和调整健康计划\n';
  prompt += '2. 您想要全面提升？平衡饮食运动方案\n';
  prompt += '3. 您想要突破自我？高强度训练计划\n';

  return prompt;
}

/**
 * General/Other suggestion template for tasks that don't fit specific categories
 */
function generalSuggestionTemplate(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): string {
  let prompt = `请针对任务「${taskTitle}」提供三种不同的解决方案：\n\n`;
  
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
  if (recentFeedback) {
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
  
  // Add interaction mode
  prompt += '【交互模式】\n';
  prompt += '▸ 输出格式：提供3个差异化方案，每个方案包含:\n';
  prompt += '  1. 问题引导（以问句开头）\n';
  prompt += '  2. 简洁方案描述（10-15字）\n';
  prompt += '▸ 方案差异化：\n';
  prompt += '  • 方案1：简单快速\n';
  prompt += '  • 方案2：全面平衡\n'; 
  prompt += '  • 方案3：创新突破\n';
  prompt += '▸ 语气要求：友好、专业、支持\n';
  prompt += '▸ 输出示例：\n';
  prompt += '1. 想快速完成吗？简易行动方案\n';
  prompt += '2. 需要全面考虑？平衡综合方案\n';
  prompt += '3. 想要创新突破？差异化思维方案\n';

  return prompt;
}

/**
 * Construct prompt for generating detailed plan with enhanced structure
 */
function constructDetailedPlanPrompt(
  taskTitle: string,
  selectedSuggestion: string,
  userProfile: any,
  recentFeedback?: string
): string {
  console.log(`[aiUtils] Constructing detailed plan prompt for: ${taskTitle}`);
  
  // Detect task type
  const taskType = detectTaskType(taskTitle);
  
  // Add structure guidance based on task type
  let structureGuidance = '';
  switch(taskType) {
    case 'work':
      structureGuidance = `方案结构应包含：目标定义→资源整合→执行计划→验收标准→时间安排`;
      break;
    case 'learning':
      structureGuidance = `方案结构应包含：学习目标→知识点拆解→学习资源→实践应用→复习巩固`;
      break;
    case 'health':
      structureGuidance = `方案结构应包含：健康评估→目标设定→循序渐进→执行计划→进度追踪`;
      break;
    default:
      structureGuidance = `方案结构应包含：目标→资源→步骤→时间→评估`;
  }
  
  // Construct the detailed plan prompt
  let prompt = `请详细规划任务「${taskTitle}」，基于所选方案：「${selectedSuggestion}」\n\n`;
  
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
  
  // Add historical trajectory with enhanced context
  prompt += '◆ 历史轨迹：';
  if (recentFeedback) {
    // Add interpretation of the feedback
    prompt += `${recentFeedback}\n`;
    prompt += '基于您的历史反馈，特别关注：';
    
    // Extract key feedback themes
    if (recentFeedback.toLowerCase().includes('difficult') || 
        recentFeedback.toLowerCase().includes('challenge')) {
      prompt += '降低困难度、';
    }
    
    if (recentFeedback.toLowerCase().includes('time') || 
        recentFeedback.toLowerCase().includes('quick')) {
      prompt += '优化时间利用、';
    }
    
    if (recentFeedback.toLowerCase().includes('quality') || 
        recentFeedback.toLowerCase().includes('detailed')) {
      prompt += '保证质量、';
    }
    
    // Remove trailing comma
    prompt = prompt.replace(/、$/g, '');
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
  
  // Add interaction mode with enhanced structure guidance
  prompt += '【交互模式】\n';
  prompt += '▸ 输出格式：使用Markdown格式，包含以下部分：\n';
  prompt += '  1. 方案标题（简短明了）\n';
  prompt += '  2. 方案逻辑（简要说明原理和预期效果）\n';
  prompt += '  3. 注意事项（使用❗标记风险等级）\n';
  prompt += '  4. 子任务清单（使用Markdown任务列表格式）\n';
  prompt += `▸ 内容要求：${structureGuidance}\n`;
  prompt += '▸ 语气要求：专业、亲切、激励\n\n';
  
  prompt += `请按以下Markdown格式回复：

## 方案标题

### 方案逻辑
简要说明方案原理和预期效果...

### 注意事项
- ❗风险提示1
- ❗❗风险提示2（更高风险）

### 子任务清单
- [ ] 子任务1
- [ ] 子任务2
- [ ] 子任务3
...等等

请确保每个子任务都直接明了且可执行，纯文本形式。每个子任务应包含完成时间建议。`;
  
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

/**
 * Parse detailed plan from DeepSeek API response
 */
function parseDetailedPlan(
  content: string, 
  taskTitle: string, 
  selectedSuggestion: string
): { title: string, description: string, subtasks: { id: string, title: string, completed: boolean }[] } {
  try {
    let summary = '';
    const subtasks: { id: string, title: string, completed: boolean }[] = [];
    
    // Extract summary - using multiline string-friendly regex pattern
    const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=\nSUBTASKS:|$)/);
    if (summaryMatch && summaryMatch[1]) {
      summary = summaryMatch[1].trim();
    }
    
    // Extract subtasks
    const subtasksMatch = content.match(/SUBTASKS:\s*([\s\S]*?)$/);
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
        { id: `subtask-${Date.now()}-1`, title: 'Warm up for 5 minutes', completed: false },
        { id: `subtask-${Date.now()}-2`, title: 'Complete main activity (20 minutes)', completed: false },
        { id: `subtask-${Date.now()}-3`, title: 'Cool down and stretch (5 minutes)', completed: false }
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
        { id: `subtask-${Date.now()}-1`, title: 'Warm up for 5 minutes', completed: false },
        { id: `subtask-${Date.now()}-2`, title: 'Complete main activity (20 minutes)', completed: false },
        { id: `subtask-${Date.now()}-3`, title: 'Cool down and stretch (5 minutes)', completed: false }
      ]
    };
  }
} 