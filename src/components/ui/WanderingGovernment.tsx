'use client';

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { StudioCircle } from './StudioCircles';

interface WanderingGovernmentProps {
  gridSystem: GridSystem;
  className?: string;
  studioCircles: StudioCircle[]; // 切换到工作室圆形数据
  onStudioEvaluation?: (circleId: string, result: 'demolish' | 'passed') => void; // 评估结果回调
  onPublicOpinionHeatUpdate?: (increment: number) => void; // 舆论热度更新回调
  currentPeriod: string;
  isActive?: boolean; // 是否激活政府角色
  governmentInputs?: string[]; // 政府输入文本列表
}

export interface WanderingGovernmentRef {
  getCurrentPosition: () => { x: number; y: number };
  isPaused: () => boolean;
  pause: () => void;
  resume: () => void;
}

interface GovernmentEvaluation {
  circleId: string;
  position: { x: number; y: number };
  status: 'moving' | 'evaluating' | 'completed';
  result?: 'demolish' | 'passed';
  startTime?: number;
}

interface PermanentGovernmentComment {
  id: string;
  position: { x: number; y: number };
  result: 'demolish' | 'passed';
  timestamp: number;
}

const WanderingGovernment = forwardRef<WanderingGovernmentRef, WanderingGovernmentProps>(({
  gridSystem,
  className = '',
  studioCircles,
  onStudioEvaluation,
  onPublicOpinionHeatUpdate,
  currentPeriod,
  isActive = false,
  governmentInputs = []
}, ref) => {
  const [position, setPosition] = useState({ x: 100, y: 100 }); // 初始位置
  const [currentEvaluation, setCurrentEvaluation] = useState<GovernmentEvaluation | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // 打字机动画状态
  const [typewriterTextIndex, setTypewriterTextIndex] = useState(0); // 当前显示的文本索引
  const [typewriterCharIndex, setTypewriterCharIndex] = useState(0); // 当前显示的字符索引
  const [isTyping, setIsTyping] = useState(true); // true: 正在打字, false: 正在删除
  const [displayedText, setDisplayedText] = useState(''); // 当前显示的文本

  // 橙色圆形扩展动画状态
  const [expandingCircleRadius, setExpandingCircleRadius] = useState(0); // 扩展圆的当前半径
  const expandingCircleMaxRadius = 80; // 扩展圆的最大半径
  const expandingCircleSpeed = 2; // 扩展速度 (px/frame)

  const [evaluatedCircleIds, setEvaluatedCircleIds] = useState<Set<string>>(new Set());
  const [nextResult, setNextResult] = useState<'demolish' | 'passed'>('demolish'); // 下一个评估结果
  const [overlayCircles, setOverlayCircles] = useState<Array<{
    id: string;
    centerX: number;
    centerY: number;
    radius: number;
    isAnimating: boolean;
  }>>([]);
  const [permanentComments, setPermanentComments] = useState<PermanentGovernmentComment[]>([]);
  const [trajectory, setTrajectory] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // 只在2002-2006和2006-2010期间且被激活时显示
  const shouldShow = isActive && (currentPeriod === '2002-2006' || currentPeriod === '2006-2010');

  // 监听时期变化，清理内部状态
  useEffect(() => {
    if (!shouldShow) {
      // 时期变化时清理所有内部状态
      console.log('🧹 WanderingGovernment: Clearing internal state due to period change');
      setCurrentEvaluation(null);
      setEvaluatedCircleIds(new Set());
      setNextResult('demolish');
      setOverlayCircles([]);
      setPermanentComments([]);
      setPosition({ x: 100, y: 100 });
      setIsPaused(false);
      setTrajectory([]);
      // 清理打字机状态
      setTypewriterTextIndex(0);
      setTypewriterCharIndex(0);
      setIsTyping(true);
      setDisplayedText('');
      // 清理扩展圆状态
      setExpandingCircleRadius(0);
    }
  }, [shouldShow, currentPeriod]);

  // 打字机动画效果 - 仅在评估过程中且有输入文本时运行
  useEffect(() => {
    if (currentEvaluation?.status !== 'evaluating' || governmentInputs.length === 0) {
      setDisplayedText('');
      return;
    }

    const currentText = governmentInputs[typewriterTextIndex];
    const typingSpeed = 100; // 打字速度 (ms)
    const deletingSpeed = 50; // 删除速度 (ms)
    const pauseAfterTyping = 1500; // 打字完成后暂停时间 (ms)
    const pauseAfterDeleting = 500; // 删除完成后暂停时间 (ms)

    const timer = setTimeout(() => {
      if (isTyping) {
        // 正在打字
        if (typewriterCharIndex < currentText.length) {
          setDisplayedText(currentText.substring(0, typewriterCharIndex + 1));
          setTypewriterCharIndex(prev => prev + 1);
        } else {
          // 打字完成，暂停后开始删除
          setTimeout(() => {
            setIsTyping(false);
          }, pauseAfterTyping);
        }
      } else {
        // 正在删除
        if (typewriterCharIndex > 0) {
          setDisplayedText(currentText.substring(0, typewriterCharIndex - 1));
          setTypewriterCharIndex(prev => prev - 1);
        } else {
          // 删除完成，暂停后切换到下一个文本
          setTimeout(() => {
            setTypewriterTextIndex((prev) => (prev + 1) % governmentInputs.length);
            setIsTyping(true);
          }, pauseAfterDeleting);
        }
      }
    }, isTyping ? typingSpeed : deletingSpeed);

    return () => clearTimeout(timer);
  }, [currentEvaluation?.status, governmentInputs, typewriterTextIndex, typewriterCharIndex, isTyping]);

  // 重置打字机状态当评估状态改变时
  useEffect(() => {
    if (currentEvaluation?.status === 'evaluating') {
      setTypewriterTextIndex(0);
      setTypewriterCharIndex(0);
      setIsTyping(true);
      setDisplayedText('');
      setExpandingCircleRadius(0); // 重置扩展圆半径
    } else {
      setDisplayedText('');
      setExpandingCircleRadius(0); // 清空扩展圆
    }
  }, [currentEvaluation?.status]);

  useImperativeHandle(ref, () => ({
    getCurrentPosition: () => position,
    isPaused: () => isPaused,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false)
  }));

  // 寻找下一个需要评估的工作室圆形
  const findNextStudioCircle = () => {
    const unevaluatedCircles = studioCircles.filter(circle => !evaluatedCircleIds.has(circle.id));
    return unevaluatedCircles.length > 0 ? unevaluatedCircles[0] : null;
  };

  // 直线移动到目标位置
  const moveToTarget = (target: { x: number; y: number }) => {
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 3) {
      setPosition(target);
      return true; // 到达目标
    }

    const speed = 3; // 直线移动速度
    const moveX = (dx / distance) * speed;
    const moveY = (dy / distance) * speed;

    setPosition(prev => {
      const newPos = {
        x: prev.x + moveX,
        y: prev.y + moveY
      };

      // 记录轨迹点
      setTrajectory(prevTraj => {
        const now = Date.now();
        const newTrajectory = [...prevTraj, { x: newPos.x, y: newPos.y, timestamp: now }];

        // 只保留最近30秒的轨迹点
        const cutoffTime = now - 30000;
        return newTrajectory.filter(point => point.timestamp > cutoffTime);
      });

      return newPos;
    });
    return false;
  };

  // 主要行为逻辑
  useEffect(() => {
    if (!shouldShow || isPaused) return;

    const interval = setInterval(() => {
      // 如果当前没有评估任务，寻找下一个工作室圆形
      if (!currentEvaluation) {
        const nextCircle = findNextStudioCircle();
        if (nextCircle) {
          console.log('🏛️ Government targeting studio circle:', nextCircle.id);
          setCurrentEvaluation({
            circleId: nextCircle.id,
            position: { x: nextCircle.centerX, y: nextCircle.centerY },
            status: 'moving'
          });
        }
        return;
      }

      // 如果正在移动到目标
      if (currentEvaluation.status === 'moving') {
        const arrived = moveToTarget(currentEvaluation.position);
        if (arrived) {
          console.log('🏛️ Government arrived at studio circle:', currentEvaluation.circleId);

          // 创建覆盖圆形
          const targetCircle = studioCircles.find(c => c.id === currentEvaluation.circleId);
          if (targetCircle) {
            setOverlayCircles(prev => [...prev, {
              id: `overlay-${currentEvaluation.circleId}`,
              centerX: targetCircle.centerX,
              centerY: targetCircle.centerY,
              radius: targetCircle.radius,
              isAnimating: true
            }]);
          }

          // 开始评估
          setCurrentEvaluation(prev => prev ? {
            ...prev,
            status: 'evaluating',
            startTime: Date.now()
          } : null);
        }
      }

      // 如果正在评估
      if (currentEvaluation.status === 'evaluating' && currentEvaluation.startTime) {
        const elapsed = Date.now() - currentEvaluation.startTime;
        if (elapsed >= 10000) { // 10秒评估时间
          // 使用交替结果：demolish → passed → demolish → passed
          const result = nextResult;

          console.log(`🏛️ Government evaluation result: ${result} for circle:`, currentEvaluation.circleId);

          // 更新评估结果
          setCurrentEvaluation(prev => prev ? {
            ...prev,
            status: 'completed',
            result
          } : null);

          // 切换下一个结果
          setNextResult(result === 'demolish' ? 'passed' : 'demolish');

          // 通知父组件评估结果
          if (onStudioEvaluation) {
            onStudioEvaluation(currentEvaluation.circleId, result);
          }

          // 创建永久评论（特别是passed评论）
          if (result === 'passed') {
            const permanentComment: PermanentGovernmentComment = {
              id: `gov-comment-${currentEvaluation.circleId}-${Date.now()}`,
              position: currentEvaluation.position,
              result: result,
              timestamp: Date.now()
            };

            setPermanentComments(prev => [...prev, permanentComment]);
            console.log('✅ Created permanent government comment for passed evaluation:', permanentComment);
          }

          // 如果是demolish，移除覆盖圆形；如果是passed，保留覆盖圆形
          if (result === 'demolish') {
            setOverlayCircles(prev => prev.filter(c => c.id !== `overlay-${currentEvaluation.circleId}`));
            console.log('🗑️ Removed overlay circle for demolished studio');
          }

          // 如果是demolish，增加舆论热度
          if (result === 'demolish' && onPublicOpinionHeatUpdate) {
            onPublicOpinionHeatUpdate(1);
          }

          // 标记为已评估
          setEvaluatedCircleIds(prev => new Set([...prev, currentEvaluation.circleId]));

          // 1秒后开始寻找下一个目标
          setTimeout(() => {
            setCurrentEvaluation(null);
          }, 1000);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentEvaluation, isPaused, shouldShow, studioCircles, position]);

  // 绘制覆盖圆形和扩展圆动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !shouldShow) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸
    const canvasDims = gridSystem.getCanvasDimensions();
    canvas.width = canvasDims.width;
    canvas.height = canvasDims.height;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制政府轨迹（橙色）
      if (trajectory.length > 1) {
        const now = Date.now();
        ctx.save();
        ctx.strokeStyle = '#FF550F';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;

        ctx.beginPath();
        trajectory.forEach((point, index) => {
          // 根据时间计算透明度 (越新越不透明)
          const age = now - point.timestamp;
          const alpha = Math.max(0.1, 1 - age / 30000); // 30秒内从1.0淡化到0.1

          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.globalAlpha = alpha * 0.7;
            ctx.lineTo(point.x, point.y);
          }
        });

        ctx.stroke();
        ctx.restore();
      }

      // 绘制扩展圆动画 - 仅在评估过程中显示
      if (currentEvaluation?.status === 'evaluating') {
        ctx.save();
        ctx.strokeStyle = '#FF550F';
        ctx.lineWidth = 2;
        // 透明度随半径增加而减少
        const alpha = Math.max(0.2, 1 - expandingCircleRadius / expandingCircleMaxRadius);
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.arc(
          currentEvaluation.position.x,
          currentEvaluation.position.y,
          expandingCircleRadius,
          0,
          2 * Math.PI
        );
        ctx.stroke();

        ctx.restore();

        // 更新扩展圆半径
        setExpandingCircleRadius(prev => {
          if (prev >= expandingCircleMaxRadius) {
            return 0; // 重置到0，开始新的循环
          }
          return prev + expandingCircleSpeed;
        });
      }

      overlayCircles.forEach(circle => {
        // 绘制覆盖圆形 - #FF550F色，1.5px外轮廓，无填充
        ctx.save();
        ctx.strokeStyle = '#FF550F';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;

        ctx.beginPath();
        ctx.arc(circle.centerX, circle.centerY, circle.radius, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [overlayCircles, trajectory, gridSystem, shouldShow, currentEvaluation, expandingCircleRadius]);

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* Canvas for overlay circles */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{ zIndex: 35 }} // 在工作室圆形之上，在角色之下
      />

      {/* Government character */}
      <div className={`absolute inset-0 pointer-events-none ${className}`}>
        {/* 政府三角形光标 - #FF550F色，2倍艺术家大小 */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-linear"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 60
          }}
        >
          <div className="relative">
            {/* #FF550F色正三角形 - 2倍艺术家大小 */}
            <div
              className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent"
              style={{
                borderBottomColor: '#FF550F',
                filter: 'drop-shadow(0 0 3px rgba(255, 85, 15, 0.6))'
              }}
            />

            {/* 评估评论 - #FF550F色底，白色字，样式与艺术家评论一致 */}
            {currentEvaluation?.status === 'evaluating' && (
              <div
                className="absolute bg-white/60 px-2 py-1 text-[7px] leading-tight text-gray-800 whitespace-normal pointer-events-auto"
                style={{
                  backgroundColor: '#FF550F',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                  minHeight: 'auto',
                  minWidth: '80px',
                  maxWidth: '120px',
                  left: '0',
                  bottom: '15px',
                  transform: 'translateX(-50%)'
                }}
              >
                evaluating…
                {displayedText && (
                  <>
                    <br />
                    {displayedText}
                  </>
                )}

                {/* 连接线 - 15px长度 */}
                <div
                  className="absolute w-0.5 h-[15px] transition-opacity duration-500 opacity-100"
                  style={{
                    backgroundColor: '#FF550F',
                    backdropFilter: 'blur(4px)',
                    left: '50%',
                    top: '100%',
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            )}

            {/* 评估结果评论 */}
            {currentEvaluation?.status === 'completed' && currentEvaluation.result && (
              <div
                className="absolute bg-white/60 px-2 py-1 text-[7px] leading-tight text-gray-800 whitespace-normal pointer-events-auto"
                style={{
                  backgroundColor: '#FF550F',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                  minHeight: 'auto',
                  minWidth: '80px',
                  maxWidth: '120px',
                  left: '0',
                  bottom: '15px',
                  transform: 'translateX(-50%)'
                }}
              >
                {currentEvaluation.result}

                {/* 连接线 - 15px长度 */}
                <div
                  className="absolute w-0.5 h-[15px] transition-opacity duration-500 opacity-100"
                  style={{
                    backgroundColor: '#FF550F',
                    backdropFilter: 'blur(4px)',
                    left: '50%',
                    top: '100%',
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 永久政府评论 - 独立于政府角色位置 */}
      {permanentComments.map(comment => (
        <div
          key={comment.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${comment.position.x}px`,
            top: `${comment.position.y}px`,
            zIndex: 65
          }}
        >
          <div
            className="absolute bg-white/60 px-2 py-1 text-[7px] leading-tight text-gray-800 whitespace-normal pointer-events-auto"
            style={{
              backgroundColor: '#FF550F',
              color: 'white',
              backdropFilter: 'blur(4px)',
              minHeight: 'auto',
              minWidth: '80px',
              maxWidth: '120px',
              left: '0',
              bottom: '15px',
              transform: 'translateX(-50%)'
            }}
          >
            {comment.result}

            {/* 连接线 - 15px长度 */}
            <div
              className="absolute w-0.5 h-[15px] transition-opacity duration-500 opacity-100"
              style={{
                backgroundColor: '#FF550F',
                backdropFilter: 'blur(4px)',
                left: '50%',
                top: '100%',
                transform: 'translateX(-50%)'
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
});

WanderingGovernment.displayName = 'WanderingGovernment';

export default WanderingGovernment;