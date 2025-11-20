import { Character, TrajectoryPoint, ArtistPersonality } from '@/types/character';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { Position } from '@/types/map-grid';
import { AIEvaluationService } from '@/lib/ai/AIEvaluationService';

// 限制区域类型定义
export interface RestrictedZone {
  centerX: number;
  centerY: number;
  radius: number;
  type: 'passed' | 'evaluating';
}

export class TrajectorySystem {
  private gridSystem: GridSystem;
  private character: Character;
  private animationFrame: number | null = null;
  private lastUpdateTime: number = 0;
  private evaluationInterval: number = 5000; // 5秒评价一次
  private nextEvaluationTime: number = 0;
  private aiService: AIEvaluationService;
  private onEvaluationCallback?: (evaluation: { sight: string; thought: string; confidence: number }) => void;
  private onEvaluationStartCallback?: (keywords: string[]) => void;
  private canvasWidth: number = 600;
  private canvasHeight: number = 400;
  private evaluationCount: number = 0;
  private isPaused: boolean = false;
  private lastKeywords: string[] = [];
  private restrictedZones: RestrictedZone[] = []; // 新增：限制区域列表

  constructor(gridSystem: GridSystem, artistPersonality: ArtistPersonality, artistId?: string) {
    this.gridSystem = gridSystem;

    // 立即同步canvas尺寸
    const canvasDimensions = gridSystem.getCanvasDimensions();
    this.canvasWidth = canvasDimensions.width;
    this.canvasHeight = canvasDimensions.height;

    // 获取GridSystem的详细信息进行对比
    const gridInfo = gridSystem.getGridInfo();

    console.log('🔧 TrajectorySystem Constructor Debug:', {
      canvasDimensions,
      gridInfo,
      expectedCanvasFromGrid: {
        width: gridInfo.width * gridInfo.cellSize,
        height: gridInfo.height * gridInfo.cellSize
      },
      'gridInfo.width * cellSize': gridInfo.width * gridInfo.cellSize,
      'gridInfo.height * cellSize': gridInfo.height * gridInfo.cellSize,
      'actual canvas': { width: this.canvasWidth, height: this.canvasHeight }
    });

    this.character = this.createCharacter(artistPersonality, artistId);
    this.aiService = new AIEvaluationService();
    this.generateInitialTrajectory();
  }

  private createCharacter(personality: ArtistPersonality, artistId?: string): Character {
    const gridInfo = this.gridSystem.getGridInfo();

    // 为不同艺术家创建不同的初始位置，基于艺术家ID
    const seed = artistId ? this.hashString(artistId) : 0;
    const random1 = (Math.sin(seed) + 1) / 2;
    const random2 = (Math.cos(seed) + 1) / 2;

    // 在网格系统的有效范围内定位，避免重叠
    const randomGridX = Math.floor(random1 * gridInfo.width);
    const randomGridY = Math.floor(random2 * gridInfo.height);

    // 🔧 使用GridSystem的实际画布尺寸
    const canvasDims = this.gridSystem.getCanvasDimensions();

    // 计算画布坐标 - 在网格单元中心位置
    const actualCellWidth = canvasDims.width / gridInfo.width;
    const actualCellHeight = canvasDims.height / gridInfo.height;
    const startCanvasX = (randomGridX + 0.5) * actualCellWidth;
    const startCanvasY = (randomGridY + 0.5) * actualCellHeight;

    // 关键问题：使用GridSystem的转换方法进行对比
    const gridSystemConversion = this.gridSystem.gridToScreen(randomGridX + 0.5, randomGridY + 0.5);

    console.log('🎯 Character Creation Coordinate Debug:', {
      artistId,
      gridInfo,
      canvasDimensions: canvasDims,
      randomGrid: { x: randomGridX, y: randomGridY },
      cellSize: { width: actualCellWidth, height: actualCellHeight },
      'Method1_TrajectorySystem': { x: startCanvasX, y: startCanvasY },
      'Method2_GridSystem': gridSystemConversion,
      'Coordinate_Difference': {
        x: Math.abs(startCanvasX - gridSystemConversion.x),
        y: Math.abs(startCanvasY - gridSystemConversion.y)
      }
    });

    // 🚨 使用实际画布尺寸的边界检查
    const margin = Math.min(actualCellWidth, actualCellHeight) * 0.3;
    const minValidX = margin;
    const minValidY = margin;
    const maxValidX = canvasDims.width - margin;
    const maxValidY = canvasDims.height - margin;

    const clampedX = Math.max(minValidX, Math.min(maxValidX, startCanvasX));
    const clampedY = Math.max(minValidY, Math.min(maxValidY, startCanvasY));

    // 特别检查初始位置是否会违反下边界
    if (startCanvasY >= maxValidY) {
      console.error('🚨 CHARACTER CREATION: Lower boundary violation prevented!', {
        randomGridY,
        startCanvasY,
        clampedY,
        maxValidY,
        canvasHeight: canvasDims.height
      });
    }

    console.log('Character creation final position:', {
      gridInfo,
      cellSize: { width: actualCellWidth, height: actualCellHeight },
      canvas: { width: canvasDims.width, height: canvasDims.height },
      calculated: { x: startCanvasX, y: startCanvasY },
      clamped: { x: clampedX, y: clampedY },
      boundaries: { minX: minValidX, maxX: maxValidX, minY: minValidY, maxY: maxValidY }
    });

    return {
      id: artistId || 'wandering-artist',
      name: personality.name,
      position: { x: clampedX, y: clampedY },
      targetPosition: { x: clampedX, y: clampedY },
      gridPosition: { gridX: randomGridX, gridY: randomGridY },
      speed: 40, // 基础速度为40像素每秒
      isMoving: false,
      personality,
      trajectory: [],
      currentTrajectoryIndex: 0
    };
  }

