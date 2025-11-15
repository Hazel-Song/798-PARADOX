'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { TrajectorySystem } from '@/lib/character/TrajectorySystem';
import { CharacterRenderer } from '@/lib/character/CharacterRenderer';
import { Character, ArtistPersonality } from '@/types/character';

interface WanderingCharacterProps {
  gridSystem: GridSystem;
  className?: string;
  onCharacterUpdate?: (character: Character) => void;
  onEvaluation?: (keywords: string[], evaluation: string) => void;
  onEvaluationStart?: (keywords: string[]) => void;
  onAIEvaluation?: (evaluation: { artistic: string; cultural: string; critique: string; confidence: number }) => void;
  apiKey?: string;
  baseUrl?: string;
  onDebugDataUpdate?: (data: {
    aiServiceStatus: { pending: number; processing: boolean };
    evaluationInterval: number;
    evaluationCount: number;
    lastKeywords: string[];
    timeRemaining: number;
  }) => void;
}

export interface WanderingCharacterRef {
  manualEvaluation: () => void;
  regenerateTrajectory: () => void;
  toggleMovement: () => void;
  setSpeed: (speed: number) => void;
  isPaused: () => boolean;
  getCurrentPosition: () => { x: number; y: number };
}

const defaultArtistPersonality: ArtistPersonality = {
  name: "ARTIST",
  background: "一位在798艺术区工作十年的当代艺术评论家，专注于中国当代艺术与城市空间的关系研究。",
  artisticStyle: "批判现实主义与后现代主义结合",
  criticalPerspective: "关注艺术商业化与原创性之间的张力，以及城市发展对艺术生态的影响",
  evaluationPrompts: {
    locationAnalysis: "作为一位经验丰富的艺术评论家，请分析当前位置的文化意义和艺术价值。",
    keywordInterpretation: "请从艺术史和文化研究的角度解释这些关键词的深层含义。",
    culturalCritique: "请提供对798艺术区发展现状的批判性思考。"
  }
};

