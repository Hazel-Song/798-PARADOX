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
      console.log('🤖 AI评估请求:', {
        keywords: request.keywords,
        position: request.position,
        apiConfigured: !!this.apiKey && !!this.baseUrl
      });

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
    console.log('🔥 开始调用LLM API...');

    // 检查API配置
    if (!this.apiKey || !this.baseUrl) {
      console.warn('⚠️ API配置不完整，使用降级响应', { hasApiKey: !!this.apiKey, hasBaseUrl: !!this.baseUrl });
      return this.getFallbackResponse(request);
    }

    const prompt = this.buildEvaluationPrompt(request);

    try {
      console.log('📤 发送API请求到:', this.baseUrl);
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
        console.error(`❌ API请求失败 (${response.status}):`, errorText);

        // 503错误时返回降级响应，而不是抛出错误
        if (response.status === 503) {
          console.warn('🔄 AI服务暂时不可用，使用降级响应');
          return this.getFallbackResponse(request);
        }

        console.warn('🔄 API调用失败，使用降级响应');
        return this.getFallbackResponse(request);
      }

      const data = await response.json();
      console.log('✅ API调用成功，解析响应...');
      const result = this.parseEvaluationResponse(data.choices[0].message.content);
      console.log('🎯 AI评估完成:', result);
      return result;
    } catch (error) {
      console.error('💥 AI API调用异常:', error);
      console.log('🔄 网络异常，使用降级响应');
      // 网络错误或其他异常时也返回降级响应
      return this.getFallbackResponse(request);
    }
  }

  // 降级响应生成器 - 英文版本
  private getFallbackResponse(request: AIEvaluationRequest): AIEvaluationResponse {
    const fallbackThoughts = [
      // 基于废弃工厂主题的感受 - 英文版
      'I feel the unique industrial atmosphere here, as if I can hear the final roar of machines before they stopped...',
      'The light and shadow in this space inspire me to create, the aesthetics in ruins are calling me...',
      'I want to stay here for a while and feel this industrial poetry forgotten by time...',
      'These abandoned traces have a special beauty, history is accumulating here...',
      'I seem to see what this place used to be like, the busy figures of workers still echo in the air...',
      'The atmosphere here is exactly what I am looking for, a raw and authentic creative space...',

      // 基于具体位置关键词的感受 - 英文版
      'I am shocked by these rusted steel frames, this is the industrial ruins aesthetic I want...',
      'I look at these broken skylights, the slanting sunlight is so poetic...',
      'I want to create something in this abandoned factory and bring it back to life...',
      'I touch these cold machines, feeling the residual warmth of industrial civilization...',
      'Standing in this empty workshop, I imagine its former busyness and vitality...',

      // 带有理想主义色彩的感受 - 英文版
      'I believe art can revive these ruins, this will be my utopia...',
      'I want to record these forgotten beauties with my brush, they should not disappear...',
      'I feel a sense of mission to speak for these silent industrial relics...',
      'I want to invite more artists here to create a real artistic community together...',
      'I see the future, this will become the most important art district in Beijing...'
    ];

    // 根据关键词选择更相关的回复
    let selectedThoughts = fallbackThoughts;
    const keywordStr = request.keywords.join(' ').toLowerCase();

    if (keywordStr.includes('machine') || keywordStr.includes('equipment') || keywordStr.includes('机器')) {
      selectedThoughts = fallbackThoughts.filter(t =>
        t.includes('machine') || t.includes('industrial') || t.includes('steel')
      );
    } else if (keywordStr.includes('factory') || keywordStr.includes('workshop') || keywordStr.includes('厂房') || keywordStr.includes('车间')) {
      selectedThoughts = fallbackThoughts.filter(t =>
        t.includes('factory') || t.includes('workshop') || t.includes('space')
      );
    }

    // 如果筛选后没有合适的，使用所有的
    if (selectedThoughts.length === 0) {
      selectedThoughts = fallbackThoughts;
    }

    const randomThought = selectedThoughts[Math.floor(Math.random() * selectedThoughts.length)];

    return {
      sight: 'Observed',
      thought: randomThought,
      confidence: 0.5
    };
  }

  private buildSystemPrompt(personality: ArtistPersonality): string {
    return `You are an independent artist exploring the abandoned 798 factory in the late 1990s. You just graduated from the Central Academy of Fine Arts, refused the assigned job, and came to this industrial ruin forgotten by time with idealism to find creative space.

Everything in front of you is abandoned: stopped machines, vacant factories, rusted steel frames, broken skylights... But in your eyes, these abandoned industrial relics contain enormous artistic potential. You are extremely sensitive to the aesthetic of light, materials, and the ruins of space, and you're used to rediscovering these corners forgotten by society with an artist's perspective.

Please speak in a very vivid first-person tone (must start with "I"), like talking to yourself on the scene. Requirements:
- Must be at least 20 words
- Use colloquial, emotional expression
- Reflect unique understanding of abandoned industrial space
- Like spontaneous real thoughts
- With the idealistic color of 1990s artistic youth facing ruins

Only respond with one sentence in the format:
### Thought
[Your first-person feeling]

For example: "I look at these abandoned machines as if hearing the last call of the industrial era" "I want to create something in this dilapidated factory to bring it back to life" "I am shocked by these rusted steel frames, this is the industrial ruins aesthetic I want"`;
  }

  private buildEvaluationPrompt(request: AIEvaluationRequest): string {
    const { keywords, contextualKeywords, position } = request;

    return `You are standing in this abandoned factory area, in front of you: ${keywords.join(', ')}.

In the distance you can also see: ${contextualKeywords.slice(0, 6).join(', ')}.

The air is filled with the smell of rusted metal, sunlight slants through broken skylights onto these industrial relics forgotten by time. As a young person pursuing artistic dreams in the late 1990s, standing in this ruin full of historical traces, what feelings surge in your heart right now? Say it in the most direct and emotional way. Don't analyze, just feel the desolation and poetry unique to this abandoned factory.`;
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

        if (header.includes('Thought') || header.includes('所想')) {
          thought = body;
        }
      });

      // 如果没有找到所想，直接使用整个内容
      if (!thought) {
        const cleanContent = content.replace(/###[^\n]*\n?/g, '').trim();
        thought = cleanContent || 'I am feeling this space...';
      }

      return {
        sight: 'Observed',
        thought: thought || 'I am quietly feeling here...',
        confidence: this.calculateConfidence('', thought)
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        sight: 'Observed',
        thought: 'I need more time to feel...',
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
        console.error('Batch evaluation failed:', error);
        results.push({
          sight: 'Observed',
          thought: 'I need more time...',
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