  private generateInitialTrajectory(): void {
    const trajectory: TrajectoryPoint[] = [];

    // 起始点
    trajectory.push({
      x: this.character.position.x,
      y: this.character.position.y,
      gridX: this.character.gridPosition.gridX,
      gridY: this.character.gridPosition.gridY,
      action: 'evaluate',
      waitTime: 3000
    });

    // 生成20个轨迹点，使用GridSystem统一的边界计算
    let currentCanvasX = this.character.position.x;
    let currentCanvasY = this.character.position.y;

    for (let i = 0; i < 20; i++) {
      // 🔧 使用GridSystem的实际画布尺寸
      const gridInfo = this.gridSystem.getGridInfo();
      const canvasDims = this.gridSystem.getCanvasDimensions();

      let attempts = 0;
      let validPoint = false;
      let clampedX = 0;
      let clampedY = 0;
      let randomGridX = 0;
      let randomGridY = 0;

      // 尝试最多50次生成不在限制区域内的点
      while (!validPoint && attempts < 50) {
        // 确保在网格范围内：0到gridInfo.width-1, 0到gridInfo.height-1
        randomGridX = Math.floor(Math.random() * gridInfo.width);
        randomGridY = Math.floor(Math.random() * gridInfo.height);

        // 转换到画布坐标 - 在网格单元中心位置
        const actualCellWidth = canvasDims.width / gridInfo.width;
        const actualCellHeight = canvasDims.height / gridInfo.height;

        const nextCanvasX = (randomGridX + 0.5) * actualCellWidth;
        const nextCanvasY = (randomGridY + 0.5) * actualCellHeight;

        // 🚨 使用实际画布尺寸的边界检查
        const margin = Math.min(actualCellWidth, actualCellHeight) * 0.3;
        const minValidX = margin;
        const minValidY = margin;
        const maxValidX = canvasDims.width - margin;
        const maxValidY = canvasDims.height - margin;

        clampedX = Math.max(minValidX, Math.min(maxValidX, nextCanvasX));
        clampedY = Math.max(minValidY, Math.min(maxValidY, nextCanvasY));

        // 验证生成的轨迹点不会超出边界
        if (clampedY >= maxValidY) {
          console.error('🚨 TRAJECTORY GENERATION: Lower boundary violation prevented!', {
            randomGridY,
            nextCanvasY,
            clampedY,
            maxValidY,
            canvasHeight: canvasDims.height
          });
        }

        // 检查是否在限制区域内
        if (!this.isPointInRestrictedZone(clampedX, clampedY)) {
          validPoint = true;
        } else {
          attempts++;
          console.log(`🔄 Attempt ${attempts}: Point in restricted zone, regenerating...`);
        }
      }

      // 如果50次都没找到有效点，使用当前位置附近的点
      if (!validPoint) {
        console.warn('⚠️ Could not find valid point after 50 attempts, using fallback position');
        clampedX = currentCanvasX;
        clampedY = currentCanvasY;
      }

      const action = Math.random() < 0.3 ? 'evaluate' : 'observe'; // 30%概率评价
      const waitTime = action === 'evaluate' ? 4000 : 2000; // 更长的等待时间

      trajectory.push({
        x: clampedX,
        y: clampedY,
        gridX: randomGridX,
        gridY: randomGridY,
        action,
        waitTime
      });

      currentCanvasX = clampedX;
      currentCanvasY = clampedY;
    }

    this.character.trajectory = this.addCurvedTransitions(trajectory);
    this.nextEvaluationTime = Date.now() + this.evaluationInterval;
    console.log('🕐 TrajectorySystem: nextEvaluationTime set to:', this.nextEvaluationTime);
    console.log('🕐 TrajectorySystem: evaluation interval:', this.evaluationInterval);
  }

