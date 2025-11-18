export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

export interface GeneratedText {
  id: string;
  content: string;
  prompt: string;
  createdAt: string;
}

export interface ArtworkData {
  id: string;
  title: string;
  description: string;
  images: GeneratedImage[];
  texts: GeneratedText[];
  createdAt: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 时间线相关类型定义
export interface TimePeriod {
  id: string;
  name: string;
  years: string;
  description: string;
}

export interface RoleDescription {
  name: string;
  description: string;
  actions: string[];
}

export interface PeriodRoles {
  artist?: RoleDescription;
  government?: RoleDescription;
  visitor?: RoleDescription;
}

export interface TimelineData {
  periods: TimePeriod[];
  rolesByPeriod: Record<string, PeriodRoles>;
}