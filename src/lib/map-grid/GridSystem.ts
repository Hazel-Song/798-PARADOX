import { MapGrid, GridCell, LocationCategory, Position, KeywordData } from '@/types/map-grid';

export class GridSystem {
  private grid: MapGrid;
  private keywordDatabase: Map<string, KeywordData>;
  private tagCounts: Map<string, number> = new Map(); // 跟踪每个网格的标签数量

  constructor(width: number, height: number, cellSize: number = 50) {
    this.grid = this.initializeGrid(width, height, cellSize);
    this.keywordDatabase = new Map();
    this.populateWithInitialKeywords();
  }

  private initializeGrid(width: number, height: number, cellSize: number): MapGrid {
    const gridWidth = Math.floor(width / cellSize);
    const gridHeight = Math.floor(height / cellSize);
    
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
      // 1995-2000年代关键词（只保留这三类）
      urban: [
        '红砖楼', '筒子楼', '简陋平房', '城乡结合部', '灰色水泥墙', 
        '胡同与工厂混杂', '工厂宿舍区', '煤炉', '蜡纸窗', '工友聚集', 
        '大院闲聊', '墙报', '涂鸦'
      ],
      industrial: [
        '红砖厂房', '苏式厂房结构', '大跨度拱形屋顶', '钢架梁与裸露管道', 
        '巨大天窗', '采光顶', '高耸烟囱', '空旷回声空间', '毛式红色标语牌', 
        '流水线遗迹', '旧机器与静止的时间', '旧铁柜', '档案柜', '尘土', '金属味空气'
      ],
      studio: [
        '工厂改造工作室', '工业风混合艺术痕迹', '简易雕塑架', '焊接铁架', 
        '简易隔断', '木板分区', '大窗户采光', '高天花板', '简陋电线与临时照明', 
        '独立艺术家聚集', '自发性的艺术社区', '海归艺术家的实验场', 
        '大院式共享氛围', '集体讨论与即兴展览', '工作生活一体', '简单床铺与炉具'
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
    const gridX = Math.floor(screenX / this.grid.cellSize);
    const gridY = Math.floor(screenY / this.grid.cellSize);
    
    return {
      x: screenX,
      y: screenY,
      gridX: Math.max(0, Math.min(gridX, this.grid.width - 1)),
      gridY: Math.max(0, Math.min(gridY, this.grid.height - 1))
    };
  }

  // 获取网格单元格的中心点坐标
  public getCellCenter(gridX: number, gridY: number): { x: number, y: number } {
    return {
      x: (gridX + 0.5) * this.grid.cellSize,
      y: (gridY + 0.5) * this.grid.cellSize
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
}