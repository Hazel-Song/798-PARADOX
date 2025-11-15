import { ArtistPersonality, LocationEvaluation } from '@/types/character';

interface AIEvaluationRequest {
  keywords: string[];
  contextualKeywords: string[];
  position: { gridX: number; gridY: number };
  personality: ArtistPersonality;
}

interface AIEvaluationResponse {
  sight: string;
  thought: string;
  confidence: number;
}

export class AIEvaluationService {
  private apiKey: string;
  private baseUrl: string;
  private requestQueue: AIEvaluationRequest[] = [];
  private isProcessing: boolean = false;
  private rateLimitDelay: number = 2000; // 2秒间隔避免频繁调用

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  public async evaluateLocation(request: AIEvaluationRequest): Promise<AIEvaluationResponse> {
    return new Promise((resolve, reject) => {
      // 添加到队列
      this.requestQueue.push({
        ...request,
        resolve,
        reject
      } as any);

      // 开始处理队列
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const request = this.requestQueue.shift()!;

    try {
      const response = await this.callLLMAPI(request);
      (request as any).resolve(response);
    } catch (error) {
      console.error('AI评价失败:', error);
      (request as any).reject(error);
    }

    // 等待间隔后处理下一个请求
    setTimeout(() => {
      this.processQueue();
    }, this.rateLimitDelay);
  }

  private async callLLMAPI(request: AIEvaluationRequest): Promise<AIEvaluationResponse> {
    const prompt = this.buildEvaluationPrompt(request);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.buildSystemPrompt(request.personality)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`API请求失败 (${response.status}):`, errorText);

        // 503错误时返回降级响应，而不是抛出错误
        if (response.status === 503) {
          console.warn('AI服务暂时不可用，使用降级响应');
          return this.getFallbackResponse(request);
        }

        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseEvaluationResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('AI API调用异常:', error);
      // 网络错误或其他异常时也返回降级响应
      return this.getFallbackResponse(request);
    }
  }

  // 降级响应生成器
  private getFallbackResponse(request: AIEvaluationRequest): AIEvaluationResponse {
    const fallbackThoughts = [
      '我感受到这里独特的工业气息...',
      '这空间的光影让我想创作些什么...',
      '我想在这里停留一会，感受这片空间...',
      '这些废弃的痕迹反而有种特别的美感...',
      '我仿佛能看到这里曾经的样子...',
      '这里的氛围正是我在寻找的...'
    ];

    const randomThought = fallbackThoughts[Math.floor(Math.random() * fallbackThoughts.length)];

    return {
      sight: '已观察',
      thought: randomThought,
      confidence: 0.5
    };
  }

  private buildSystemPrompt(personality: ArtistPersonality): string {
    return `你是一个90年代末在798废弃工厂探索的独立艺术家。你刚从央美毕业，拒绝了分配，怀着理想主义来到这片工业废墟寻找创作空间。你对空间、光线、材质极其敏感，习惯用艺术家的眼光观察一切。

请用极其生动的第一人称口吻（必须以"我"开头），像是在现场自言自语般说出你的感受。要求：
- 必须不少于20字
- 用口语化、感性的表达
- 体现艺术家的直觉和敏感
- 像是脱口而出的真实想法
- 带有90年代艺术青年的理想主义色彩

只需回复一句话，格式：
### 所想
[你的第一人称感受]

例如："我觉得这光线太棒了，从天窗洒下来的感觉让人想创作" "我想在这搭个工作室，这种工业感正是我要的" "我闻到了时间的味道，这些老机器仿佛还在诉说着什么"`;
  }

  private buildEvaluationPrompt(request: AIEvaluationRequest): string {
    const { keywords, contextualKeywords, position } = request;
    
    return `你正站在这个位置，环顾四周，看到：${keywords.join('、')}。

周围还有：${contextualKeywords.slice(0, 6).join('、')}。

作为一个90年代末追求艺术梦想的青年，此刻你内心涌起什么感受？用最直接、最感性的话说出来。不要分析，只要感受。`;
  }

  private parseEvaluationResponse(content: string): AIEvaluationResponse {
    try {
      const sections = content.split('###').filter(section => section.trim());
      
      let sight = '';
      let thought = '';

      sections.forEach(section => {
        const lines = section.trim().split('\n');
        const header = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();

        if (header.includes('所想')) {
          thought = body;
        }
      });
      
      // 如果没有找到所想，直接使用整个内容
      if (!thought) {
        const cleanContent = content.replace(/###[^\n]*\n?/g, '').trim();
        thought = cleanContent || '我正在感受这个空间...';
      }

      return {
        sight: '已观察',
        thought: thought || '我在静静感受这里...', 
        confidence: this.calculateConfidence('', thought)
      };
    } catch (error) {
      console.error('解析AI回复失败:', error);
      return {
        sight: '已观察',
        thought: '我需要更多时间感受...',
        confidence: 0.1
      };
    }
  }

  private calculateConfidence(sight: string, thought: string): number {
    const totalLength = sight.length + thought.length;
    const hasAllSections = sight && thought;
    const avgLength = totalLength / 2;
    
    let confidence = 0.5; // 基础置信度
    
    if (hasAllSections) confidence += 0.3;
    if (avgLength > 5) confidence += 0.2;   // 调整阈值适应10字限制
    if (avgLength > 8) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  // 批量评价（用于初始化或批量处理）
  public async batchEvaluateLocations(requests: AIEvaluationRequest[]): Promise<AIEvaluationResponse[]> {
    const results: AIEvaluationResponse[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.evaluateLocation(request);
        results.push(result);
        
        // 批量处理时增加延迟
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      } catch (error) {
        console.error('批量评价失败:', error);
        results.push({
          sight: '已观察',
          thought: '我需要更多时间...',
          confidence: 0
        });
      }
    }
    
    return results;
  }

  // 设置API配置
  public updateConfig(apiKey?: string, baseUrl?: string): void {
    if (apiKey) this.apiKey = apiKey;
    if (baseUrl) this.baseUrl = baseUrl;
  }

  // 设置请求间隔
  public setRateLimit(delayMs: number): void {
    this.rateLimitDelay = Math.max(1000, delayMs); // 最少1秒间隔
  }

  // 获取队列状态
  public getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.requestQueue.length,
      processing: this.isProcessing
    };
  }
}