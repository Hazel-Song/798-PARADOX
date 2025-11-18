import { CommentTag } from '@/components/ui/CommentTags';

// 状态快照数据结构
export interface PeriodSnapshot {
  periodId: string; // 当前时期ID
  timestamp: number; // 快照创建时间
  commentTags: CommentTag[]; // 评论标签
  studioAreas: string[]; // 工作室区域（网格key数组）
  studioCircles: StudioCircleData[]; // 工作室圆形数据
  artistPositions: ArtistPosition[]; // 艺术家位置
  areaVitality: number; // 区域活力值
  gridTagCounts: Record<string, number>; // 网格标签计数
}

// 工作室圆形数据
export interface StudioCircleData {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  gridKey: string;
  createdAt: number;
}

// 艺术家位置数据
export interface ArtistPosition {
  id: string;
  x: number;
  y: number;
}

// 快照管理器
export interface SnapshotManager {
  snapshots: Map<string, PeriodSnapshot>; // periodId -> snapshot
  saveSnapshot: (periodId: string, snapshot: PeriodSnapshot) => void;
  getSnapshot: (periodId: string) => PeriodSnapshot | undefined;
  clearSnapshot: (periodId: string) => void;
  hasSnapshot: (periodId: string) => boolean;
}