  // 在轨迹点之间添加平滑的三次贝塞尔曲线过渡，并添加速度变化
  private addCurvedTransitions(originalTrajectory: TrajectoryPoint[]): TrajectoryPoint[] {
    if (originalTrajectory.length < 2) return originalTrajectory;

    const smoothedTrajectory: TrajectoryPoint[] = [];

    // 对每两个点之间添加平滑曲线
    for (let i = 0; i < originalTrajectory.length - 1; i++) {
      const current = originalTrajectory[i];
      const next = originalTrajectory[i + 1];

      // 添加当前点
      smoothedTrajectory.push(current);

      // 计算两点间的距离和方向
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 创建平滑的曲线过渡
      const numCurvePoints = Math.max(15, Math.floor(distance / 20)); // 根据距离动态调整点数

      // 为这段路径随机选择一个速度变化模式
      const speedPattern = Math.random();

      // 计算控制点 - 使用三次贝塞尔曲线实现更优雅的弧线
      const prev = i > 0 ? originalTrajectory[i - 1] : current;
      const nextNext = i < originalTrajectory.length - 2 ? originalTrajectory[i + 2] : next;

      // 第一个控制点：从当前点出发，沿着前一段的方向
      const cp1Distance = distance * 0.3;
      const inAngle = Math.atan2(current.y - prev.y, current.x - prev.x);
      const outAngle = Math.atan2(next.y - current.y, next.x - current.x);
      const cp1Angle = (inAngle + outAngle) / 2;
      const cp1X = current.x + Math.cos(cp1Angle) * cp1Distance;
      const cp1Y = current.y + Math.sin(cp1Angle) * cp1Distance;

      // 第二个控制点：到达下一点前，沿着下一段的方向
      const cp2Distance = distance * 0.3;
      const nextInAngle = Math.atan2(next.y - current.y, next.x - current.x);
      const nextOutAngle = Math.atan2(nextNext.y - next.y, nextNext.x - next.x);
      const cp2Angle = (nextInAngle + nextOutAngle) / 2;
      const cp2X = next.x - Math.cos(cp2Angle) * cp2Distance;
      const cp2Y = next.y - Math.sin(cp2Angle) * cp2Distance;

      // 生成三次贝塞尔曲线上的点
      for (let j = 1; j <= numCurvePoints; j++) {
        const t = j / (numCurvePoints + 1);

        // 三次贝塞尔曲线公式
        const mt = 1 - t;
        const curveX = mt * mt * mt * current.x +
                      3 * mt * mt * t * cp1X +
                      3 * mt * t * t * cp2X +
                      t * t * t * next.x;
        const curveY = mt * mt * mt * current.y +
                      3 * mt * mt * t * cp1Y +
                      3 * mt * t * t * cp2Y +
                      t * t * t * next.y;

        // 🔧 使用GridSystem的统一边界计算 - 与移动逻辑完全一致
        const gridInfo = this.gridSystem.getGridInfo();
        const canvasDims = this.gridSystem.getCanvasDimensions();
        const actualCellWidth = canvasDims.width / gridInfo.width;
        const actualCellHeight = canvasDims.height / gridInfo.height;

        // 🚨 使用与移动逻辑完全相同的严格边界控制
        const margin = Math.min(actualCellWidth, actualCellHeight) * 0.3;
        const minValidX = margin;
        const minValidY = margin;
        const maxValidX = canvasDims.width - margin;
        const maxValidY = canvasDims.height - margin; // 关键：使用GridSystem的canvas高度

        const clampedX = Math.max(minValidX, Math.min(maxValidX, curveX));
        const clampedY = Math.max(minValidY, Math.min(maxValidY, curveY));

        // 计算网格坐标，确保在有效范围内
        const gridX = Math.max(0, Math.min(Math.floor(clampedX / actualCellWidth), gridInfo.width - 1));
        const gridY = Math.max(0, Math.min(Math.floor(clampedY / actualCellHeight), gridInfo.height - 1));

        // 计算这个点的速度 - 优雅的速度变化
        let speed = 40; // 基础速度
        if (speedPattern < 0.3) {
          // 30%概率：加速-减速模式（ease-in-out）
          speed = 25 + 40 * Math.sin(t * Math.PI); // 25-65像素/秒
        } else if (speedPattern < 0.6) {
          // 30%概率：渐快模式（ease-in）
          speed = 20 + 45 * t; // 20-65像素/秒
        } else if (speedPattern < 0.8) {
          // 20%概率：渐慢模式（ease-out）
          speed = 65 - 45 * t; // 65-20像素/秒
        } else {
          // 20%概率：波浪起伏
          speed = 40 + 25 * Math.sin(t * Math.PI * 2); // 15-65像素/秒
        }

        smoothedTrajectory.push({
          x: clampedX,
          y: clampedY,
          gridX: gridX,
          gridY: gridY,
          action: 'move',
          waitTime: 0,
          speed // 添加速度属性
        });
      }
    }

    // 添加最后一个点
    smoothedTrajectory.push(originalTrajectory[originalTrajectory.length - 1]);

    return smoothedTrajectory;
  }