const WanderingCharacter = forwardRef<WanderingCharacterRef, WanderingCharacterProps>(({ 
  gridSystem, 
  className = '',
  onCharacterUpdate,
  onEvaluation,
  onEvaluationStart,
  onAIEvaluation,
  apiKey,
  baseUrl,
  onDebugDataUpdate
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trajectorySystemRef = useRef<TrajectorySystem | null>(null);
  const rendererRef = useRef<CharacterRenderer | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [aiServiceStatus, setAiServiceStatus] = useState({ pending: 0, processing: false });

  useEffect(() => {
    console.log('WanderingCharacter: useEffect triggered', { 
      hasCanvas: !!canvasRef.current, 
      hasGridSystem: !!gridSystem 
    });
    
    if (!canvasRef.current || !gridSystem) {
      console.log('WanderingCharacter: Early return - missing canvas or gridSystem');
      return;
    }

    // 初始化轨迹系统
    console.log('WanderingCharacter: Creating TrajectorySystem...');
    trajectorySystemRef.current = new TrajectorySystem(gridSystem, defaultArtistPersonality);
    console.log('WanderingCharacter: TrajectorySystem created successfully');
    
    // 设置画布尺寸为Demo Test区域的固定尺寸 (与MapGridCanvas保持一致)
    trajectorySystemRef.current.setCanvasDimensions(600, 400);
    console.log('WanderingCharacter: Canvas dimensions set to 600x400');
    
    // 配置AI服务
    if (apiKey || baseUrl) {
      trajectorySystemRef.current.updateAIConfig(apiKey, baseUrl);
    }
    
    // 设置AI评价回调
    trajectorySystemRef.current.setEvaluationCallback((aiEvaluation) => {
      console.log('🚀 WanderingCharacter: AI evaluation callback triggered!', aiEvaluation);
      if (onAIEvaluation) {
        console.log('🚀 WanderingCharacter: Calling onAIEvaluation prop...');
        onAIEvaluation(aiEvaluation);
      } else {
        console.log('❌ WanderingCharacter: onAIEvaluation prop is missing!');
      }
    });

    // 设置评估开始回调
    trajectorySystemRef.current.setEvaluationStartCallback((keywords) => {
      if (onEvaluationStart) {
        onEvaluationStart(keywords);
      }
    });
    
    // 初始化渲染器
    rendererRef.current = new CharacterRenderer(canvasRef.current);
    
    // 设置初始角色
    console.log('WanderingCharacter: Getting initial character...');
    const initialCharacter = trajectorySystemRef.current.getCharacter();
    console.log('WanderingCharacter: Initial character:', initialCharacter);
    setCharacter(initialCharacter);
    rendererRef.current.setCharacter(initialCharacter);

    // 开始游走
    console.log('WanderingCharacter: Starting wandering...');
    trajectorySystemRef.current.startWandering();
    setIsActive(true);
    console.log('WanderingCharacter: Component fully initialized');

    // 定期更新角色状态
    const updateInterval = setInterval(() => {
      if (trajectorySystemRef.current) {
        const updatedCharacter = trajectorySystemRef.current.getCharacter();
        setCharacter(updatedCharacter);
        
        if (rendererRef.current) {
          rendererRef.current.setCharacter(updatedCharacter);
        }
        
        if (onCharacterUpdate) {
          onCharacterUpdate(updatedCharacter);
        }
        
        // 更新AI服务状态
        const aiStatus = trajectorySystemRef.current.getAIServiceStatus();
        setAiServiceStatus(aiStatus);

        // 发送调试数据更新
        if (onDebugDataUpdate) {
          onDebugDataUpdate({
            aiServiceStatus: aiStatus,
            evaluationInterval: trajectorySystemRef.current.getEvaluationIntervalSeconds(),
            evaluationCount: trajectorySystemRef.current.getEvaluationCount(),
            lastKeywords: trajectorySystemRef.current.getLastKeywords(),
            timeRemaining: trajectorySystemRef.current.getEvaluationTimeRemaining()
          });
        }

        // 检查是否有新的评价
        if (updatedCharacter.lastEvaluation && 
            (!character || !character.lastEvaluation || 
             updatedCharacter.lastEvaluation.timestamp > character.lastEvaluation.timestamp)) {
          const currentKeywords = trajectorySystemRef.current.getCurrentKeywords();
          if (onEvaluation) {
            onEvaluation(currentKeywords, updatedCharacter.lastEvaluation.evaluation);
          }
          
          // 显示评价气泡
          if (rendererRef.current && 
              updatedCharacter.lastEvaluation.evaluation !== '等待AI评价...' && 
              updatedCharacter.lastEvaluation.evaluation !== 'AI正在分析中...') {
            rendererRef.current.drawEvaluationBubble(
              updatedCharacter.lastEvaluation.evaluation.substring(0, 100) + '...',
              4000
            );
          }
        }
      } else {
        console.warn('WanderingCharacter: trajectorySystemRef.current is null in updateInterval');
      }
    }, 100);

    // 处理窗口大小变化
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize();
      }
      
      // 更新轨迹系统的画布尺寸 (保持固定600x400)
      if (trajectorySystemRef.current) {
        trajectorySystemRef.current.setCanvasDimensions(600, 400);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(updateInterval);
      window.removeEventListener('resize', handleResize);
      
      if (trajectorySystemRef.current) {
        trajectorySystemRef.current.stopWandering();
      }
      
      if (rendererRef.current) {
        rendererRef.current.stopRendering();
      }
    };
  }, [gridSystem]);

  // 暴露控制方法给父组件
  useImperativeHandle(ref, () => ({
    manualEvaluation: () => {
      if (trajectorySystemRef.current) {
        trajectorySystemRef.current.forceEvaluation();
      }
    },
    regenerateTrajectory: () => {
      if (trajectorySystemRef.current) {
        trajectorySystemRef.current.regenerateTrajectory();
      }
    },
    toggleMovement: () => {
      if (trajectorySystemRef.current) {
        trajectorySystemRef.current.toggleMovement();
      }
    },
    setSpeed: (speed: number) => {
      if (trajectorySystemRef.current) {
        trajectorySystemRef.current.setSpeed(speed);
      }
    },
    isPaused: () => {
      return trajectorySystemRef.current ? trajectorySystemRef.current.isPausedState() : false;
    },
    getCurrentPosition: () => {
      return trajectorySystemRef.current ? trajectorySystemRef.current.getCurrentPosition() : { x: 0, y: 0 };
    }
  }));

  // 手动触发评价
  const triggerEvaluation = () => {
    if (trajectorySystemRef.current) {
      trajectorySystemRef.current.forceEvaluation();
    }
  };

  // 调整评价间隔
  const setEvaluationInterval = (intervalMs: number) => {
    if (trajectorySystemRef.current) {
      trajectorySystemRef.current.setEvaluationInterval(intervalMs);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ 
          width: '100%', 
          height: '100%',
          zIndex: 10 // 确保在背景之上
        }}
      />
      

      {/* 活动状态指示器 */}
      <div className="absolute bottom-2 right-2 z-20">
        <div className={`w-3 h-3 rounded-full ${
          isActive && character?.isMoving 
            ? 'bg-green-400 animate-pulse' 
            : isActive 
              ? 'bg-white' 
              : 'bg-red-400'
        }`}></div>
      </div>
    </div>
  );
});

WanderingCharacter.displayName = 'WanderingCharacter';

export default WanderingCharacter;