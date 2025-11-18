import { Character } from '@/types/character';

export class CharacterRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private character: Character | null = null;
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public setCharacter(character: Character): void {
    this.character = character;
    this.startRendering();
  }

  public startRendering(): void {
    if (!this.animationFrame) {
      this.render();
    }
  }

  public stopRendering(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private render = (): void => {
    if (this.character) {
      this.drawCharacter();
    }
    this.animationFrame = requestAnimationFrame(this.render);
  };

  private drawCharacter(): void {
    if (!this.character) return;

    const { x, y } = this.character.position;

    this.ctx.save();

    // 绘制角色主体
    this.drawCharacterBody(x, y);

    // 绘制状态指示器
    this.drawStatusIndicator(x, y);

    // 绘制角色信息
    this.drawCharacterInfo(x, y);

    this.ctx.restore();
  }

  private drawCharacterBody(x: number, y: number): void {
    const time = Date.now() * 0.003;
    
    // ARTIST艺术家光点 - 主要可视化元素
    this.ctx.save();
    this.ctx.translate(x, y);
    
    // 外层光晕效果（固定大小）
    const glowSize = 20; // 固定光晕大小
    const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    glowGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    glowGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    this.ctx.fill();

    // 主光点（固定大小，移除脉动效果）
    const dotSize = 6; // 固定大小

    // 外环
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, dotSize, 0, Math.PI * 2);
    this.ctx.stroke();

    // 内核光点
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, dotSize * 0.7, 0, Math.PI * 2);
    this.ctx.fill();

    // 中心亮点
    this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // 移动状态指示 - 添加方向箭头
    if (this.character!.isMoving) {
      const dx = this.character!.targetPosition.x - x;
      const dy = this.character!.targetPosition.y - y;
      const angle = Math.atan2(dy, dx);
      
      this.ctx.rotate(angle);
      
      // 方向箭头
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(dotSize + 5, 0);
      this.ctx.lineTo(dotSize + 12, -3);
      this.ctx.moveTo(dotSize + 5, 0);
      this.ctx.lineTo(dotSize + 12, 3);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawStatusIndicator(x: number, y: number): void {
    // 评价状态指示器 - 在光点周围显示
    if (this.character!.lastEvaluation) {
      const timeSinceEval = Date.now() - this.character!.lastEvaluation.timestamp;
      if (timeSinceEval < 5000) { // 5秒内显示评价指示
        const alpha = 1 - timeSinceEval / 5000;
        const time = Date.now() * 0.005;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // 在光点周围绘制评价指示环
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 4]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, 25 + Math.sin(time) * 3, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
        this.ctx.restore();
      }
    }
  }

  private drawCharacterInfo(x: number, y: number): void {
    // 简化的ARTIST标识 - 只在光点附近显示名称
    this.ctx.save();
    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // ARTIST文字标识，位置在光点上方
    const labelY = y - 35;
    
    // 文字阴影效果
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillText('ARTIST', x + 1, labelY + 1);
    
    // 主文字
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillText('ARTIST', x, labelY);
    
    // 状态指示 - 只在移动时显示
    if (this.character!.isMoving) {
      this.ctx.font = '8px "Courier New", monospace';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.fillText('WANDERING', x, labelY + 15);
    }
    
    this.ctx.restore();
  }

  // 绘制角色的评价气泡
  public drawEvaluationBubble(evaluation: string, duration: number = 5000): void {
    if (!this.character) return;

    const startTime = Date.now();
    const { x, y } = this.character.position;

    const drawBubble = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) return;

      const alpha = Math.min(1, 1 - elapsed / duration);
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      
      // 气泡背景
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 1;
      
      const bubbleWidth = 150;
      const bubbleHeight = 60;
      const bubbleX = x - bubbleWidth / 2;
      const bubbleY = y - bubbleHeight - 20;
      
      this.ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
      this.ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
      
      // 文本
      this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      this.ctx.font = '9px "Courier New", monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      
      const words = evaluation.split('');
      let line = '';
      let yOffset = 0;
      const lineHeight = 12;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = this.ctx.measureText(testLine);
        
        if (metrics.width > bubbleWidth - 10 && line !== '') {
          this.ctx.fillText(line, bubbleX + 5, bubbleY + 5 + yOffset);
          line = words[i];
          yOffset += lineHeight;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, bubbleX + 5, bubbleY + 5 + yOffset);
      
      this.ctx.restore();
      
      requestAnimationFrame(drawBubble);
    };

    drawBubble();
  }

  public resize(): void {
    // 处理画布大小变化
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }
}