  public startWandering(): void {
    this.lastUpdateTime = Date.now();
    this.update();
  }

  public stopWandering(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private update = (): void => {
    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    this.updateCharacterMovement(deltaTime);
    this.checkForEvaluation(now);

    this.animationFrame = requestAnimationFrame(this.update);
  };

  private updateCharacterMovement(deltaTime: number): void {
    // 如果暂停，不更新移动
    if (this.isPaused) {
      console.log('Movement paused, skipping update');
      return;
    }

    if (!this.character.isMoving && this.character.currentTrajectoryIndex < this.character.trajectory.length - 1) {
      // 开始移动到下一个点
      this.character.currentTrajectoryIndex++;
      const nextPoint = this.character.trajectory[this.character.currentTrajectoryIndex];
      this.character.targetPosition = { x: nextPoint.x, y: nextPoint.y };
      this.character.isMoving = true;
      console.log('ARTIST开始移动到下一个点:', {
        index: this.character.currentTrajectoryIndex,
        target: this.character.targetPosition,
        currentPos: this.character.position
      });
    }

    if (this.character.isMoving) {
      const dx = this.character.targetPosition.x - this.character.position.x;
      const dy = this.character.targetPosition.y - this.character.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 2) {
        // 到达目标点
        this.character.position = { ...this.character.targetPosition };
        const currentPoint = this.character.trajectory[this.character.currentTrajectoryIndex];

        // 重新计算网格位置以确保准确性 - 使用GridSystem的转换逻辑
        const gridPos = this.gridSystem.screenToGrid(this.character.position.x, this.character.position.y);
        this.character.gridPosition = {
          gridX: gridPos.gridX,
          gridY: gridPos.gridY
        };

        // 调试坐标转换的准确性
        const reverseConversion = this.gridSystem.gridToScreen(gridPos.gridX + 0.5, gridPos.gridY + 0.5);
        console.log('🔄 Position Conversion Debug:', {
          original_canvas_pos: this.character.position,
          converted_grid_pos: gridPos,
          reverse_canvas_pos: reverseConversion,
          conversion_error: {
            x: Math.abs(this.character.position.x - reverseConversion.x),
            y: Math.abs(this.character.position.y - reverseConversion.y)
          }
        });

        this.character.isMoving = false;
        console.log('ARTIST到达目标点:', {
          position: this.character.position,
          gridPos: this.character.gridPosition,
          trajectoryIndex: this.character.currentTrajectoryIndex,
          trajectoryLength: this.character.trajectory.length
        });

        // 检查是否到达轨迹终点，如果是则生成新轨迹
        if (this.character.currentTrajectoryIndex >= this.character.trajectory.length - 1) {
          console.log('ARTIST到达轨迹终点，生成新轨迹...', {
            currentIndex: this.character.currentTrajectoryIndex,
            trajectoryLength: this.character.trajectory.length
          });
          this.generateNewTrajectory();
        }
      } else {
        // 继续移动 - 使用轨迹点的速度（如果有的话）
        const currentPoint = this.character.trajectory[this.character.currentTrajectoryIndex];
        const currentSpeed = currentPoint?.speed || this.character.speed; // 使用轨迹点速度或角色默认速度

        const moveDistance = (currentSpeed * deltaTime) / 1000;
        const moveX = (dx / distance) * moveDistance;
        const moveY = (dy / distance) * moveDistance;

        // 计算新的位置
        const newX = this.character.position.x + moveX;
        const newY = this.character.position.y + moveY;

        // 🔧 使用GridSystem的实际画布尺寸和网格信息
        const gridInfo = this.gridSystem.getGridInfo();
        const canvasDims = this.gridSystem.getCanvasDimensions();

        // 重新计算实际的单元格尺寸（基于实际画布尺寸）
        const actualCellWidth = canvasDims.width / gridInfo.width;
        const actualCellHeight = canvasDims.height / gridInfo.height;

        // 🚨 使用实际画布尺寸的边界计算
        const margin = Math.min(actualCellWidth, actualCellHeight) * 0.3;
        const minValidX = margin;
        const minValidY = margin;
        const maxValidX = canvasDims.width - margin;
        const maxValidY = canvasDims.height - margin;

        // 🎯 强制边界限制 - 绝对不允许超出
        let finalX = newX;
        let finalY = newY;

        // X轴边界检查
        if (finalX < minValidX) finalX = minValidX;
        if (finalX > maxValidX) finalX = maxValidX;

        // Y轴边界检查 - 特别严格的下边界控制
        if (finalY < minValidY) finalY = minValidY;
        if (finalY > maxValidY) {
          finalY = maxValidY;
          console.error('🔴 PREVENTED LOWER BOUNDARY VIOLATION:', {
            intended: newY,
            clamped: finalY,
            maxValid: maxValidY,
            canvasHeight: canvasDims.height,
            violation: newY - maxValidY
          });
        }

        // 验证最终位置绝对在边界内
        const boundaryViolation = finalX !== newX || finalY !== newY;
        if (boundaryViolation) {
          console.warn('🚨 MOVEMENT CLAMPED TO PREVENT BOUNDARY VIOLATION:', {
            intended: { x: newX, y: newY },
            final: { x: finalX, y: finalY },
            boundaries: { minX: minValidX, maxX: maxValidX, minY: minValidY, maxY: maxValidY },
            fixedDimensions: { width: canvasDims.width, height: canvasDims.height },
            gridInfo,
            margin
          });
        }

        // 设置最终位置
        this.character.position.x = finalX;
        this.character.position.y = finalY;

        // 更新网格位置 - 使用GridSystem的统一转换逻辑
        const gridPos = this.gridSystem.screenToGrid(this.character.position.x, this.character.position.y);
        this.character.gridPosition = {
          gridX: gridPos.gridX,
          gridY: gridPos.gridY
        };

        // 额外验证：确保最终位置确实在边界内
        if (this.character.position.y > maxValidY || this.character.position.y < minValidY ||
            this.character.position.x > maxValidX || this.character.position.x < minValidX) {
          console.error('🚨 CRITICAL ERROR: Final position still outside boundaries!', {
            position: this.character.position,
            boundaries: { minX: minValidX, maxX: maxValidX, minY: minValidY, maxY: maxValidY }
          });

          // 强制修正位置
          this.character.position.x = Math.max(minValidX, Math.min(maxValidX, this.character.position.x));
          this.character.position.y = Math.max(minValidY, Math.min(maxValidY, this.character.position.y));
        }

        // 调试信息
        if (Math.random() < 0.01) { // 偶尔打印调试信息
          console.log('Position update:', {
            canvasPos: { x: this.character.position.x, y: this.character.position.y },
            fixedDimensions: { width: canvasDims.width, height: canvasDims.height },
            gridPos: this.character.gridPosition,
            currentSpeed
          });
        }
      }
    }
  }

