import { Character, TrajectoryPoint, ArtistPersonality } from '@/types/character';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { Position } from '@/types/map-grid';
import { AIEvaluationService } from '@/lib/ai/AIEvaluationService';

export class TrajectorySystem {
  private gridSystem: GridSystem;
  private character: Character;
  private animationFrame: number | null = null;
  private lastUpdateTime: number = 0;
  private evaluationInterval: number = 20000; // 20秒评价一次
  private nextEvaluationTime: number = 0;
  private aiService: AIEvaluationService;
  private onEvaluationCallback?: (evaluation: { artistic: string; cultural: string; critique: string; confidence: number }) => void;
  private onEvaluationStartCallback?: (keywords: string[]) => void;
  private canvasWidth: number = 600;
  private canvasHeight: number = 400;
  private evaluationCount: number = 0;
  private isPaused: boolean = false;
  private lastKeywords: string[] = [];

  constructor(gridSystem: GridSystem, artistPersonality: ArtistPersonality) {
    this.gridSystem = gridSystem;
    this.character = this.createCharacter(artistPersonality);
    this.aiService = new AIEvaluationService();
    this.generateInitialTrajectory();
  }

  private createCharacter(personality: ArtistPersonality): Character {
    const gridInfo = this.gridSystem.getGridInfo();

    // 随机定位在较大区域（5%边距）
    const marginPercent = 0.05; // 减少到5%边距，扩大初始范围
    const availableWidth = this.canvasWidth * (1 - 2 * marginPercent);
    const availableHeight = this.canvasHeight * (1 - 2 * marginPercent);

    const startCanvasX = this.canvasWidth * marginPercent + Math.random() * availableWidth;
    const startCanvasY = this.canvasHeight * marginPercent + Math.random() * availableHeight;

    // 计算对应的网格位置
    const cellWidth = this.canvasWidth / gridInfo.width;
    const cellHeight = this.canvasHeight / gridInfo.height;
    const startX = Math.max(0, Math.min(Math.floor(startCanvasX / cellWidth), gridInfo.width - 1));
    const startY = Math.max(0, Math.min(Math.floor(startCanvasY / cellHeight), gridInfo.height - 1));

    return {
      id: 'wandering-artist',
      name: personality.name,
      position: { x: startCanvasX, y: startCanvasY },
      targetPosition: { x: startCanvasX, y: startCanvasY },
      gridPosition: { gridX: startX, gridY: startY },
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

    // 生成20个轨迹点，严格限制在边界内
    let currentCanvasX = this.character.position.x;
    let currentCanvasY = this.character.position.y;

    for (let i = 0; i < 20; i++) {
      // 严格的边界控制 - 确保不超出边界
      const margin = 10; // 10px边距
      const nextCanvasX = margin + Math.random() * (this.canvasWidth - 2 * margin);
      const nextCanvasY = margin + Math.random() * (this.canvasHeight - 2 * margin);
      
      // 转换到网格坐标 - 使用实际画布尺寸计算
      const gridInfo = this.gridSystem.getGridInfo();
      const cellWidth = this.canvasWidth / gridInfo.width;
      const cellHeight = this.canvasHeight / gridInfo.height;
      const gridPos = {
        x: nextCanvasX,
        y: nextCanvasY,
        gridX: Math.max(0, Math.min(Math.floor(nextCanvasX / cellWidth), gridInfo.width - 1)),
        gridY: Math.max(0, Math.min(Math.floor(nextCanvasY / cellHeight), gridInfo.height - 1))
      };
      
      const action = Math.random() < 0.3 ? 'evaluate' : 'observe'; // 30%概率评价
      const waitTime = action === 'evaluate' ? 4000 : 2000; // 更长的等待时间

      trajectory.push({
        x: nextCanvasX,
        y: nextCanvasY,
        gridX: gridPos.gridX,
        gridY: gridPos.gridY,
        action,
        waitTime
      });

      currentCanvasX = nextCanvasX;
      currentCanvasY = nextCanvasY;
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

        // 确保点在边界内
        const clampedX = Math.max(10, Math.min(this.canvasWidth - 10, curveX));
        const clampedY = Math.max(10, Math.min(this.canvasHeight - 10, curveY));

        // 计算网格坐标
        const gridInfo = this.gridSystem.getGridInfo();
        const cellWidth = this.canvasWidth / gridInfo.width;
        const cellHeight = this.canvasHeight / gridInfo.height;

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
          gridX: Math.max(0, Math.min(Math.floor(clampedX / cellWidth), gridInfo.width - 1)),
          gridY: Math.max(0, Math.min(Math.floor(clampedY / cellHeight), gridInfo.height - 1)),
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

        // 重新计算网格位置以确保准确性
        const gridInfo = this.gridSystem.getGridInfo();
        const cellWidth = this.canvasWidth / gridInfo.width;
        const cellHeight = this.canvasHeight / gridInfo.height;
        const gridX = Math.floor(this.character.position.x / cellWidth);
        const gridY = Math.floor(this.character.position.y / cellHeight);

        this.character.gridPosition = {
          gridX: Math.max(0, Math.min(gridX, gridInfo.width - 1)),
          gridY: Math.max(0, Math.min(gridY, gridInfo.height - 1))
        };
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

        this.character.position.x += moveX;
        this.character.position.y += moveY;

        // 更新网格位置 - 使用实际的画布尺寸计算
        const gridInfo = this.gridSystem.getGridInfo();
        const cellWidth = this.canvasWidth / gridInfo.width;
        const cellHeight = this.canvasHeight / gridInfo.height;
        const gridX = Math.floor(this.character.position.x / cellWidth);
        const gridY = Math.floor(this.character.position.y / cellHeight);

        this.character.gridPosition = {
          gridX: Math.max(0, Math.min(gridX, gridInfo.width - 1)),
          gridY: Math.max(0, Math.min(gridY, gridInfo.height - 1))
        };

        // 调试信息
        if (Math.random() < 0.01) { // 偶尔打印调试信息
          console.log('Position update:', {
            canvasPos: { x: this.character.position.x, y: this.character.position.y },
            canvasDims: { width: this.canvasWidth, height: this.canvasHeight },
            cellDims: { width: cellWidth, height: cellHeight },
            gridPos: { x: gridX, y: gridY },
            finalGrid: this.character.gridPosition,
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
      console.log('=== 20秒评估时间到，触发自动评估 ===');
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

      // 组合完整的评价文本
      const fullEvaluation = this.formatEvaluationText(aiEvaluation);

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

  private formatEvaluationText(aiEvaluation: { artistic: string; cultural: string; critique: string; confidence: number }): string {
    return `【艺术视角】${aiEvaluation.artistic}\n\n【文化解读】${aiEvaluation.cultural}\n\n【批判思考】${aiEvaluation.critique}`;
  }

  private generateFallbackEvaluation(keywords: string[], contextualKeywords: string[]): string {
    const primaryKeyword = keywords[0] || '未知空间';
    const contextDescription = contextualKeywords.slice(0, 3).join('、') || '周边环境';
    
    return `作为ARTIST，我观察到这里的"${primaryKeyword}"特质。在${contextDescription}的环境中，这个位置体现了798艺术区的多重矛盾：商业与艺术的博弈、传统与前卫的对话、本土与国际的交融。这种复杂性正是当代艺术生态的真实写照。`;
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
      const margin = 10; // 10px边距
      const nextCanvasX = margin + Math.random() * (this.canvasWidth - 2 * margin);
      const nextCanvasY = margin + Math.random() * (this.canvasHeight - 2 * margin);
      
      // 转换到网格坐标 - 使用实际画布尺寸计算
      const gridInfo = this.gridSystem.getGridInfo();
      const cellWidth = this.canvasWidth / gridInfo.width;
      const cellHeight = this.canvasHeight / gridInfo.height;
      const gridPos = {
        x: nextCanvasX,
        y: nextCanvasY,
        gridX: Math.max(0, Math.min(Math.floor(nextCanvasX / cellWidth), gridInfo.width - 1)),
        gridY: Math.max(0, Math.min(Math.floor(nextCanvasY / cellHeight), gridInfo.height - 1))
      };
      
      newTrajectory.push({
        x: nextCanvasX,
        y: nextCanvasY,
        gridX: gridPos.gridX,
        gridY: gridPos.gridY,
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
  public setEvaluationCallback(callback: (evaluation: { artistic: string; cultural: string; critique: string; confidence: number }) => void): void {
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
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    // 随机定位在中心区域（20%边距）
    const marginPercent = 0.2; // 20%边距
    const availableWidth = width * (1 - 2 * marginPercent);
    const availableHeight = height * (1 - 2 * marginPercent);
    
    const canvasX = width * marginPercent + Math.random() * availableWidth;
    const canvasY = height * marginPercent + Math.random() * availableHeight;
    
    // 计算对应的网格位置
    const gridInfo = this.gridSystem.getGridInfo();
    const cellWidth = width / gridInfo.width;
    const cellHeight = height / gridInfo.height;
    const gridX = Math.max(0, Math.min(Math.floor(canvasX / cellWidth), gridInfo.width - 1));
    const gridY = Math.max(0, Math.min(Math.floor(canvasY / cellHeight), gridInfo.height - 1));
    
    this.character.position.x = canvasX;
    this.character.position.y = canvasY;
    this.character.targetPosition.x = canvasX;
    this.character.targetPosition.y = canvasY;
    this.character.gridPosition.gridX = gridX;
    this.character.gridPosition.gridY = gridY;
    
    console.log('========== CANVAS DEBUG ==========');
    console.log('Canvas dimensions set:', { width, height, gridInfo });
    console.log('Character position set to:', { 
      canvasX, canvasY,
      gridX, gridY,
      cellWidth, cellHeight,
      expectedCenter: { x: width * 0.5, y: height * 0.5 }
    });
    console.log('Character object after update:', {
      position: this.character.position,
      gridPosition: this.character.gridPosition
    });
    console.log('==================================');
    
    // 重新生成轨迹以确保在新的画布尺寸内
    this.generateInitialTrajectory();
  }

  // 暂停/恢复移动
  public toggleMovement(): void {
    this.isPaused = !this.isPaused;
    console.log('Movement toggled:', this.isPaused ? 'PAUSED' : 'RESUMED');
    
    if (!this.isPaused) {
      // 恢复移动时，重新设置评价时间，重新开始20秒倒计时
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
}