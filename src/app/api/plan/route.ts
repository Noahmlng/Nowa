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
      userContextHistory 
    } = await request.json();
    
    if (!taskTitle) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    // Extract implicit needs from user profile and context history
    const implicitNeeds = extractImplicitNeeds(userProfile, userContextHistory, taskTitle);
    console.log('[API-Plan] Extracted implicit needs:', implicitNeeds);

    // Extract relevant context from user history
    let relevantContext = '';
    if (userContextHistory) {
      relevantContext = extractRelevantContext(userContextHistory, taskTitle, selectedSuggestion);
      console.log('[API-Plan] Extracted relevant context length:', relevantContext.length);
    }

    // Generate plan
    const plan = await generatePlan(
      taskId,
      taskTitle, 
      selectedSuggestion, 
      userProfile, 
      implicitNeeds,
      relevantContext
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
  implicitNeeds: string[],
  relevantContext: string
): Promise<string> {
  try {
    // Construct the prompt
    const prompt = constructPlanPrompt(
      taskId, 
      taskTitle, 
      selectedSuggestion, 
      userProfile, 
      implicitNeeds,
      relevantContext
    );
    console.log('[API-Plan] Constructed prompt:', prompt.substring(0, 200) + '...');
    
    // Request configuration
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    console.log('[API-Plan] Request configuration:', { 
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
          content: 'You are a comprehensive task management expert with the following capabilities:\n\n【Core Roles】  \n1. **Domain Identifier**: Automatically determine task type (health/learning/career etc.)  \n2. **Risk Auditor**: Detect potential contradictions/danger signals in user input  \n3. **Solution Architect**: Generate structured proposals  \n\n【Cross-domain Knowledge Base】  \n- Health Management: Sports Medicine/Nutrition/Rehabilitation Principles  \n- Learning Planning: Cognitive Science/Time Management/Knowledge System Construction  \n- Career Development: OKR Formulation/Skill Transfer Strategy/Industry Trend Analysis  \n\n【Interaction Protocol】  \n1. Proposals must include:  \n   - Risk assessment (marked with ❗️ grading)  \n   - Cross-domain suggestions (such as "Learning plan and biological clock compatibility")  \n   - 3 optional paths (conservative/balanced/aggressive strategies)  \n2. Use analogies to explain professional concepts (such as "This learning plan is like a pyramid, the foundation layer is...")'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      top_p: 0.7,
      max_tokens: 1500,
      presence_penalty: 0.2
    };
    
    console.log('[API-Plan] Sending request...');
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
    console.log(`[API-Plan] Received response: status=${response.status}, time=${responseTime}ms`);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[API-Plan] DeepSeek API error:', data);
      throw new Error(`Failed to generate task plan: ${response.status} ${response.statusText}`);
    }

    console.log('[API-Plan] Parsing response data...');
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[API-Plan] Invalid response format:', data);
      throw new Error('Invalid response format from DeepSeek API');
    }

    // Return the generated plan
    return data.choices[0].message.content;
  } catch (error) {
    console.error('[API-Plan] Error generating plan:', error);
    // Fallback plan
    return getDefaultPlan(taskTitle, selectedSuggestion);
  }
}

/**
 * Get default plan when API fails
 */
function getDefaultPlan(taskTitle: string, selectedSuggestion: string): string {
  return `# Plan for: ${taskTitle} (${selectedSuggestion})

## Overview
This is a default plan generated because the AI service was unavailable.

## Steps
1. Start with the basics
2. Progress gradually
3. Monitor your progress

## Tips
- Take breaks when needed
- Stay consistent
- Adjust as necessary

## Expected Outcome
Successful completion of your task: ${taskTitle}`;
}

/**
 * Construct prompt for generating task plan
 */
