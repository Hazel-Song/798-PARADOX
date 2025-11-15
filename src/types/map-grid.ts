export interface GridCell {
  id: string;
  x: number;
  y: number;
  keywords: string[];
  weight: number;
  lastModified: number;
  category: LocationCategory;
  neighbors: string[];
}

export interface MapGrid {
  cells: GridCell[][];
  width: number;
  height: number;
  cellSize: number;
  totalCells: number;
}

export interface LocationCategory {
  type: 'studio' | 'gallery' | 'commercial' | 'residential' | 'industrial' | 'public';
  density: number;
  culturalWeight: number;
}

export interface Position {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
}

export interface KeywordData {
  text: string;
  frequency: number;
  lastUsed: number;
  context: string[];
}