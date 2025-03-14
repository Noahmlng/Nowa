import { NextResponse } from 'next/server';

// Centralized logging
export const log = (service: string, message: string, data?: any) => {
  console.log(`[API:${service}] ${message}`, data ? data : '');
};

// DeepSeek configuration
const DEEPSEEK_CONFIG = {
  endpoint: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  defaultTemperature: 0.7,
  defaultMaxTokens: 1000,
};

// Common AI client for DeepSeek
export async function callAI(
  service: string,
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
) {
  log(service, 'Making DeepSeek request', { systemPrompt, userPrompt });

  try {
    const response = await fetch(DEEPSEEK_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: options.temperature ?? DEEPSEEK_CONFIG.defaultTemperature,
        max_tokens: options.maxTokens ?? DEEPSEEK_CONFIG.defaultMaxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `DeepSeek API request failed: ${response.status} ${response.statusText}` +
        (errorData ? `\nDetails: ${JSON.stringify(errorData)}` : '')
      );
    }

    const data = await response.json();
    log(service, 'DeepSeek response:', data);
    
    // Extract the actual response content from DeepSeek's response format
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Invalid response format from DeepSeek API');
    }
    
    // Try to parse the content as JSON if it looks like JSON
    try {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return JSON.parse(content);
      }
    } catch (e) {
      log(service, 'Content is not valid JSON, returning as is');
    }
    
    return content;
  } catch (error) {
    log(service, 'Error:', error);
    throw error;
  }
}

// Common error response handler
export function handleError(service: string, error: any) {
  log(service, 'Error:', error);
  return NextResponse.json(
    { 
      error: `Failed to ${service}`,
      details: error.message
    },
    { status: 500 }
  );
} 