function constructPlanPrompt(
  taskId: string,
  taskTitle: string,
  selectedSuggestion: string,
  userProfile: any,
  implicitNeeds: string[],
  relevantContext: string
): string {
  let prompt = `Please create a detailed plan for the task "${taskTitle}" with the selected approach "${selectedSuggestion}".\n\n`;
  
  // Add task ID for reference
  prompt += `Task ID: ${taskId}\n\n`;
  
  // Add user profile information
  prompt += '【User Profile】\n';
  prompt += '◆ Basic Information:';
  const basicInfo = [];
  if (userProfile.age) basicInfo.push(`Age ${userProfile.age}`);
  if (userProfile.occupation) basicInfo.push(`Occupation ${userProfile.occupation}`);
  if (userProfile.location) basicInfo.push(`Location ${userProfile.location}`);
  if (userProfile.height) basicInfo.push(`Height ${userProfile.height}`);
  if (userProfile.weight) basicInfo.push(`Weight ${userProfile.weight}`);
  prompt += basicInfo.join(', ') + '\n';
  
  // Add ability characteristics
  prompt += '◆ Ability Characteristics:';
  const abilities = [];
  if (userProfile.strengths && userProfile.strengths.length > 0) {
    abilities.push(`Strengths: ${userProfile.strengths.join(', ')}`);
  }
  if (userProfile.weaknesses && userProfile.weaknesses.length > 0) {
    abilities.push(`Weaknesses: ${userProfile.weaknesses.join(', ')}`);
  }
  prompt += abilities.join(', ') + '\n';
  
  // Add special conditions (health, work, learning, etc.)
  prompt += '◆ Special Conditions:';
  if (userProfile.healthConditions && userProfile.healthConditions.length > 0) {
    prompt += `Health: ${userProfile.healthConditions.join(', ')}`;
  }
  if (userProfile.workConditions && userProfile.workConditions.length > 0) {
    prompt += `Work: ${userProfile.workConditions.join(', ')}`;
  }
  if (userProfile.learningConditions && userProfile.learningConditions.length > 0) {
    prompt += `Learning: ${userProfile.learningConditions.join(', ')}`;
  }
  if (!userProfile.healthConditions && !userProfile.workConditions && !userProfile.learningConditions) {
    prompt += 'No special conditions';
  }
  prompt += '\n';
  
  // Add historical trajectory
  prompt += '◆ Historical Trajectory:';
  if (userProfile.history) {
    prompt += userProfile.history;
  } else {
    prompt += 'No history';
  }
  prompt += '\n\n';
  
  // Add task context
  prompt += '【Task Context】\n';
  prompt += `★ Explicit Need: ${taskTitle}\n`;
  prompt += `★ Selected Approach: ${selectedSuggestion}\n`;
  
  // Add implicit needs
  prompt += '★ Implicit Needs:';
  if (implicitNeeds && implicitNeeds.length > 0) {
    prompt += implicitNeeds.join(', ');
  } else if (userProfile.goals && userProfile.goals.length > 0) {
    // If implicitNeeds not provided, use userProfile.goals as backup
    prompt += userProfile.goals.join(', ');
  } else {
    prompt += 'Not specified';
  }
  prompt += '\n';
  
  // Add constraints
  prompt += '★ Constraints:';
  const constraints = [];
  if (userProfile.timeConstraints) constraints.push(`Time ${userProfile.timeConstraints}`);
  if (userProfile.resourceConstraints) constraints.push(`Resources ${userProfile.resourceConstraints}`);
  if (userProfile.restrictions && userProfile.restrictions.length > 0) {
    constraints.push(`Restrictions ${userProfile.restrictions.join(', ')}`);
  }
  prompt += constraints.length > 0 ? constraints.join(', ') : 'No explicit constraints';
  prompt += '\n\n';
  
  // Add relevant user context history (if available)
  if (relevantContext && relevantContext.length > 0) {
    prompt += '【User Context History】\n';
    prompt += relevantContext + '\n\n';
  }
  
  // Output requirements
  prompt += '【Output Requirements】\n';
  prompt += '1. Format the plan in Markdown\n';
  prompt += '2. Include the following sections:\n';
  prompt += '   - Overview: Brief summary of the plan\n';
  prompt += '   - Steps: Detailed step-by-step instructions\n';
  prompt += '   - Tips: Helpful advice for successful execution\n';
  prompt += '   - Expected Outcome: What the user should achieve\n';
  prompt += '3. Make the plan:\n';
  prompt += '   - Specific to the selected approach\n';
  prompt += '   - Tailored to the user\'s profile and constraints\n';
  prompt += '   - Realistic and actionable\n';
  prompt += '   - Supportive of the user\'s implicit needs where relevant\n';
  
  return prompt;
} 