  private checkForEvaluation(now: number): void {
    // 如果暂停状态，跳过评价检查
    if (this.isPaused) {
      return;
    }
    
    // 每10秒记录一次时间检查状态，减少日志频率
    if (now % 10000 < 100) {
      console.log('⏰ Time check - now:', now, 'nextEval:', this.nextEvaluationTime, 'timeLeft:', this.nextEvaluationTime - now);
    }
    
    if (now >= this.nextEvaluationTime) {
      console.log('=== 5秒评估时间到，触发自动评估 ===');
      console.log('Current time:', now);
      console.log('Next evaluation time was:', this.nextEvaluationTime);
      console.log('Character moving:', this.character.isMoving);
      
      this.triggerLocationEvaluation();
      this.nextEvaluationTime = now + this.evaluationInterval;
      
      console.log('Next evaluation scheduled for:', this.nextEvaluationTime);
    }
  }

  private async triggerLocationEvaluation(): Promise<void> {
    const currentPosition: Position = {
      x: this.character.position.x,
      y: this.character.position.y,
      gridX: this.character.gridPosition.gridX,
      gridY: this.character.gridPosition.gridY
    };

    const keywords = this.gridSystem.getKeywordsAtPosition(currentPosition);
    const contextualKeywords = this.gridSystem.getContextualKeywords(currentPosition, 2);
    
    // 更新最近的关键词和计数
    this.lastKeywords = keywords;
    this.evaluationCount++;

    console.log('Character evaluation triggered:', {
      position: currentPosition,
      keywords,
      contextualKeywords,
      character: this.character.name,
      evaluationCount: this.evaluationCount
    });

    // 先设置基本信息
    this.character.lastEvaluation = {
      location: `Grid(${currentPosition.gridX},${currentPosition.gridY})`,
      keywords,
      evaluation: 'AI正在分析中...',
      timestamp: Date.now()
    };

    // 立即触发评估开始回调
    if (this.onEvaluationStartCallback) {
      console.log('触发评估开始回调，关键词:', keywords);
      this.onEvaluationStartCallback(keywords);
    }

    try {
      // 调用AI评价服务
      const aiEvaluation = await this.aiService.evaluateLocation({
        keywords,
        contextualKeywords,
        position: { gridX: currentPosition.gridX, gridY: currentPosition.gridY },
        personality: this.character.personality
      });

      // AI服务返回的是 { sight, thought, confidence }
      const fullEvaluation = `[Observation] ${aiEvaluation.sight}\n\n[Thought] ${aiEvaluation.thought}`;

      // 更新角色的评价信息
      this.character.lastEvaluation = {
        location: `Grid(${currentPosition.gridX},${currentPosition.gridY})`,
        keywords,
        evaluation: fullEvaluation,
        timestamp: Date.now()
      };

      // 触发回调
      console.log('=== 准备触发AI评估回调 ===');
      console.log('回调函数存在:', !!this.onEvaluationCallback);
      console.log('AI评估结果:', aiEvaluation);

      if (this.onEvaluationCallback) {
        console.log('正在调用onEvaluationCallback...');
        this.onEvaluationCallback(aiEvaluation);
        console.log('onEvaluationCallback调用完成');
      } else {
        console.log('警告：onEvaluationCallback未设置！');
      }

      console.log('AI评价完成:', aiEvaluation);
    } catch (error) {
      console.error('AI评价失败:', error);
      
      // 失败时使用备用评价
      const fallbackEvaluation = this.generateFallbackEvaluation(keywords, contextualKeywords);
      
      this.character.lastEvaluation = {
        location: `Grid(${currentPosition.gridX},${currentPosition.gridY})`,
        keywords,
        evaluation: fallbackEvaluation,
        timestamp: Date.now()
      };
    }
  }

