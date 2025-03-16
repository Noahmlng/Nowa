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
    console.log('[API-Suggestions] Constructed prompt:', prompt.substring(0, 200) + '...');
    
    // Request configuration
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    console.log('[API-Suggestions] Request configuration:', { 
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
      max_tokens: 800,
      presence_penalty: 0.2
    };
    
    console.log('[API-Suggestions] Sending request...');
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
    console.log(`[API-Suggestions] Received response: status=${response.status}, time=${responseTime}ms`);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[API-Suggestions] DeepSeek API error:', data);
      throw new Error(`Failed to generate task suggestions: ${response.status} ${response.statusText}`);
    }

    console.log('[API-Suggestions] Parsing response data...');
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[API-Suggestions] Invalid response format:', data);
      throw new Error('Invalid response format from DeepSeek API');
    }

    // Parse the response to extract suggestions
    const suggestions = parseSuggestions(data.choices[0].message.content, taskTitle);
    console.log('[API-Suggestions] Parsed suggestions:', suggestions);
    
    return suggestions;
  } catch (error) {
    console.error('[API-Suggestions] Error generating suggestions:', error);
    // Fallback suggestions
    return getDefaultSuggestions(taskTitle);
  }
}

/**
 * Get default suggestions
 */
function getDefaultSuggestions(taskTitle: string): string[] {
  if (/exercise|workout|run|training/i.test(taskTitle)) {
    return ['Slow jogging', 'Indoor cycling', 'Fitness routine'];
  } else if (/diet|fasting|6pm/i.test(taskTitle)) {
    return ['Drink water', 'Chew sugar-free gum', 'Eat vegetables'];
  } else if (/study|read|review|write/i.test(taskTitle)) {
    return ['Pomodoro technique', 'Flashcard review', 'Mind mapping'];
  } else {
    return ['Option A', 'Option B', 'Option C'];
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
  let prompt = `Please process the task "${taskTitle}":\n\n`;
  
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
  } else if (recentFeedback) {
    prompt += recentFeedback;
  } else {
    prompt += 'No history';
  }
  prompt += '\n\n';
  
  // Add task context
  prompt += '【Task Context】\n';
  prompt += `★ Explicit Need: ${taskTitle}\n`;
  
  // Add implicit needs based on active goals
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
  
  // Add notes about the relationship between current task and implicit needs
  if (implicitNeeds && implicitNeeds.length > 0) {
    prompt += '【Notes】\n';
    prompt += `★ Relationship between current task and user's long-term goals: Please consider how the current task "${taskTitle}" relates to the user's implicit needs (${implicitNeeds.join(', ')}).\n`;
    prompt += '★ Prioritize the most relevant goals: When generating suggestions, prioritize the goals most relevant to the current task, rather than considering all goals.\n\n';
  }
  
  // Add relevant user context history (if available)
  if (userContextHistory && userContextHistory.length > 0) {
    // Extract relevant context using the same method as in plan API
    const relevantContext = extractRelevantContext(userContextHistory, taskTitle, '');
    if (relevantContext.length > 0) {
      prompt += '【User Context History】\n';
      prompt += relevantContext + '\n\n';
    }
  }
  
  // Output requirements
  prompt += '【Output Requirements】\n';
  prompt += '1. Analyze the task and determine the most important core dimension for this task\n';
  prompt += '2. Provide three different specific options within that dimension\n';
  prompt += '3. Each option must:\n';
  prompt += `   - Be directly related to the task "${taskTitle}"\n`;
  prompt += '   - Be kept within 10 characters\n';
  prompt += '   - Be concise and clear like app options\n';
  prompt += '   - Avoid verbose explanations and modifiers\n';
  prompt += '4. The three options should:\n';
  prompt += '   - Belong to the same dimension (e.g., all exercise types, all execution methods, etc.)\n';
  prompt += '   - Be mutually exclusive (user can only choose one)\n';
  prompt += '   - Consider user circumstances and preferences\n';
  prompt += '   - Possibly align with user\'s implicit needs/long-term goals\n';
  
  return prompt;
}

/**
 * Parse suggestions from DeepSeek API response
 */
function parseSuggestions(content: string, taskTitle: string): string[] {
  try {
    console.log('[API-Suggestions] Original content:', content);
    
    // Simplified parsing, only extract short options
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length <= 20) // Control length more strictly
      // Remove any line markers, numbers, etc.
      .map(line => line.replace(/^([0-9]+\.|\*|\-|>|#|【|】)\s*/, ''))
      .map(line => line.replace(/^\*\*|\*\*$/g, ''))
      // Filter out empty lines, too short lines, lines with punctuation
      .filter(line => line.length >= 2 && 
                      !line.includes(':') && 
                      !line.includes('：') &&
                      !line.includes('dimension') &&
                      !line.includes('options') &&
                      !line.includes('Option'));
    
    // Get the most likely suggestions
    let suggestions = lines.slice(0, 5);
    
    // If we have more than 3 suggestions, try to find the most relevant ones
    if (suggestions.length > 3) {
      // Sort by relevance to task title (simple word matching)
      const taskWords = taskTitle.toLowerCase().split(/\s+/);
      suggestions = suggestions.sort((a, b) => {
        const aScore = taskWords.filter(word => a.toLowerCase().includes(word)).length;
        const bScore = taskWords.filter(word => b.toLowerCase().includes(word)).length;
        return bScore - aScore;
      });
    }
    
    // Take the top 3 suggestions or pad with defaults if needed
    suggestions = suggestions.slice(0, 3);
    
    // If we don't have enough suggestions, add defaults
    while (suggestions.length < 3) {
      suggestions.push(`Option ${suggestions.length + 1}`);
    }
    
    return suggestions;
  } catch (error) {
    console.error('[API-Suggestions] Error parsing suggestions:', error);
    return ['Option 1', 'Option 2', 'Option 3'];
  }
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