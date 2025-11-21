'use client';

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { StudioCircle } from './StudioCircles';
import { CommentTag } from './CommentTags';

interface WanderingGovernmentProps {
  gridSystem: GridSystem;
  className?: string;
  studioCircles: StudioCircle[]; // 切换到工作室圆形数据
  commentTags?: CommentTag[]; // period-3中评估的commentTags
  onStudioEvaluation?: (circleId: string, result: 'demolish' | 'passed') => void; // 评估结果回调
  onCommentTagEvaluation?: (tagId: string) => void; // period-3中评估commentTag的回调
  onPublicOpinionHeatUpdate?: (increment: number) => void; // 舆论热度更新回调
  currentPeriod: string;
  isActive?: boolean; // 是否激活政府角色
  governmentInputs?: string[]; // 政府输入文本列表
  onAnimationComplete?: () => void; // 动画完成回调
}

export interface WanderingGovernmentRef {
  getCurrentPosition: () => { x: number; y: number };
  isPaused: () => boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void; // 重置政府角色状态
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
  commentTags = [],
  onStudioEvaluation,
  onCommentTagEvaluation,
  onPublicOpinionHeatUpdate,
  currentPeriod,
  isActive = false,
  governmentInputs = [],
  onAnimationComplete
}, ref) => {
  const [position, setPosition] = useState({ x: 100, y: 100 }); // 初始位置
  const [currentEvaluation, setCurrentEvaluation] = useState<GovernmentEvaluation | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // 打字机动画状态
  const [typewriterTextIndex, setTypewriterTextIndex] = useState(0); // 当前显示的文本索引
  const [typewriterCharIndex, setTypewriterCharIndex] = useState(0); // 当前显示的字符索引
  const [isTyping, setIsTyping] = useState(true); // true: 正在打字, false: 正在删除
  const [displayedText, setDisplayedText] = useState(''); // 当前显示的文本

  // 橙色圆形扩展动画状态 - 使用 ref 避免无限循环
  const expandingCircleRadiusRef = useRef(0); // 扩展圆的当前半径
  const expandingCircleMaxRadius = 80; // 扩展圆的最大半径
  const expandingCircleSpeed = 2; // 扩展速度 (px/frame)

  // 用ref保存governmentInputs，避免依赖数组导致的循环
  const governmentInputsRef = useRef<string[]>(governmentInputs);

  const [evaluatedCircleIds, setEvaluatedCircleIds] = useState<Set<string>>(new Set());
  const [evaluatedTagIds, setEvaluatedTagIds] = useState<Set<string>>(new Set()); // period-3中已评估的commentTag ID
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
  const shouldShow = isActive && (currentPeriod === '2002-2006' || currentPeriod === '2006–2010');

  // 监听时期变化，清理内部状态
  useEffect(() => {
    if (!shouldShow) {
      // 时期变化时清理所有内部状态
      console.log('🧹 WanderingGovernment: Clearing internal state due to period change');
      setCurrentEvaluation(null);
      setEvaluatedCircleIds(new Set());
      setEvaluatedTagIds(new Set());
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
      expandingCircleRadiusRef.current = 0;
    }
  }, [shouldShow, currentPeriod]);

  // 打字机动画效果 - 仅在评估过程中且有输入文本时运行
  useEffect(() => {
    // 更新ref以获取最新的governmentInputs
    governmentInputsRef.current = governmentInputs;
  }, [governmentInputs]);

  useEffect(() => {
    if (currentEvaluation?.status !== 'evaluating' || governmentInputsRef.current.length === 0) {
      setDisplayedText('');
      return;
    }

    const currentText = governmentInputsRef.current[typewriterTextIndex % governmentInputsRef.current.length];
    if (!currentText) return; // 安全检查

    const typingSpeed = 33; // 打字速度 (ms) - 从100ms减少到33ms，3倍加速
    const deletingSpeed = 17; // 删除速度 (ms) - 从50ms减少到17ms，3倍加速
    const pauseAfterTyping = 500; // 打字完成后暂停时间 (ms) - 从1500ms减少到500ms
    const pauseAfterDeleting = 200; // 删除完成后暂停时间 (ms) - 从500ms减少到200ms

    let timeoutId: NodeJS.Timeout;

    if (isTyping) {
      // 正在打字
      if (typewriterCharIndex < currentText.length) {
        timeoutId = setTimeout(() => {
          setDisplayedText(currentText.substring(0, typewriterCharIndex + 1));
          setTypewriterCharIndex(prev => prev + 1);
        }, typingSpeed);
      } else {
        // 打字完成，暂停后开始删除
        timeoutId = setTimeout(() => {
          setIsTyping(false);
        }, pauseAfterTyping);
      }
    } else {
      // 正在删除
      if (typewriterCharIndex > 0) {
        timeoutId = setTimeout(() => {
          setDisplayedText(currentText.substring(0, typewriterCharIndex - 1));
          setTypewriterCharIndex(prev => prev - 1);
        }, deletingSpeed);
      } else {
        // 删除完成，暂停后切换到下一个文本
        timeoutId = setTimeout(() => {
          setTypewriterTextIndex((prev) => (prev + 1) % Math.max(1, governmentInputsRef.current.length));
          setIsTyping(true);
        }, pauseAfterDeleting);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentEvaluation?.status, typewriterTextIndex, typewriterCharIndex, isTyping]);

  // 重置打字机状态当评估状态改变时
  useEffect(() => {
    if (currentEvaluation?.status === 'evaluating') {
      setTypewriterTextIndex(0);
      setTypewriterCharIndex(0);
      setIsTyping(true);
      setDisplayedText('');
      expandingCircleRadiusRef.current = 0; // 重置扩展圆半径
    } else {
      setDisplayedText('');
      expandingCircleRadiusRef.current = 0; // 清空扩展圆
    }
  }, [currentEvaluation?.status]);

  useImperativeHandle(ref, () => ({
    getCurrentPosition: () => position,
    isPaused: () => isPaused,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),
    reset: () => {
      console.log('🔄 WanderingGovernment: Resetting all internal state');
      setCurrentEvaluation(null);
      setEvaluatedCircleIds(new Set());
      setEvaluatedTagIds(new Set());
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
      expandingCircleRadiusRef.current = 0;
    }
  }));

  // 寻找下一个需要评估的工作室圆形
  const findNextStudioCircle = () => {
    const unevaluatedCircles = studioCircles.filter(circle => !evaluatedCircleIds.has(circle.id));
    return unevaluatedCircles.length > 0 ? unevaluatedCircles[0] : null;
  };

  // 寻找下一个需要评估的commentTag（period-3中使用）
  const findNextCommentTag = () => {
    // 只评估非抗议标签、未被评估的标签
    const unevaluatedTags = commentTags.filter(tag =>
      !evaluatedTagIds.has(tag.id) &&
      !tag.isProtestTag &&
      !tag.isGovernmentEvaluated &&
      !tag.id.startsWith('pending-evaluation-')
    );
    return unevaluatedTags.length > 0 ? unevaluatedTags[0] : null;
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

    const isPeriod3 = currentPeriod === '2006–2010';
    const evaluationTime = isPeriod3 ? 3000 : 10000; // period-3中3秒评估，period-2中10秒评估

    const interval = setInterval(() => {
      // 如果当前没有评估任务，寻找下一个目标
      if (!currentEvaluation) {
        if (isPeriod3) {
          // period-3：评估commentTags
          const nextTag = findNextCommentTag();
          if (nextTag) {
            console.log('🏛️ Government targeting comment tag:', nextTag.id);
            setCurrentEvaluation({
              circleId: nextTag.id,
              position: { x: nextTag.position.x, y: nextTag.position.y },
              status: 'moving'
            });
          }
        } else {
          // period-2：评估工作室圆形
          const nextCircle = findNextStudioCircle();
          if (nextCircle) {
            console.log('🏛️ Government targeting studio circle:', nextCircle.id);
            setCurrentEvaluation({
              circleId: nextCircle.id,
              position: { x: nextCircle.centerX, y: nextCircle.centerY },
              status: 'moving'
            });
          }
        }
        return;
      }

      // 如果正在移动到目标
      if (currentEvaluation.status === 'moving') {
        const arrived = moveToTarget(currentEvaluation.position);
        if (arrived) {
          console.log('🏛️ Government arrived at target:', currentEvaluation.circleId);

          if (!isPeriod3) {
            // period-2：创建覆盖圆形
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
        if (elapsed >= evaluationTime) {
          if (isPeriod3) {
            // period-3：评估完成后标记commentTag
            console.log(`🏛️ Government evaluated comment tag:`, currentEvaluation.circleId);

            // 通知父组件评估结果
            if (onCommentTagEvaluation) {
              onCommentTagEvaluation(currentEvaluation.circleId);
            }

            // 标记为已评估
            setEvaluatedTagIds(prev => new Set([...prev, currentEvaluation.circleId]));

            // 增加舆论热度
            if (onPublicOpinionHeatUpdate) {
              onPublicOpinionHeatUpdate(1);
            }

            // 更新评估结果
            setCurrentEvaluation(prev => prev ? {
              ...prev,
              status: 'completed',
              result: 'demolish' // period-3中所有评估结果都视为某种形式的"控制"
            } : null);

            // 通知动画完成
            if (onAnimationComplete) {
              onAnimationComplete();
            }

            // 500ms后开始寻找下一个目标
            setTimeout(() => {
              setCurrentEvaluation(null);
            }, 500);
          } else {
            // period-2原有逻辑
            // 使用交替结果：demolish → passed → demolish → passed
            const result = nextResult;

            console.log(`🏛️ Government evaluation result: ${result} for circle:`, currentEvaluation.circleId);

            // 更新评估结果
            setCurrentEvaluation(prev => prev ? {
              ...prev,
              status: 'completed',
              result
            } : null);

            // 通知动画完成
            if (onAnimationComplete) {
              onAnimationComplete();
            }

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
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentEvaluation, isPaused, shouldShow, studioCircles, commentTags, position, currentPeriod]);

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

      // 绘制政府轨迹（橙色）- 添加渐变消失效果
      if (trajectory.length > 1) {
        const now = Date.now();

        // 为每段轨迹绘制单独的线条以实现渐变效果
        for (let i = 1; i < trajectory.length; i++) {
          const prevPoint = trajectory[i - 1];
          const currentPoint = trajectory[i];

          // 计算当前点的年龄和透明度
          const age = now - currentPoint.timestamp;
          const maxAge = 30000; // 30秒完全消失
          let alpha = Math.max(0.1, 1 - age / maxAge);

          // 根据轨迹位置添加额外的渐变（越靠前的点越透明）
          const positionFade = i / trajectory.length; // 0到1
          alpha = alpha * (0.3 + 0.7 * (1 - positionFade)); // 前面的点透明度更低

          ctx.save();
          ctx.strokeStyle = `rgba(255, 85, 15, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(currentPoint.x, currentPoint.y);
          ctx.stroke();

          ctx.restore();
        }
      }

      // 绘制扩展圆动画 - 仅在评估过程中显示
      if (currentEvaluation?.status === 'evaluating') {
        ctx.save();
        ctx.strokeStyle = '#FF550F';
        ctx.lineWidth = 2;
        // 透明度随半径增加而减少
        const alpha = Math.max(0.2, 1 - expandingCircleRadiusRef.current / expandingCircleMaxRadius);
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.arc(
          currentEvaluation.position.x,
          currentEvaluation.position.y,
          expandingCircleRadiusRef.current,
          0,
          2 * Math.PI
        );
        ctx.stroke();

        ctx.restore();

        // 更新扩展圆半径 - 使用 ref 避免触发重新渲染
        if (expandingCircleRadiusRef.current >= expandingCircleMaxRadius) {
          expandingCircleRadiusRef.current = 0; // 重置到0，开始新的循环
        } else {
          expandingCircleRadiusRef.current += expandingCircleSpeed;
        }
      }

      overlayCircles.forEach(circle => {
        // 绘制覆盖圆形 - #FF8126色，1px虚线外轮廓，无填充
        ctx.save();
        ctx.strokeStyle = '#FF8126';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1.0; // 提至100%透明度
        ctx.setLineDash([4, 4]); // 虚线样式

        ctx.beginPath();
        ctx.arc(circle.centerX, circle.centerY, circle.radius, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.setLineDash([]); // 重置虚线样式
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
  }, [overlayCircles, trajectory, gridSystem, shouldShow, currentEvaluation]);

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
            {/* REGULATOR 标签 - 橙色文本跟随政府角色 */}
            <div
              className="absolute text-[12px] font-mono whitespace-nowrap"
              style={{
                color: '#FF550F',
                bottom: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                textShadow: '0 0 4px rgba(255, 85, 15, 0.6)'
              }}
            >
              REGULATOR
            </div>

            {/* #FF550F色正棱形 - 正方形旋转45度 */}
            <div
              className="w-[10px] h-[10px]"
              style={{
                backgroundColor: '#FF550F',
                filter: 'drop-shadow(0 0 3px rgba(255, 85, 15, 0.6))',
                transform: 'rotate(45deg)'
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
                className="absolute bg-white/60 px-2 py-1 text-[7px] leading-tight text-gray-800 whitespace-nowrap pointer-events-auto"
                style={{
                  backgroundColor: '#FF550F',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                  minHeight: 'auto',
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
            className="absolute bg-white/60 px-2 py-1 text-[7px] leading-tight text-gray-800 whitespace-nowrap pointer-events-auto"
            style={{
              backgroundColor: '#FF550F',
              color: 'white',
              backdropFilter: 'blur(4px)',
              minHeight: 'auto',
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