  private generateFallbackEvaluation(keywords: string[], contextualKeywords: string[]): string {
    const primaryKeyword = keywords[0] || 'Unknown Space';
    const contextDescription = contextualKeywords.slice(0, 3).join(', ') || 'Surrounding Environment';

    return `As ARTIST, I observe the "${primaryKeyword}" quality here. In the environment of ${contextDescription}, this location embodies the multiple contradictions of the 798 Art District: the game between commerce and art, the dialogue between tradition and avant-garde, the fusion of local and international. This complexity is the true portrayal of the contemporary art ecology.`;
  }

  private generateNewTrajectory(): void {
    // 从当前位置开始生成新的轨迹
    const newTrajectory: TrajectoryPoint[] = [];
    
    console.log('TrajectorySystem: 开始生成新轨迹，当前位置:', {
      current: this.character.position,
      grid: this.character.gridPosition
    });
    
    // 添加当前位置作为起点
    newTrajectory.push({
      x: this.character.position.x,
      y: this.character.position.y,
      gridX: this.character.gridPosition.gridX,
      gridY: this.character.gridPosition.gridY,
      action: 'evaluate',
      waitTime: 3000
    });

    // 生成新的路径
    for (let i = 0; i < 15; i++) {
      // 🔧 使用GridSystem的统一边界计算
      const gridInfo = this.gridSystem.getGridInfo();
      const canvasDims = this.gridSystem.getCanvasDimensions();

      let attempts = 0;
      let validPoint = false;
      let clampedX = 0;
      let clampedY = 0;
      let randomGridX = 0;
      let randomGridY = 0;

      // 尝试最多50次生成不在限制区域内的点
      while (!validPoint && attempts < 50) {
        // 确保在网格范围内：0到gridInfo.width-1, 0到gridInfo.height-1
        randomGridX = Math.floor(Math.random() * gridInfo.width);
        randomGridY = Math.floor(Math.random() * gridInfo.height);

        // 转换到画布坐标 - 在网格单元中心位置
        const actualCellWidth = canvasDims.width / gridInfo.width;
        const actualCellHeight = canvasDims.height / gridInfo.height;

        const nextCanvasX = (randomGridX + 0.5) * actualCellWidth;
        const nextCanvasY = (randomGridY + 0.5) * actualCellHeight;

        // 🚨 使用与移动逻辑完全相同的边界检查
        const margin = Math.min(actualCellWidth, actualCellHeight) * 0.3;
        const minValidX = margin;
        const minValidY = margin;
        const maxValidX = canvasDims.width - margin;
        const maxValidY = canvasDims.height - margin; // 关键：使用GridSystem的canvas高度

        clampedX = Math.max(minValidX, Math.min(maxValidX, nextCanvasX));
        clampedY = Math.max(minValidY, Math.min(maxValidY, nextCanvasY));

        // 检查是否在限制区域内
        if (!this.isPointInRestrictedZone(clampedX, clampedY)) {
          validPoint = true;
        } else {
          attempts++;
        }
      }

      // 如果50次都没找到有效点，跳过这个点
      if (!validPoint) {
        console.warn('⚠️ Could not find valid point for new trajectory after 50 attempts, skipping...');
        continue;
      }

      newTrajectory.push({
        x: clampedX,
        y: clampedY,
        gridX: randomGridX,
        gridY: randomGridY,
        action: Math.random() < 0.3 ? 'evaluate' : 'observe',
        waitTime: Math.random() < 0.3 ? 4000 : 2000
      });
    }

    this.character.trajectory = this.addCurvedTransitions(newTrajectory);
    this.character.currentTrajectoryIndex = 0;
    
    // 确保角色可以开始新的移动
    this.character.isMoving = false;
    
    console.log('TrajectorySystem: 新轨迹生成完成(含弧线):', {
      originalLength: newTrajectory.length,
      smoothedLength: this.character.trajectory.length,
      firstPoint: this.character.trajectory[0],
      lastPoint: this.character.trajectory[this.character.trajectory.length - 1]
    });
  }

