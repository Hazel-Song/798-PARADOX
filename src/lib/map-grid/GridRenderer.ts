import { GridSystem } from './GridSystem';
import { GridCell } from '@/types/map-grid';

export class GridRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridSystem: GridSystem;
  private animationFrame: number | null = null;
  private glitchIntensity: number = 0.3;
  private flickerPhase: number = 0;

  constructor(canvas: HTMLCanvasElement, gridSystem: GridSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gridSystem = gridSystem;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  public startRendering(): void {
    this.render();
  }

  public stopRendering(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private render = (): void => {
    this.clearCanvas();
    this.renderGrid();
    this.flickerPhase += 0.1;
    this.animationFrame = requestAnimationFrame(this.render);
  };

  private clearCanvas(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderGrid(): void {
    const cells = this.gridSystem.getAllCells();
    const { cellSize } = this.gridSystem.getGridInfo();

    // 先绘制背景网格图案
    this.renderBackgroundGrid(cellSize);

    cells.forEach((row, y) => {
      row.forEach((cell, x) => {
        this.renderCell(cell, x * cellSize, y * cellSize, cellSize);
      });
    });
  }

  private renderBackgroundGrid(cellSize: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // 绘制网格底图
    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);
        const cells = this.gridSystem.getAllCells();
        const cell = cells[gridY]?.[gridX];

        if (!cell) continue;

        // 获取该网格单元的标签数量
        const tagCount = this.gridSystem.getTagCount(gridX, gridY);

        // 根据标签数量和类型决定网格样式
        if (tagCount >= 2) {
          // 被标记两次或以上 - 变成工作室 - 最小方格（密集）
          this.drawSquarePattern(x, y, cellSize / 4, cellSize, 'rgba(255, 200, 100, 0.5)');
        } else if (tagCount === 1) {
          // 被标记一次 - 中等方格
          this.drawSquarePattern(x, y, cellSize / 2, cellSize, 'rgba(255, 255, 255, 0.35)');
        } else if (cell.category.type === 'industrial') {
          // 工业/废弃工厂 - 大方格（最稀疏）
          this.drawSquarePattern(x, y, cellSize, cellSize, 'rgba(255, 255, 255, 0.25)');
        }
      }
    }
  }

  private drawSquarePattern(startX: number, startY: number, squareSize: number, cellSize: number, color: string): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    // 在单元格内绘制小方格图案
    for (let y = startY; y < startY + cellSize; y += squareSize) {
      for (let x = startX; x < startX + cellSize; x += squareSize) {
        this.ctx.strokeRect(x, y, squareSize, squareSize);
      }
    }
  }

  private renderCell(cell: GridCell, x: number, y: number, size: number): void {
    const { keywords, category, weight } = cell;
    
    if (keywords.length === 0) return;

    // 根据类别设置颜色
    const baseColor = this.getCategoryColor(category.type);
    
    // 渲染每个关键词
    keywords.forEach((keyword, index) => {
      const wordX = x + (index % 2) * (size / 2) + Math.random() * 10 - 5;
      const wordY = y + Math.floor(index / 2) * 15 + 20;
      
      this.renderGlitchText(keyword, wordX, wordY, baseColor, weight);
    });

    // 渲染网格边框（调试用）
    if (Math.random() < 0.1) {
      this.ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, size, size);
    }
  }

  private renderGlitchText(text: string, x: number, y: number, baseColor: string, weight: number): void {
    const shouldGlitch = Math.random() < this.glitchIntensity * weight;
    const shouldFlicker = Math.sin(this.flickerPhase + x * 0.01 + y * 0.01) > 0.7;
    
    if (!shouldFlicker && Math.random() > 0.8) return; // 随机隐藏一些文字

    this.ctx.font = `${8 + Math.random() * 4}px 'Courier New', monospace`;
    
    if (shouldGlitch) {
      this.renderGlitchEffect(text, x, y, baseColor);
    } else {
      this.renderNormalText(text, x, y, baseColor, weight);
    }
  }

  private renderGlitchEffect(text: string, x: number, y: number, baseColor: string): void {
    const glitchOffsets = [
      { x: -2, y: 0, color: 'rgba(255, 0, 0, 0.7)' },
      { x: 2, y: 0, color: 'rgba(0, 255, 0, 0.7)' },
      { x: 0, y: -1, color: 'rgba(0, 0, 255, 0.7)' },
      { x: 0, y: 0, color: baseColor }
    ];

    // 随机选择部分偏移进行渲染
    glitchOffsets.forEach((offset) => {
      if (Math.random() < 0.7) {
        this.ctx.fillStyle = offset.color;
        
        // 随机字符替换（数字故障效果）
        const glitchedText = this.applyDigitalGlitch(text);
        this.ctx.fillText(glitchedText, x + offset.x, y + offset.y);
      }
    });
  }

  private applyDigitalGlitch(text: string): string {
    return text.split('').map(char => {
      if (Math.random() < 0.3) {
        // 替换为随机数字或符号
        const glitchChars = '0123456789!@#$%^&*()[]{}|\\:";\'<>?,./`~';
        return glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      return char;
    }).join('');
  }

  private renderNormalText(text: string, x: number, y: number, baseColor: string, weight: number): void {
    // 根据权重调整透明度
    const alpha = 0.4 + weight * 0.6;
    this.ctx.fillStyle = baseColor.replace('1)', `${alpha})`);
    this.ctx.fillText(text, x, y);
    
    // 添加微弱的发光效果
    if (weight > 0.7) {
      this.ctx.shadowColor = baseColor;
      this.ctx.shadowBlur = 5;
      this.ctx.fillText(text, x, y);
      this.ctx.shadowBlur = 0;
    }
  }

  private getCategoryColor(type: string): string {
    const colors = {
      gallery: 'rgba(255, 255, 255, 1)',      // 白色 - 画廊
      studio: 'rgba(255, 200, 100, 1)',       // 暖黄 - 工作室
      commercial: 'rgba(100, 255, 150, 1)',   // 绿色 - 商业
      residential: 'rgba(100, 150, 255, 1)',  // 蓝色 - 住宅
      industrial: 'rgba(200, 100, 100, 1)',   // 红色 - 工业
      public: 'rgba(255, 100, 255, 1)'        // 紫色 - 公共
    };
    
    return colors[type as keyof typeof colors] || 'rgba(255, 255, 255, 1)';
  }

  // 设置故障强度
  public setGlitchIntensity(intensity: number): void {
    this.glitchIntensity = Math.max(0, Math.min(1, intensity));
  }

  // 更新画布大小
  public resize(): void {
    this.setupCanvas();
  }

  // 高亮显示特定位置
  public highlightPosition(x: number, y: number, radius: number = 50): void {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  // 获取鼠标位置对应的关键词
  public getKeywordsAtMousePosition(mouseX: number, mouseY: number): string[] {
    const position = this.gridSystem.screenToGrid(mouseX, mouseY);
    return this.gridSystem.getKeywordsAtPosition(position);
  }
}