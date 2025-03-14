import { NextResponse } from 'next/server';
import { Goal, GoalAnalysis, QuestionWithOptions, QuestionOption, TaskSuggestion } from '@/types/goal';

// AI prompt for goal analysis
const ANALYSIS_PROMPT = `You are an AI goal coach helping users analyze and improve their goals. 
Given a goal and its context, analyze it and provide structured feedback.

Consider these aspects:
1. Specificity - Is the goal clear and measurable?
2. Timeline - Are there clear deadlines or milestones?
3. Achievability - Is it realistic given the context?
4. Relevance - Is it meaningful and motivating?
5. Trackability - Can progress be measured?

IMPORTANT: Return your response as a raw JSON object WITHOUT any markdown formatting (no \`\`\`json or \`\`\` tags).
The response must be a valid JSON object with this exact structure:
{
  "completeness": number (0-1),
  "needsClarification": boolean,
  "insights": string (your analysis and suggestions),
  "suggestedQuestions": [
    {
      "id": string,
      "text": string,
      "type": "choice" | "yes_no" | "multiple_choice" | "text",
      "purpose": string,
      "options": [
        {
          "id": string,
          "text": string,
          "emoji": string,
          "tasks": [
            {
              "title": string,
              "timeline": string,
              "priority": "high" | "medium" | "low"
            }
          ]
        }
      ],
      "priority": number (1-5)
    }
  ],
  "suggestedTasks": [
    {
      "title": string,
      "timeline": string,
      "priority": "high" | "medium" | "low"
    }
  ]
}`;

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { goal, context } = body;

    if (!goal?.title) {
      return NextResponse.json(
        { error: 'Goal title is required' },
        { status: 400 }
      );
    }

    // Log the analysis request
    console.log('Analyzing goal:', {
      title: goal.title,
      context: context || 'No context provided'
    });

    // Construct the prompt with goal and context
    const prompt = `${ANALYSIS_PROMPT}

Goal: "${goal.title}"
${goal.description ? `Description: ${goal.description}` : ''}

Context:
${context?.previousAnswers?.map((qa: any) => 
  `Q: ${qa.question.text}\nA: ${qa.answer}`
).join('\n') || 'No previous answers'}

Current step: ${context?.currentStep || 'initial'}

Analyze this goal and provide feedback following the format above.`;

    // Call AI service
    let aiResponse;
    try {
      // Call the AI service
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
              content: 'You are an expert goal coach. Always respond with raw JSON objects without any markdown formatting. Never use ```json or ``` tags.'
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

      if (!response.ok) {
        console.error('AI service error:', response.statusText);
        throw new Error(`AI service error: ${response.statusText}`);
      }

      aiResponse = await response.json();
      console.log('AI Response received:', aiResponse);

    } catch (error) {
      console.error('AI service error:', error);
      return NextResponse.json(
        { error: 'Failed to analyze goal with AI service' },
        { status: 500 }
      );
    }

    let analysis: GoalAnalysis;

    try {
      // Parse the AI response
      const content = aiResponse.choices[0].message.content;
      
      // Log the raw content for debugging
      console.log('Raw AI response content:', content);
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(content);
      } catch (jsonError) {
        // Try to clean the content if JSON parsing fails
        const cleanedContent = content
          .replace(/```json\n?|\n?```/g, '') // Remove markdown code blocks
          .trim(); // Remove extra whitespace
        parsedResponse = JSON.parse(cleanedContent);
      }
      
      // Transform the response to match our GoalAnalysis interface
      analysis = {
        completeness: parsedResponse.completeness,
        needsClarification: parsedResponse.needsClarification,
        insights: parsedResponse.insights,
        suggestedQuestions: parsedResponse.suggestedQuestions.map((q: any) => ({
          id: q.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: q.text,
          type: q.type,
          purpose: q.purpose,
          options: q.options || [],
          priority: q.priority || 1
        })),
        suggestedTasks: parsedResponse.suggestedTasks || []
      };

      // Log successful analysis
      console.log('Goal analysis completed:', {
        completeness: analysis.completeness,
        questionCount: analysis.suggestedQuestions.length,
        needsClarification: analysis.needsClarification
      });

      return NextResponse.json(analysis);

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', aiResponse.choices[0].message.content);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Goal analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze goal' },
      { status: 500 }
    );
  }
} 