  // 公共接口
  public getCharacter(): Character {
    if (!this.character) {
      console.error('TrajectorySystem: Character is null! This should never happen.');
      // 创建一个紧急的默认角色以防止崩溃
      return this.createCharacter(this.character?.personality || {
        name: "ARTIST",
        background: "Emergency fallback artist",
        artisticStyle: "Emergency mode",
        criticalPerspective: "System recovery",
        evaluationPrompts: {
          locationAnalysis: "Emergency analysis",
          keywordInterpretation: "Emergency interpretation", 
          culturalCritique: "Emergency critique"
        }
      });
    }
    return { ...this.character };
  }

  public getCurrentKeywords(): string[] {
    const position: Position = {
      x: this.character.position.x,
      y: this.character.position.y,
      gridX: this.character.gridPosition.gridX,
      gridY: this.character.gridPosition.gridY
    };
    return this.gridSystem.getKeywordsAtPosition(position);
  }

  public setEvaluationInterval(intervalMs: number): void {
    this.evaluationInterval = intervalMs;
  }

  public forceEvaluation(): void {
    this.triggerLocationEvaluation();
  }

  // 设置AI评价回调
  public setEvaluationCallback(callback: (evaluation: { sight: string; thought: string; confidence: number }) => void): void {
    this.onEvaluationCallback = callback;
  }

  public setEvaluationStartCallback(callback: (keywords: string[]) => void): void {
    this.onEvaluationStartCallback = callback;
  }

  // 更新AI服务配置
  public updateAIConfig(apiKey?: string, baseUrl?: string): void {
    this.aiService.updateConfig(apiKey, baseUrl);
  }

  // 获取AI服务状态
  public getAIServiceStatus(): { pending: number; processing: boolean } {
    return this.aiService.getQueueStatus();
  }

  // 获取下次评价时间（毫秒）
  public getNextEvaluationTime(): number {
    return this.nextEvaluationTime;
  }

  // 获取评价剩余时间（秒）
  public getEvaluationTimeRemaining(): number {
    if (this.isPaused) return -1; // 暂停时返回-1
    const remaining = Math.max(0, this.nextEvaluationTime - Date.now());
    return Math.ceil(remaining / 1000);
  }

  // 获取当前角色位置
  public getCurrentPosition(): { x: number; y: number } {
    return {
      x: this.character.position.x,
      y: this.character.position.y
    };
  }

