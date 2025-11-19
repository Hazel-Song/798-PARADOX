import { useState, useRef, useCallback } from 'react';
import { AIEvaluationService } from '@/lib/ai/AIEvaluationService';
import { ArtistPersonality } from '@/types/character';

interface AIEvaluationState {
  isLoading: boolean;
  currentEvaluation: {
    artistic: string;
    cultural: string;
    critique: string;
    confidence: number;
  } | null;
  error: string | null;
  queueStatus: {
    pending: number;
    processing: boolean;
  };
}

interface UseAIEvaluationProps {
  personality: ArtistPersonality;
  apiKey?: string;
  baseUrl?: string;
  rateLimitMs?: number;
}

export function useAIEvaluation({ 
  personality, 
  apiKey, 
  baseUrl,
  rateLimitMs = 3000 
}: UseAIEvaluationProps) {
  const [state, setState] = useState<AIEvaluationState>({
    isLoading: false,
    currentEvaluation: null,
    error: null,
    queueStatus: { pending: 0, processing: false }
  });

  const serviceRef = useRef<AIEvaluationService | null>(null);

  // 初始化服务
  const initService = useCallback(() => {
    if (!serviceRef.current) {
      serviceRef.current = new AIEvaluationService(apiKey, baseUrl);
      serviceRef.current.setRateLimit(rateLimitMs);
    }
    return serviceRef.current;
  }, [apiKey, baseUrl, rateLimitMs]);

  // 评价位置
  const evaluateLocation = useCallback(async (
    keywords: string[],
    contextualKeywords: string[],
    position: { gridX: number; gridY: number }
  ) => {
    const service = initService();
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      const evaluation = await service.evaluateLocation({
        keywords,
        contextualKeywords,
        position,
        personality
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        currentEvaluation: evaluation,
        queueStatus: service.getQueueStatus()
      }));

      return evaluation;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '评价生成失败';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        queueStatus: service.getQueueStatus()
      }));

      // 返回默认评价
      const fallbackEvaluation = {
        artistic: '网络连接问题，无法获取AI评价',
        cultural: '请检查API配置',
        critique: '稍后重试',
        confidence: 0
      };

      return fallbackEvaluation;
    }
  }, [personality, initService]);

  // 批量评价
  const batchEvaluate = useCallback(async (
    locations: Array<{
      keywords: string[];
      contextualKeywords: string[];
      position: { gridX: number; gridY: number };
    }>
  ) => {
    const service = initService();
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      const requests = locations.map(location => ({
        ...location,
        personality
      }));

      const results = await service.batchEvaluateLocations(requests);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        queueStatus: service.getQueueStatus()
      }));

      return results;
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '批量评价失败',
        queueStatus: service.getQueueStatus()
      }));

      return [];
    }
  }, [personality, initService]);

  // 更新API配置
  const updateConfig = useCallback((newApiKey?: string, newBaseUrl?: string) => {
    const service = initService();
    service.updateConfig(newApiKey, newBaseUrl);
  }, [initService]);

  // 更新速率限制
  const updateRateLimit = useCallback((delayMs: number) => {
    const service = initService();
    service.setRateLimit(delayMs);
  }, [initService]);

  // 获取队列状态
  const refreshQueueStatus = useCallback(() => {
    const service = initService();
    const queueStatus = service.getQueueStatus();
    
    setState(prev => ({
      ...prev,
      queueStatus
    }));
    
    return queueStatus;
  }, [initService]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    // 状态
    isLoading: state.isLoading,
    currentEvaluation: state.currentEvaluation,
    error: state.error,
    queueStatus: state.queueStatus,
    
    // 操作
    evaluateLocation,
    batchEvaluate,
    updateConfig,
    updateRateLimit,
    refreshQueueStatus,
    clearError
  };
}