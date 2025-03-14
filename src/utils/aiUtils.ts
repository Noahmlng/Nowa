/**
 * aiUtils.ts
 * 
 * Utility functions for interacting with DeepSeek AI API
 */

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
 * Construct prompt for generating task suggestions
 */
function constructSuggestionPrompt(
  taskTitle: string,
  userProfile: any,
  recentFeedback?: string
): string {
  let prompt = `Generate exactly three specific plan options for the task "${taskTitle}" based on the following user information:\n\n`;
  
  // Add physical data if available
  if (userProfile.height || userProfile.weight) {
    prompt += 'Physical Data:\n';
    if (userProfile.height) prompt += `- Height: ${userProfile.height}\n`;
    if (userProfile.weight) prompt += `- Weight: ${userProfile.weight}\n`;
  }
  
  // Add user interests, hobbies, goals
  if (userProfile.interests && userProfile.interests.length > 0) {
    prompt += `\nInterests: ${userProfile.interests.join(', ')}\n`;
  }
  if (userProfile.hobbies && userProfile.hobbies.length > 0) {
    prompt += `\nHobbies: ${userProfile.hobbies.join(', ')}\n`;
  }
  if (userProfile.goals && userProfile.goals.length > 0) {
    prompt += `\nGoals: ${userProfile.goals.join(', ')}\n`;
  }
  
  // Add recent feedback if available
  if (recentFeedback) {
    prompt += `\nRecent Feedback: ${recentFeedback}\n`;
  }
  
  // Add notes if available
  if (userProfile.notes) {
    prompt += `\nAdditional Notes: ${userProfile.notes}\n`;
  }
  
  prompt += `\nProvide exactly three concise and specific plan options (1-2 sentences each) that address different approaches to this task. Make them direct and actionable. Don't number them or include explanations, just provide the three suggestions separated by line breaks.`;
  
  return prompt;
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
  let prompt = `Create a detailed plan for the task "${taskTitle}" based on the selected approach: "${selectedSuggestion}"\n\n`;
  
  // Add physical data if available
  if (userProfile.height || userProfile.weight) {
    prompt += 'Physical Data:\n';
    if (userProfile.height) prompt += `- Height: ${userProfile.height}\n`;
    if (userProfile.weight) prompt += `- Weight: ${userProfile.weight}\n`;
  }
  
  // Add user interests, hobbies, goals
  if (userProfile.interests && userProfile.interests.length > 0) {
    prompt += `\nInterests: ${userProfile.interests.join(', ')}\n`;
  }
  if (userProfile.hobbies && userProfile.hobbies.length > 0) {
    prompt += `\nHobbies: ${userProfile.hobbies.join(', ')}\n`;
  }
  if (userProfile.goals && userProfile.goals.length > 0) {
    prompt += `\nGoals: ${userProfile.goals.join(', ')}\n`;
  }
  
  // Add recent feedback if available
  if (recentFeedback) {
    prompt += `\nRecent Feedback: ${recentFeedback}\n`;
  }
  
  // Add notes if available
  if (userProfile.notes) {
    prompt += `\nAdditional Notes: ${userProfile.notes}\n`;
  }
  
  prompt += `\nCreate a concise task plan that includes:
1. A brief summary (1-2 sentences)
2. A list of 5-10 specific subtasks, each being a clear, actionable item

Format the response as follows:
SUMMARY: [brief summary of the plan]
SUBTASKS:
- [First subtask]
- [Second subtask]
...and so on`;
  
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