  // 设置画布尺寸
  public setCanvasDimensions(width: number, height: number): void {
    const oldWidth = this.canvasWidth;
    const oldHeight = this.canvasHeight;

    // 🔧 重要：先更新GridSystem的canvas尺寸，确保同步
    this.gridSystem.updateCanvasDimensions(width, height);
    this.canvasWidth = width;
    this.canvasHeight = height;

    // 检查是否需要重新定位角色（避免频繁重定位）
    const isInitialSetup = oldWidth === 600 && oldHeight === 400; // 检测是否为初始默认尺寸
    const sizeChanged = oldWidth !== width || oldHeight !== height;

    if (isInitialSetup || sizeChanged) {
      console.log(`Canvas dimensions changed from ${oldWidth}x${oldHeight} to ${width}x${height}, repositioning character...`);

      // 🔧 使用GridSystem的统一方法获取尺寸信息
      const gridInfo = this.gridSystem.getGridInfo();
      const canvasDims = this.gridSystem.getCanvasDimensions();

      const oldCellWidth = oldWidth / gridInfo.width;
      const oldCellHeight = oldHeight / gridInfo.height;
      const newCellWidth = canvasDims.width / gridInfo.width;
      const newCellHeight = canvasDims.height / gridInfo.height;

      // 保持相对网格位置不变，只调整画布坐标
      const currentGridX = this.character.gridPosition.gridX;
      const currentGridY = this.character.gridPosition.gridY;

      const newCanvasX = (currentGridX + 0.5) * newCellWidth;
      const newCanvasY = (currentGridY + 0.5) * newCellHeight;

      // 🚨 使用与移动逻辑完全相同的边界检查
      const margin = Math.min(newCellWidth, newCellHeight) * 0.3;
      const minValidX = margin;
      const minValidY = margin;
      const maxValidX = canvasDims.width - margin;
      const maxValidY = canvasDims.height - margin; // 关键：使用GridSystem的canvas高度

      const clampedX = Math.max(minValidX, Math.min(maxValidX, newCanvasX));
      const clampedY = Math.max(minValidY, Math.min(maxValidY, newCanvasY));

      this.character.position.x = clampedX;
      this.character.position.y = clampedY;
      this.character.targetPosition.x = clampedX;
      this.character.targetPosition.y = clampedY;

      console.log('Character position scaled to new canvas size:', {
        oldPosition: { x: this.character.position.x, y: this.character.position.y },
        newPosition: { x: clampedX, y: clampedY },
        gridPosition: { x: currentGridX, y: currentGridY },
        oldCellSize: { width: oldCellWidth, height: oldCellHeight },
        newCellSize: { width: newCellWidth, height: newCellHeight }
      });

      // 重新生成轨迹以确保在新的画布尺寸内
      this.generateInitialTrajectory();
    } else {
      console.log(`Canvas dimensions unchanged (${width}x${height}), keeping character position`);
    }
  }

  // 暂停/恢复移动
  public toggleMovement(): void {
    this.isPaused = !this.isPaused;
    console.log('Movement toggled:', this.isPaused ? 'PAUSED' : 'RESUMED');
    
    if (!this.isPaused) {
      // 恢复移动时，重新设置评价时间，重新开始5秒倒计时
      this.nextEvaluationTime = Date.now() + this.evaluationInterval;
      console.log('🔄 Movement resumed, evaluation timer reset. Next evaluation at:', this.nextEvaluationTime);
    } else {
      console.log('⏸️ Movement paused, evaluation timer paused');
    }
  }

  // 设置移动速度
  public setSpeed(speed: number): void {
    this.character.speed = Math.max(1, Math.min(20, speed)); // 限制速度范围1-20
    console.log('Speed changed to:', this.character.speed);
  }

  // 重新生成轨迹（公共方法）
  public regenerateTrajectory(): void {
    console.log('Manually regenerating trajectory...');
    this.generateNewTrajectory();
  }

  // 获取评价计数
  public getEvaluationCount(): number {
    return this.evaluationCount;
  }

  // 获取最近关键词
  public getLastKeywords(): string[] {
    return [...this.lastKeywords];
  }

  // 获取评价间隔（秒）
  public getEvaluationIntervalSeconds(): number {
    return this.evaluationInterval / 1000;
  }

  // 获取暂停状态
  public isPausedState(): boolean {
    return this.isPaused;
  }

  // Hash string to generate consistent seed for each artist
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // 新增：检查点是否在限制区域内
  private isPointInRestrictedZone(x: number, y: number): boolean {
    for (const zone of this.restrictedZones) {
      const distance = Math.sqrt(
        Math.pow(x - zone.centerX, 2) + Math.pow(y - zone.centerY, 2)
      );

      // 如果点在圆形区域内（距离小于半径），返回true
      if (distance < zone.radius) {
        console.log('🚫 Point restricted:', { x, y, zone: zone.type, distance, radius: zone.radius });
        return true;
      }
    }
    return false;
  }

  // 新增：更新限制区域列表
  public updateRestrictedZones(zones: RestrictedZone[]): void {
    this.restrictedZones = zones;
    console.log('🔄 Updated restricted zones:', zones.length, zones);
  }

  // 新增：获取当前限制区域列表
  public getRestrictedZones(): RestrictedZone[] {
    return [...this.restrictedZones];
  }
}