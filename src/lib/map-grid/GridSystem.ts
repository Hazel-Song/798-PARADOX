import { MapGrid, GridCell, LocationCategory, Position, KeywordData } from '@/types/map-grid';

export class GridSystem {
  private grid: MapGrid;
  private keywordDatabase: Map<string, KeywordData>;
  private tagCounts: Map<string, number> = new Map(); // 跟踪每个网格的标签数量
  private canvasWidth: number; // 存储实际canvas宽度
  private canvasHeight: number; // 存储实际canvas高度

  constructor(width: number, height: number, cellSize: number = 50, forceGridWidth?: number, forceGridHeight?: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.grid = this.initializeGrid(width, height, cellSize, forceGridWidth, forceGridHeight);
    this.keywordDatabase = new Map();
    this.populateWithInitialKeywords();
  }

  private initializeGrid(width: number, height: number, cellSize: number, forceGridWidth?: number, forceGridHeight?: number): MapGrid {
    // 使用强制网格尺寸，如果提供的话
    const gridWidth = forceGridWidth || Math.floor(width / cellSize);
    const gridHeight = forceGridHeight || Math.floor(height / cellSize);

    console.log('GridSystem: Initializing grid with dimensions:', {
      gridWidth,
      gridHeight,
      canvasWidth: width,
      canvasHeight: height,
      cellSize,
      forced: !!forceGridWidth
    });
    
    const cells: GridCell[][] = [];
    
    for (let y = 0; y < gridHeight; y++) {
      cells[y] = [];
      for (let x = 0; x < gridWidth; x++) {
        const cellId = `${x}-${y}`;
        const category = this.generateLocationCategory(x, y, gridWidth, gridHeight);
        
        cells[y][x] = {
          id: cellId,
          x,
          y,
          keywords: [],
          weight: Math.random(),
          lastModified: Date.now(),
          category,
          neighbors: this.calculateNeighbors(x, y, gridWidth, gridHeight)
        };
      }
    }

    return {
      cells,
      width: gridWidth,
      height: gridHeight,
      cellSize,
      totalCells: gridWidth * gridHeight
    };
  }

  private generateLocationCategory(x: number, y: number, width: number, height: number): LocationCategory {
    const centerX = width / 2;
    const centerY = height / 2;
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
    const normalizedDistance = distanceFromCenter / maxDistance;

    // 798艺术区的地理特征分布
    if (normalizedDistance < 0.3) {
      return { type: 'gallery', density: 0.8, culturalWeight: 1.0 };
    } else if (normalizedDistance < 0.5) {
      return { type: 'studio', density: 0.6, culturalWeight: 0.8 };
    } else if (normalizedDistance < 0.7) {
      return { type: 'commercial', density: 0.4, culturalWeight: 0.5 };
    } else if (normalizedDistance < 0.8) {
      return { type: 'residential', density: 0.3, culturalWeight: 0.3 };
    } else {
      return { type: 'industrial', density: 0.2, culturalWeight: 0.1 };
    }
  }

