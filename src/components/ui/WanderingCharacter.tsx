'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { TrajectorySystem, RestrictedZone } from '@/lib/character/TrajectorySystem';
import { CharacterRenderer } from '@/lib/character/CharacterRenderer';
import { Character, ArtistPersonality } from '@/types/character';

interface WanderingCharacterProps {
  gridSystem: GridSystem;
  className?: string;
  artistId?: string; // 新增：艺术家ID，用于区分不同艺术家
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
  restrictedZones?: RestrictedZone[]; // 新增：限制区域列表
  currentPeriod?: string; // 新增：当前时期
}

export interface WanderingCharacterRef {
  manualEvaluation: () => void;
  regenerateTrajectory: () => void;
  toggleMovement: () => void;
  setSpeed: (speed: number) => void;
  isPaused: () => boolean;
  getCurrentPosition: () => { x: number; y: number };
  updateCanvasDimensions: (width: number, height: number) => void; // 新增：更新canvas尺寸
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
  artistId = 'artist-default', // 默认艺术家ID
  onCharacterUpdate,
  onEvaluation,
  onEvaluationStart,
  onAIEvaluation,
  apiKey,
  baseUrl,
  onDebugDataUpdate,
  restrictedZones = [], // 默认空数组
  currentPeriod = '' // 默认空字符串
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
    console.log('WanderingCharacter: Creating TrajectorySystem with artistId:', artistId);
    trajectorySystemRef.current = new TrajectorySystem(gridSystem, defaultArtistPersonality, artistId);
    console.log('WanderingCharacter: TrajectorySystem created successfully');

    // 使用GridSystem的实际canvas尺寸
    const canvasDimensions = gridSystem.getCanvasDimensions();
    trajectorySystemRef.current.setCanvasDimensions(canvasDimensions.width, canvasDimensions.height);
    console.log('WanderingCharacter: Canvas dimensions set to', canvasDimensions.width + 'x' + canvasDimensions.height);
    
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
    
    // 初始化渲染器 - 暂时禁用，使用SimpleArtistDot代替
    // rendererRef.current = new CharacterRenderer(canvasRef.current);
    
    // 设置初始角色
    console.log('WanderingCharacter: Getting initial character...');
    const initialCharacter = trajectorySystemRef.current.getCharacter();
    console.log('WanderingCharacter: Initial character:', initialCharacter);
    setCharacter(initialCharacter);
    // rendererRef.current.setCharacter(initialCharacter); // 禁用CharacterRenderer

    // 开始游走
    console.log('WanderingCharacter: Starting wandering...');
    trajectorySystemRef.current.startWandering();
    setIsActive(true);
    console.log('WanderingCharacter: Component fully initialized');

    // 定期更新角色状态
    const updateInterval = setInterval(() => {
      if (trajectorySystemRef.current) {
        const updatedCharacter = trajectorySystemRef.current.getCharacter();

        // 只在角色状态实际变化时更新state，避免无意义的re-render
        setCharacter(prevCharacter => {
          // 检查是否有实质性变化
          const hasPositionChanged = !prevCharacter ||
            prevCharacter.position.x !== updatedCharacter.position.x ||
            prevCharacter.position.y !== updatedCharacter.position.y;

          const hasMovementChanged = !prevCharacter ||
            prevCharacter.isMoving !== updatedCharacter.isMoving;

          const hasEvaluationChanged = !prevCharacter?.lastEvaluation ||
            !updatedCharacter.lastEvaluation ||
            prevCharacter.lastEvaluation.timestamp !== updatedCharacter.lastEvaluation.timestamp;

          // 如果有任何实质性变化，返回新对象；否则返回旧对象
          if (hasPositionChanged || hasMovementChanged || hasEvaluationChanged) {
            return updatedCharacter;
          }
          return prevCharacter;
        });

        // 禁用CharacterRenderer更新，使用SimpleArtistDot代替
        // if (rendererRef.current) {
        //   rendererRef.current.setCharacter(updatedCharacter);
        // }

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

          // 显示评价气泡 - 禁用，使用CommentTags代替
          // if (rendererRef.current &&
          //     updatedCharacter.lastEvaluation.evaluation !== '等待AI评价...' &&
          //     updatedCharacter.lastEvaluation.evaluation !== 'AI正在分析中...') {
          //   rendererRef.current.drawEvaluationBubble(
          //     updatedCharacter.lastEvaluation.evaluation.substring(0, 100) + '...',
          //     4000
          //   );
          // }
        }
      } else {
        console.warn('WanderingCharacter: trajectorySystemRef.current is null in updateInterval');
      }
    }, 100);

    // 处理窗口大小变化
    const handleResize = () => {
      // 禁用CharacterRenderer的resize调用
      // if (rendererRef.current) {
      //   rendererRef.current.resize();
      // }

      // 更新轨迹系统的画布尺寸 - 使用动态尺寸
      if (trajectorySystemRef.current && gridSystem) {
        const canvasDimensions = gridSystem.getCanvasDimensions();
        trajectorySystemRef.current.setCanvasDimensions(canvasDimensions.width, canvasDimensions.height);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(updateInterval);
      window.removeEventListener('resize', handleResize);

      if (trajectorySystemRef.current) {
        trajectorySystemRef.current.stopWandering();
      }

      // 禁用CharacterRenderer的停止渲染调用
      // if (rendererRef.current) {
      //   rendererRef.current.stopRendering();
      // }
    };
  }, [gridSystem]);

  // 更新限制区域
  useEffect(() => {
    if (trajectorySystemRef.current && restrictedZones) {
      console.log('🔄 WanderingCharacter: Updating restricted zones for artist', artistId, restrictedZones.length);
      trajectorySystemRef.current.updateRestrictedZones(restrictedZones);
    }
  }, [restrictedZones, artistId]);

  // 根据时期调整评估间隔
  useEffect(() => {
    if (trajectorySystemRef.current) {
      // period-3 (2006–2010) 及以后使用10秒间隔，其他时期使用5秒间隔
      const interval = (currentPeriod === '2006–2010' || currentPeriod === '2010–2017') ? 10000 : 5000;
      console.log(`⏱️ WanderingCharacter: Setting evaluation interval to ${interval}ms for period: ${currentPeriod}`);
      trajectorySystemRef.current.setEvaluationInterval(interval);
    }
  }, [currentPeriod]);

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
    },
    updateCanvasDimensions: (width: number, height: number) => {
      if (trajectorySystemRef.current) {
        console.log('🔄 WanderingCharacter: Updating canvas dimensions via ref:', { width, height });
        trajectorySystemRef.current.setCanvasDimensions(width, height);
      }
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