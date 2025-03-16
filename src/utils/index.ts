/**
 * Utilities index file
 * 
 * Exports the TaskGraph system components with integration for:
 * - DeepSeek R1 LLM for task generation and analysis
 * - Vector embeddings for semantic task relationships
 * - Speech-to-text for voice command processing
 */

// Import from store first
import { useAppStore } from '@/store/store';

// Import components directly to avoid reference errors
import { taskBuilder, useTaskBuilder } from './TaskBuilder';
import { taskAdjustmentEngine, useTaskAdjustmentEngine } from './TaskAdjustmentEngine';
import { interactionEngine, useInteractionEngine } from './InteractionEngine';
// VoiceCommandProcessor will be implemented later
// import { voiceCommandProcessor, useVoiceCommandProcessor } from './VoiceCommandProcessor';

// Re-export components
export { taskBuilder, useTaskBuilder };
export { taskAdjustmentEngine, useTaskAdjustmentEngine };
export { interactionEngine, useInteractionEngine };
// export { voiceCommandProcessor, useVoiceCommandProcessor };

/**
 * Generate embeddings for a task using DeepSeek R1
 * @param text The text to generate embeddings for
 * @returns A numeric vector representing the semantic meaning
 */
export async function generateTaskEmbeddings(text: string): Promise<number[]> {
  console.log(`[AI Service] Generating embeddings for: ${text}`);
  
  try {
    // 调用DeepSeek Embedding API
    // 实际项目中会配置为环境变量
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your-api-key';
    const DEEPSEEK_EMBEDDING_URL = process.env.DEEPSEEK_EMBEDDING_URL || 'https://api.deepseek.com/v1/embeddings';
    
    // 构建要嵌入的文本 - 结合标题和描述以获得更好的语义表示
    const textToEmbed = text.trim();
    
    if (!textToEmbed) {
      console.warn('[AI Service] Empty text provided for embedding generation');
      return [];
    }
    
    // 记录API调用开始时间以便性能监控
    const startTime = Date.now();
    
    // 调用embedding API
    const response = await fetch(DEEPSEEK_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-embed', // 或使用配置的模型
        input: textToEmbed,
        encoding_format: 'float'
      })
    });
    
    // 如果API调用失败，回退到本地mock嵌入
    if (!response.ok) {
      console.error(`[AI Service] API call failed: ${response.status} ${response.statusText}`);
      console.log('[AI Service] Falling back to mock embeddings');
      return generateMockEmbeddings(text);
    }
    
    const data = await response.json();
    const embedding = data.data[0].embedding;
    
    // 记录API调用性能指标
    const endTime = Date.now();
    console.log(`[AI Service] Embedding generated in ${endTime - startTime}ms`);
    
    return embedding;
  } catch (error) {
    console.error('[AI Service] Error generating embeddings:', error);
    console.log('[AI Service] Falling back to mock embeddings');
    
    // 出错时回退到本地mock嵌入
    return generateMockEmbeddings(text);
  }
}

/**
 * 生成本地mock嵌入向量（当API不可用时的回退方案）
 * @param text 要生成嵌入的文本
 * @returns 模拟的嵌入向量
 */
function generateMockEmbeddings(text: string): number[] {
  console.log(`[AI Service] Generating mock embeddings for: ${text}`);
  
  // 使用更复杂的策略生成伪嵌入，使相似文本产生相似向量
  // 维度1: 文本长度的归一化表示
  // 维度2-10: 基于特定关键词的存在
  // 维度11-128: 基于字符分布的哈希
  
  const embedding = new Array(128).fill(0);
  
  // 维度0: 文本长度的归一化表示 (0-1)
  embedding[0] = Math.min(text.length / 1000, 1);
  
  // 维度1-9: 基于关键词的特征
  const keywords = [
    'work', 'project', 'learn', 'study', 'health', 
    'exercise', 'deadline', 'important', 'urgent'
  ];
  
  const lowerText = text.toLowerCase();
  keywords.forEach((keyword, i) => {
    embedding[i + 1] = lowerText.includes(keyword) ? 1 : 0;
  });
  
  // 维度10-127: 基于字符分布的哈希
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    const position = (char % 118) + 10; // 映射到10-127
    embedding[position] = (embedding[position] + 0.01) % 1; // 增加一点点，保持在0-1之间
  }
  
  // 规范化嵌入向量以具有单位长度
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

/**
 * Process speech input using STT and then task processing
 * @param audioBlob Audio data from voice input
 * @returns Processing result with generated command
 */
export async function processSpeechInput(audioBlob: Blob): Promise<{
  success: boolean;
  text?: string;
  result?: any;
  message: string;
}> {
  console.log(`[AI Service] Processing speech input`);
  
  try {
    // In a real implementation, this would call an STT service
    // For now, we return a mock result
    // Replace with actual API call to speech-to-text service
    
    const mockTranscribedText = "add task complete project documentation";
    
    // Process the transcribed text with our voice command processor
    // This will be implemented later
    // const result = voiceCommandProcessor.processVoiceInput(mockTranscribedText);
    
    return {
      success: true,
      text: mockTranscribedText,
      result: {
        success: true,
        message: "Task created successfully", 
        result: {
          id: `task-${Date.now()}`,
          title: "Complete project documentation",
          description: "Create comprehensive documentation for the project",
          status: "pending",
          priority: "high"
        }
      },
      message: "Task created successfully"
    };
  } catch (error) {
    console.error('[AI Service] Error processing speech:', error);
    return {
      success: false,
      message: 'Failed to process speech input'
    };
  }
}

/**
 * Generate a task proposal using DeepSeek R1
 * @param input User input for task creation
 * @returns A structured task proposal
 */
export async function generateAITaskProposal(input: string): Promise<any> {
  console.log(`[AI Service] Generating task proposal with DeepSeek R1: ${input}`);
  
  try {
    // 生成embeddings（我们先做这一步，因为无论如何都需要它们）
    const embeddings = await generateTaskEmbeddings(input);
    const store = useAppStore.getState();
    
    // 使用TaskBuilder生成提案（现在是异步的）
    const proposal = await taskBuilder.generateTaskProposal(input);
    
    // 创建任务
    const task = taskBuilder.createTaskFromProposal(proposal);
    
    // 添加embeddings到任务
    store.updateTaskEmbeddings(task.id, embeddings);
    
    return {
      success: true,
      proposal,
      task
    };
  } catch (error) {
    console.error('[AI Service] Error generating task proposal:', error);
    return {
      success: false,
      message: 'Failed to generate task proposal'
    };
  }
} 