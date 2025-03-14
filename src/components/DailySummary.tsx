'use client';

import { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { useAppStore } from '@/store/store';
import { format, isYesterday, isToday, parseISO, subDays, addDays } from 'date-fns';

interface DailySummaryProps {
  isOpen: boolean;
  onClose: () => void;
  summaryType: 'yesterday' | 'today';
}

export default function DailySummary({ isOpen, onClose, summaryType }: DailySummaryProps) {
  const { tasks, goals } = useAppStore();
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  if (!isOpen) return null;
  
  // Get the date for the summary
  const targetDate = summaryType === 'yesterday' ? subDays(new Date(), 1) : new Date();
  const dateString = format(targetDate, 'yyyy-MM-dd');
  
  // Filter tasks based on the summary type
  const relevantTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    
    const taskDate = parseISO(task.dueDate);
    return summaryType === 'yesterday' 
      ? isYesterday(taskDate) 
      : isToday(taskDate);
  });
  
  // Calculate completion statistics
  const completedTasks = relevantTasks.filter(task => task.status === 'completed');
  const completionRate = relevantTasks.length > 0 
    ? Math.round((completedTasks.length / relevantTasks.length) * 100) 
    : 0;
  
  // Extract insights from feedback
  const extractInsights = () => {
    const insights: string[] = [];
    
    relevantTasks.forEach(task => {
      if (task.feedback && task.feedback.length > 0) {
        // Get the latest feedback
        const latestFeedback = task.feedback[task.feedback.length - 1];
        
        // Simple extraction of insights (in a real app, this would be more sophisticated)
        const feedbackText = latestFeedback.text.toLowerCase();
        
        // Look for health-related insights
        if (feedbackText.includes('pain') || 
            feedbackText.includes('injury') || 
            feedbackText.includes('hurt') ||
            feedbackText.includes('疼痛') || 
            feedbackText.includes('受伤') || 
            feedbackText.includes('伤害') ||
            feedbackText.includes('不舒服')) {
          insights.push(`任务"${task.title}"中发现健康问题: ${latestFeedback.text}`);
        }
        
        // Look for progress insights
        if (feedbackText.includes('progress') || 
            feedbackText.includes('improve') || 
            feedbackText.includes('better') ||
            feedbackText.includes('进步') || 
            feedbackText.includes('改善') || 
            feedbackText.includes('提高') ||
            feedbackText.includes('更好')) {
          insights.push(`任务"${task.title}"中的进步: ${latestFeedback.text}`);
        }
        
        // Look for challenges
        if (feedbackText.includes('difficult') || 
            feedbackText.includes('challenge') || 
            feedbackText.includes('hard') ||
            feedbackText.includes('困难') || 
            feedbackText.includes('挑战') || 
            feedbackText.includes('艰难') ||
            feedbackText.includes('难度')) {
          insights.push(`任务"${task.title}"中的挑战: ${latestFeedback.text}`);
        }
      }
    });
    
    return insights.length > 0 ? insights : ['任务反馈中没有发现特定洞察。'];
  };
  
  // Extract user-related information
  const extractUserInfo = () => {
    const userInfo: string[] = [];
    
    relevantTasks.forEach(task => {
      if (task.feedback && task.feedback.length > 0) {
        // Get the latest feedback
        const latestFeedback = task.feedback[task.feedback.length - 1];
        const feedbackText = latestFeedback.text.toLowerCase();
        
        // Look for health-related information
        if (feedbackText.includes('injury') || 
            feedbackText.includes('pain') || 
            feedbackText.includes('sick') ||
            feedbackText.includes('受伤') || 
            feedbackText.includes('疼痛') || 
            feedbackText.includes('生病') ||
            feedbackText.includes('不适')) {
          
          // Extract the sentence containing the health issue
          const sentences = latestFeedback.text.split(/[.!?]+|[。！？]+/);
          const relevantSentence = sentences.find(s => 
            s.toLowerCase().includes('injury') || 
            s.toLowerCase().includes('pain') || 
            s.toLowerCase().includes('sick') ||
            s.toLowerCase().includes('受伤') || 
            s.toLowerCase().includes('疼痛') || 
            s.toLowerCase().includes('生病') ||
            s.toLowerCase().includes('不适')
          );
          
          if (relevantSentence) {
            userInfo.push(relevantSentence.trim());
          }
        }
      }
    });
    
    return userInfo.length > 0 ? userInfo : [];
  };
  
  // Generate recommendations based on insights and upcoming tasks
  const generateRecommendations = () => {
    const recommendations: string[] = [];
    const userInfo = extractUserInfo();
    
    // Check for health issues and make recommendations
    const hasHealthIssue = userInfo.some(info => 
      info.toLowerCase().includes('injury') || 
      info.toLowerCase().includes('pain') ||
      info.toLowerCase().includes('受伤') || 
      info.toLowerCase().includes('疼痛')
    );
    
    if (hasHealthIssue) {
      recommendations.push('考虑调整您的锻炼计划以适应您的健康状况。');
    }
    
    // 获取明天的任务
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    const tomorrowTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      
      // 提取任务日期的年月日部分进行比较
      const taskDateStr = task.dueDate.split('T')[0];
      return taskDateStr === tomorrowStr;
    });
    
    if (tomorrowTasks.length > 0) {
      if (completionRate < 50) {
        recommendations.push('今天的任务完成率低于50%。建议明天减少任务数量，提高专注度。');
      } else if (completionRate > 80) {
        recommendations.push('完成了大部分任务，做得很棒！明天可以尝试更具挑战性的目标。');
      }
    }
    
    return recommendations.length > 0 ? recommendations : ['保持良好的工作状态，坚持完成您的任务。'];
  };
  
  // Generate email content
  const generateEmailContent = () => {
    const summaryTitle = summaryType === 'yesterday' ? '昨日总结' : '今日评估';
    const dateDisplay = format(targetDate, 'yyyy年MM月dd日');
    
    // Create HTML content for the email
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #2563eb; }
            h2 { color: #4b5563; margin-top: 20px; }
            .section { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .progress-bar { background-color: #e5e7eb; height: 10px; border-radius: 5px; margin: 10px 0; }
            .progress-fill { background-color: #2563eb; height: 10px; border-radius: 5px; }
            .task-item { display: flex; align-items: center; margin-bottom: 5px; }
            .task-status { width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; }
            .completed { background-color: #10b981; }
            .pending { background-color: #ef4444; }
            .completed-text { text-decoration: line-through; color: #6b7280; }
            .insight-item { margin-bottom: 8px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${summaryTitle} - ${dateDisplay}</h1>
            
            <div class="section">
              <h2>任务完成情况</h2>
              <p>完成率: <strong>${completionRate}%</strong></p>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${completionRate}%;"></div>
              </div>
              <p>共计 ${relevantTasks.length} 个任务，已完成 ${completedTasks.length} 个</p>
              
              ${relevantTasks.length > 0 
                ? `<div style="margin-top: 15px;">
                    ${relevantTasks.map(task => `
                      <div class="task-item">
                        <div class="task-status ${task.status === 'completed' ? 'completed' : 'pending'}"></div>
                        <span class="${task.status === 'completed' ? 'completed-text' : ''}">${task.title}</span>
                      </div>
                    `).join('')}
                  </div>`
                : '<p><em>没有安排任务</em></p>'
              }
            </div>
            
            <div class="section">
              <h2>反馈洞察</h2>
              <ul>
                ${extractInsights().map(insight => `
                  <li class="insight-item">${insight}</li>
                `).join('')}
              </ul>
            </div>
            
            ${extractUserInfo().length > 0 
              ? `<div class="section">
                  <h2>个人状况</h2>
                  <ul>
                    ${extractUserInfo().map(info => `
                      <li class="insight-item">${info}</li>
                    `).join('')}
                  </ul>
                </div>`
              : ''
            }
            
            <div class="section">
              <h2>建议</h2>
              <ul>
                ${generateRecommendations().map(recommendation => `
                  <li class="insight-item">${recommendation}</li>
                `).join('')}
              </ul>
            </div>
            
            <div class="section" style="background-color: #eff6ff; border: 1px solid #dbeafe;">
              <p style="text-align: center; font-weight: 500; color: #1e40af;">
                ${completionRate >= 70 
                  ? '做得很棒！继续保持这样的节奏，你正在稳步实现你的目标。' 
                  : '每一步都是进步，明天继续加油！'}
              </p>
            </div>
            
            <div class="footer">
              <p>此邮件由 Nowa 应用自动生成</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };
  
  // Send email function
  const sendEmail = async () => {
    setIsSending(true);
    
    try {
      const emailContent = generateEmailContent();
      const summaryTitle = summaryType === 'yesterday' ? '昨日总结' : '今日评估';
      const dateDisplay = format(targetDate, 'yyyy年MM月dd日');
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: 'luozeming_2000@126.com',
          subject: `Nowa - ${summaryTitle} ${dateDisplay}`,
          content: emailContent
        }),
      });
      
      if (!response.ok) {
        throw new Error('邮件发送失败');
      }
      
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (error) {
      console.error('邮件发送失败:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  // Generate the summary content
  const summaryTitle = summaryType === 'yesterday' ? '昨日总结' : '评估今天';
  const dateDisplay = format(targetDate, 'yyyy年MM月dd日');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{summaryTitle} - {dateDisplay}</h2>
          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 z-50"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={24} className="text-gray-700" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Task Completion Section */}
          <section className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">任务完成情况</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">完成率</span>
                <span className="text-sm font-bold text-blue-600">{completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  共计 {relevantTasks.length} 个任务，已完成 {completedTasks.length} 个
                </p>
                
                {relevantTasks.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {relevantTasks.map(task => (
                      <div 
                        key={task.id} 
                        className="flex items-center text-sm"
                      >
                        <div 
                          className={`w-3 h-3 rounded-full mr-2 ${
                            task.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        ></div>
                        <span className={task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-700'}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">没有安排任务</p>
                )}
              </div>
            </div>
          </section>
          
          {/* Insights Section */}
          <section className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">反馈洞察</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-2 text-sm text-gray-700">
                {extractInsights().map((insight, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          
          {/* User-Related Information */}
          {extractUserInfo().length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">个人状况</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="space-y-2 text-sm text-gray-700">
                  {extractUserInfo().map((info, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-yellow-500 mr-2">•</span>
                      <span>{info}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
          
          {/* Recommendations */}
          <section className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">建议</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-2 text-sm text-gray-700">
                {generateRecommendations().map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          
          {/* Motivational Message */}
          <section className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 font-medium text-center">
                {completionRate >= 70 
                  ? '做得很棒！继续保持这样的节奏，你正在稳步实现你的目标。' 
                  : '每一步都是进步，明天继续加油！'}
              </p>
            </div>
          </section>
        </div>
        
        {/* Footer with Email Button */}
        <div className="border-t border-gray-200 p-4 flex justify-center">
          <button
            onClick={sendEmail}
            disabled={isSending}
            className={`
              px-4 py-2 rounded-full flex items-center justify-center
              ${isSending ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
              text-white font-medium text-sm transition-colors
            `}
          >
            <Mail size={16} className="mr-2" />
            {emailSent 
              ? '邮件已发送' 
              : isSending 
                ? '发送中...' 
                : '发送至邮箱 (luozeming_2000@126.com)'}
          </button>
        </div>
      </div>
    </div>
  );
} 