  private calculateNeighbors(x: number, y: number, width: number, height: number): string[] {
    const neighbors: string[] = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          neighbors.push(`${nx}-${ny}`);
        }
      }
    }
    
    return neighbors;
  }

  private populateWithInitialKeywords(): void {
    const keywordsByCategory = {
      // 1995-2002年代关键词 - 突出废弃工厂主题
      urban: [
        '简陋工人宿舍', '破败红砖楼', '筒子楼', '城乡结合部', '斑驳水泥墙',
        '空置厂房区域', '荒芜厂区道路', '废弃的门房', '生锈铁门', '破旧自行车棚',
        '野草丛生', '残缺的标语牌', '褪色的工厂编号'
      ],
      industrial: [
        '废弃红砖厂房', '空置苏式厂房', '锈蚀钢架结构', '破损天窗玻璃',
        '倒塌的烟囱', '停转的机器', '废弃流水线', '积尘的工作台',
        '生锈的铁制品', '残破标语横幅', '停产的车间', '空置的锅炉房',
        '遗弃的机器设备', '腐朽的木制货架', '破碎的水泥地面', '漏雨的屋顶',
        '鸽子栖息的横梁', '蛛网密布的角落', '金属锈蚀的气味', '回声空旷的厂房'
      ],
      studio: [
        '艺术家初入废厂', '简陋改造空间', '临时搭建的工作室', '废料改造的桌椅',
        '自制的画架', '利用天窗采光', '煤炉取暖', '简易拉电',
        '与老厂房共存', '探索空间可能', '实验性艺术创作', '地下艺术聚会',
        '自发的展示空间', '艺术家互助网络', '理想主义的尝试', '边缘化的创作环境',
        '拒绝主流的态度', '寻找纯粹表达', '工业废墟美学', '原始创作冲动'
      ]
    };

    this.grid.cells.forEach(row => {
      row.forEach(cell => {
        const categoryKeywords = keywordsByCategory[cell.category.type] || [];
        const numKeywords = Math.floor(Math.random() * 4) + 2; // 2-5个关键词
        
        const selectedKeywords = categoryKeywords
          .sort(() => Math.random() - 0.5)
          .slice(0, numKeywords);
        
        cell.keywords = selectedKeywords;
        
        // 更新关键词数据库
        selectedKeywords.forEach(keyword => {
          if (!this.keywordDatabase.has(keyword)) {
            this.keywordDatabase.set(keyword, {
              text: keyword,
              frequency: 1,
              lastUsed: Date.now(),
              context: [cell.category.type]
            });
          } else {
            const data = this.keywordDatabase.get(keyword)!;
            data.frequency++;
            if (!data.context.includes(cell.category.type)) {
              data.context.push(cell.category.type);
            }
          }
        });
      });
    });
  }

  // 获取指定位置的关键词
  public getKeywordsAtPosition(position: Position): string[] {
    const { gridX, gridY } = position;
    if (this.isValidGridPosition(gridX, gridY)) {
      return this.grid.cells[gridY][gridX].keywords;
    }
    return [];
  }

  // 将屏幕坐标转换为网格坐标
  public screenToGrid(screenX: number, screenY: number): Position {
    // 使用实际的canvas尺寸和网格尺寸来计算单元格大小
    const actualCellWidth = this.canvasWidth / this.grid.width;
    const actualCellHeight = this.canvasHeight / this.grid.height;

    const gridX = Math.floor(screenX / actualCellWidth);
    const gridY = Math.floor(screenY / actualCellHeight);

    // 限制边界，确保在有效网格范围内
    const clampedGridX = Math.max(0, Math.min(gridX, this.grid.width - 1));
    const clampedGridY = Math.max(0, Math.min(gridY, this.grid.height - 1));

    // 只有当有明显错误时才打印日志
    if (gridX !== clampedGridX || gridY !== clampedGridY || screenX < 0 || screenY < 0 ||
        screenX > this.canvasWidth || screenY > this.canvasHeight) {
      console.warn('⚠️ screenToGrid boundary clamping:', {
        input: { screenX, screenY },
        canvasDims: { width: this.canvasWidth, height: this.canvasHeight },
        gridDims: { width: this.grid.width, height: this.grid.height },
        cellSize: { width: actualCellWidth, height: actualCellHeight },
        calculated: { gridX, gridY },
        clamped: { gridX: clampedGridX, gridY: clampedGridY },
        outOfBounds: {
          x: screenX < 0 || screenX > this.canvasWidth,
          y: screenY < 0 || screenY > this.canvasHeight
        }
      });
    }

    return {
      x: screenX,
      y: screenY,
      gridX: clampedGridX,
      gridY: clampedGridY
    };
  }

  // 将网格坐标转换为屏幕坐标
  public gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    // 使用实际的canvas尺寸和网格尺寸来计算单元格大小
    const actualCellWidth = this.canvasWidth / this.grid.width;
    const actualCellHeight = this.canvasHeight / this.grid.height;

    // 网格坐标转为屏幕坐标（注意：gridX, gridY可以是小数，支持网格中心点计算）
    const screenX = gridX * actualCellWidth;
    const screenY = gridY * actualCellHeight;

    console.log('🔄 gridToScreen conversion:', {
      input: { gridX, gridY },
      canvasDims: { width: this.canvasWidth, height: this.canvasHeight },
      gridDims: { width: this.grid.width, height: this.grid.height },
      cellSize: { width: actualCellWidth, height: actualCellHeight },
      output: { screenX, screenY }
    });

    return { x: screenX, y: screenY };
  }

  // 获取网格单元格的中心点坐标
  public getCellCenter(gridX: number, gridY: number): { x: number, y: number } {
    // 使用实际的canvas尺寸和网格尺寸来计算单元格大小
    const actualCellWidth = this.canvasWidth / this.grid.width;
    const actualCellHeight = this.canvasHeight / this.grid.height;

    return {
      x: (gridX + 0.5) * actualCellWidth,
      y: (gridY + 0.5) * actualCellHeight
    };
  }

  // 更新指定位置的关键词
  public updateKeywordsAtPosition(position: Position, newKeywords: string[]): void {
    const { gridX, gridY } = position;
    if (this.isValidGridPosition(gridX, gridY)) {
      const cell = this.grid.cells[gridY][gridX];
      cell.keywords = newKeywords;
      cell.lastModified = Date.now();
      
      // 更新关键词数据库
      newKeywords.forEach(keyword => {
        if (this.keywordDatabase.has(keyword)) {
          const data = this.keywordDatabase.get(keyword)!;
          data.lastUsed = Date.now();
          data.frequency++;
        } else {
          this.keywordDatabase.set(keyword, {
            text: keyword,
            frequency: 1,
            lastUsed: Date.now(),
            context: [cell.category.type]
          });
        }
      });
    }
  }

  // 获取周围区域的关键词（用于生成上下文）
  public getContextualKeywords(position: Position, radius: number = 1): string[] {
    const { gridX, gridY } = position;
    const keywords = new Set<string>();
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = gridX + dx;
        const ny = gridY + dy;
        
        if (this.isValidGridPosition(nx, ny)) {
          this.grid.cells[ny][nx].keywords.forEach(keyword => keywords.add(keyword));
        }
      }
    }
    
    return Array.from(keywords);
  }

  // 获取网格的基本信息
  public getGridInfo(): { width: number, height: number, cellSize: number, totalCells: number } {
    return {
      width: this.grid.width,
      height: this.grid.height,
      cellSize: this.grid.cellSize,
      totalCells: this.grid.totalCells
    };
  }

  // 获取实际canvas尺寸
  public getCanvasDimensions(): { width: number, height: number } {
    return {
      width: this.canvasWidth,
      height: this.canvasHeight
    };
  }

  // 更新canvas尺寸（用于响应式调整）
  public updateCanvasDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    console.log('GridSystem: Canvas dimensions updated to', { width, height });
  }

  // 获取所有网格数据（用于渲染）
  public getAllCells(): GridCell[][] {
    return this.grid.cells;
  }

  // 获取关键词统计信息
  public getKeywordStats(): Map<string, KeywordData> {
    return new Map(this.keywordDatabase);
  }

  private isValidGridPosition(gridX: number, gridY: number): boolean {
    return gridX >= 0 && gridX < this.grid.width && gridY >= 0 && gridY < this.grid.height;
  }

  // 根据类别获取随机关键词（用于动态生成）
  public getRandomKeywordByCategory(category: string): string {
    const categoryKeywords = Array.from(this.keywordDatabase.entries())
      .filter(([_, data]) => data.context.includes(category))
      .map(([keyword, _]) => keyword);
    
    if (categoryKeywords.length === 0) return '未知';
    
    return categoryKeywords[Math.floor(Math.random() * categoryKeywords.length)];
  }

  // 导出网格数据（用于保存状态）
  public exportGridData(): string {
    return JSON.stringify({
      grid: this.grid,
      keywords: Array.from(this.keywordDatabase.entries())
    });
  }

  // 导入网格数据（用于恢复状态）
  public importGridData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.grid = parsed.grid;
      this.keywordDatabase = new Map(parsed.keywords);
    } catch (error) {
      console.error('Failed to import grid data:', error);
    }
  }

  // 添加标签到网格单元
  public addTagToCell(gridX: number, gridY: number): void {
    const key = `${gridX}-${gridY}`;
    const currentCount = this.tagCounts.get(key) || 0;
    this.tagCounts.set(key, currentCount + 1);
  }

  // 获取网格单元的标签数量
  public getTagCount(gridX: number, gridY: number): number {
    const key = `${gridX}-${gridY}`;
    return this.tagCounts.get(key) || 0;
  }

  // 获取所有标签计数
  public getAllTagCounts(): Map<string, number> {
    return new Map(this.tagCounts);
  }

  // 恢复标签计数（用于快照恢复）
  public restoreTagCounts(counts: Map<string, number>): void {
    this.tagCounts = new Map(counts);
    console.log('🔄 GridSystem: Tag counts restored');
  }
}