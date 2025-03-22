/**
 * AI服务相关功能
 */

import type { GoalAnalysis, GoalAnalysisResult } from '@/types/goal';

// 重新导出GoalAnalysisResult类型
export type { GoalAnalysisResult };

/**
 * 分析目标并提供建议
 * 
 * @param goalTitle 目标标题
 * @param userContext 用户上下文信息
 * @returns 目标分析结果
 */
export async function analyzeGoal(
  goalTitle: string, 
  userContext: any
): Promise<GoalAnalysisResult> {
  console.log('[AI Service] 开始分析目标:', goalTitle);
  
  try {
    // 构建API请求体
    const requestBody = {
      goalTitle,
      userContext,
      preferredModel: userContext?.preferredModel || 'deepseek-r1'
    };
    
    // 调用后端API
    const response = await fetch('/api/analyze-goal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('[AI Service] 收到API响应:', response.status);
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data: data as GoalAnalysis
    };
  } catch (error) {
    console.error('[AI Service] 分析目标时出错:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
} 