'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WanderingCharacter, { WanderingCharacterRef } from './WanderingCharacter';
import WanderingGovernment, { WanderingGovernmentRef } from './WanderingGovernment';
import GridCursor from './GridCursor';
import SimpleArtistDot from './SimpleArtistDot';
import CommentTags, { CommentTag } from './CommentTags';
import StudioCircles, { StudioCirclesRef, StudioCircle } from './StudioCircles';
import GridOverlay from './GridOverlay';
import PolygonOverlay from './PolygonOverlay';
import Timeline from './Timeline';
import PeriodInfoPanel from './PeriodInfoPanel';
import RolePanel from './RolePanel';
import DebugPanel from './DebugPanel';
import ConfirmDialog from './ConfirmDialog';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { Character } from '@/types/character';
import { timelineData } from '@/lib/data/timelineData';
import { PeriodSnapshot } from '@/types/periodSnapshot';

const MapLayout = () => {
  // 添加滑块样式
  const sliderStyle = `
    input[type="range"].slider {
      -webkit-appearance: none;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.2);
      outline: none;
    }
    input[type="range"].slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #FBBF24;
      cursor: pointer;
    }
    input[type="range"].slider::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #FBBF24;
      cursor: pointer;
      border: none;
    }
  `;

  // 添加样式到head
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = sliderStyle;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // 状态定义
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [characterEvaluation, setCharacterEvaluation] = useState<string>('');
  const [aiEvaluation, setAiEvaluation] = useState<{ artistic: string; cultural: string; critique: string; confidence: number } | null>(null);
  const [gridSystemReady, setGridSystemReady] = useState(false);
  const gridSystemRef = useRef<GridSystem | null>(null);
  const wanderingGovernmentRef = useRef<WanderingGovernmentRef>(null);
  const studioCirclesRef = useRef<StudioCirclesRef>(null);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
    artist: true,
    government: false
  });

  // Debug checkedItems state
  useEffect(() => {
    console.log('🎛️ checkedItems state:', checkedItems);
  }, [checkedItems]);

  // 网格显示控制 - 默认开启以便测试
  const [showGrid, setShowGrid] = useState(true);

  // 当前时期状态
  const [currentPeriodId, setCurrentPeriodId] = useState(timelineData.periods[0].id);

  // 最大解锁的时期索引状态
  const [maxUnlockedPeriodIndex, setMaxUnlockedPeriodIndex] = useState(0);

  // 地图容器尺寸状态 - 响应式尺寸系统
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 600, height: 400 });

  // 基础尺寸比例 - 底图的原始比例
  const BASE_WIDTH = 945; // 底图原始宽度
  const BASE_HEIGHT = 708; // 底图原始高度
  const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT; // 约4:3比例

  // 调试数据状态
  const [debugData, setDebugData] = useState({
    aiServiceStatus: { pending: 0, processing: false },
    evaluationInterval: 20,
    evaluationCount: 0,
    lastKeywords: [] as string[],
    timeRemaining: 20
  });

  // 调试面板显示状态
  const [isDebugVisible, setIsDebugVisible] = useState(false);

  // 获取暂停状态
  const [isPaused, setIsPaused] = useState(false);

  // 评论标签状态
  const [commentTags, setCommentTags] = useState<CommentTag[]>([]);

  // 工作室区域状态
  const [studioAreas, setStudioAreas] = useState<Set<string>>(new Set());

  // 状态快照管理
  const [periodSnapshots, setPeriodSnapshots] = useState<Map<string, PeriodSnapshot>>(new Map());
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingPeriodId, setPendingPeriodId] = useState<string>('');

  // 多个艺术家状态 - 只有初始艺术家
  const [artists, setArtists] = useState<Array<{ id: string; ref: React.RefObject<WanderingCharacterRef> }>>([]);

  // 初始化第一个艺术家
  useEffect(() => {
    if (artists.length === 0) {
      const initialArtistRef = React.createRef<WanderingCharacterRef>();
      setArtists([{ id: 'artist-1', ref: initialArtistRef }]);
      console.log('🎨 初始化第一个艺术家');
    }
    console.log('🔍 Current artists state:', artists.length, artists);
  }, [artists.length]);

  // 响应式尺寸计算
  useEffect(() => {
    const calculateMapDimensions = () => {
      if (!mapContainerRef.current) return;

      const container = mapContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      console.log('🎯 Container dimensions debug:', {
        containerWidth,
        containerHeight,
        containerAspect: containerWidth / containerHeight
      });

      // 让底图完全填充容器，保持4:3比例
      // 使用cover模式：确保图片覆盖整个容器，可能会裁剪部分内容
      let newWidth, newHeight;

      const containerAspectRatio = containerWidth / containerHeight;

      console.log('🎯 Aspect ratio comparison:', {
        containerAspect: containerAspectRatio,
        BASE_ASPECT: ASPECT_RATIO,
        isWider: containerAspectRatio > ASPECT_RATIO
      });

      if (containerAspectRatio > ASPECT_RATIO) {
        // 容器比底图宽，以宽度为准（横向填满）
        newWidth = containerWidth;
        newHeight = newWidth / ASPECT_RATIO;
        console.log('📐 Using width-based sizing');
      } else {
        // 容器比底图高，以高度为准（纵向填满）
        newHeight = containerHeight;
        newWidth = newHeight * ASPECT_RATIO;
        console.log('📐 Using height-based sizing');
      }

      const finalDimensions = { width: Math.floor(newWidth), height: Math.floor(newHeight) };

      console.log('🎯 Map dimensions calculated:', {
        from: 'container',
        container: { width: containerWidth, height: containerHeight },
        calculated: { width: newWidth, height: newHeight },
        final: finalDimensions,
        gridCells: { width: 12, height: 8 },
        expectedCellSize: {
          width: finalDimensions.width / 12,
          height: finalDimensions.height / 8
        }
      });

      setMapDimensions(finalDimensions);
    };

    // 初始计算
    calculateMapDimensions();

    // 窗口大小变化时重新计算
    const resizeObserver = new ResizeObserver(calculateMapDimensions);
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [ASPECT_RATIO]);

  // 初始化网格系统 - 使用动态尺寸
  useEffect(() => {
    if (mapDimensions.width > 0 && mapDimensions.height > 0) {
      if (gridSystemRef.current) {
        // 如果网格系统已存在，只更新canvas尺寸
        const oldDimensions = gridSystemRef.current.getCanvasDimensions();
        gridSystemRef.current.updateCanvasDimensions(mapDimensions.width, mapDimensions.height);
        console.log('MapLayout: Grid system canvas dimensions updated:', mapDimensions);

        // 检查尺寸是否确实发生了变化
        const dimensionsChanged = oldDimensions.width !== mapDimensions.width || oldDimensions.height !== mapDimensions.height;

        if (dimensionsChanged) {
          console.log('📏 Map dimensions changed, updating all artists...', {
            old: oldDimensions,
            new: mapDimensions
          });

          // 强制更新所有艺术家的canvas尺寸
          setTimeout(() => {
            artists.forEach((artist, index) => {
              if (artist.ref.current) {
                artist.ref.current.updateCanvasDimensions(
                  mapDimensions.width,
                  mapDimensions.height
                );
                console.log(`📍 Updated artist ${index + 1} canvas dimensions to ${mapDimensions.width}x${mapDimensions.height}`);
              }
            });
          }, 50);
        }
      } else {
        // 强制12x8网格 - 计算实际单元格尺寸
        const cellWidth = mapDimensions.width / 12;
        const cellHeight = mapDimensions.height / 8;
        // 使用较小的尺寸确保网格完全适配
        const cellSize = Math.floor(Math.min(cellWidth, cellHeight));

        gridSystemRef.current = new GridSystem(mapDimensions.width, mapDimensions.height, cellSize, 12, 8);
        console.log('MapLayout: Grid system initialized with fixed 12x8 grid:', gridSystemRef.current.getGridInfo());
        console.log('MapLayout: Map dimensions:', mapDimensions);
        console.log('MapLayout: Cell size:', cellSize);
        console.log('🔧 GridSystem ready, setting gridSystemReady to true');
        setGridSystemReady(true);
      }
    }
  }, [mapDimensions]);

  // 获取当前时期数据
  const currentPeriod = timelineData.periods.find(p => p.id === currentPeriodId);
  const currentRoles = timelineData.rolesByPeriod[currentPeriodId] || {};

  const handleCharacterUpdate = (character: Character) => {
    if (character) {
      console.log('👤 Character update received:', character);
      setCurrentCharacter(character);
    } else {
      console.error('MapLayout: Received null character update!');
    }
  };

  const handleEvaluation = (keywords: string[], evaluation: string) => {
    setCharacterEvaluation(evaluation);
  };

  // 处理评估开始 - 立即创建标签
  const handleEvaluationStart = (keywords: string[]) => {
    console.log('=== Evaluation Started ===');
    console.log('Keywords:', keywords);
    console.log('Current Character:', currentCharacter);

    if (currentCharacter) {
      // 立即创建带有placeholder内容的标签，使用特殊ID用于后续替换
      const placeholderTag: CommentTag = {
        id: `pending-evaluation-${Date.now()}`, // 使用特殊ID前缀
        position: {
          x: currentCharacter.position.x,
          y: currentCharacter.position.y
        },
        content: {
          sight: "Observing...",
          thought: "Thinking..."
        },
        keywords: keywords,
        timestamp: Date.now(),
        characterId: currentCharacter.id
      };

      console.log('Creating immediate tag:', placeholderTag);
      setCommentTags(prev => {
        const updated = [...prev, placeholderTag];
        console.log('Updated comment tags (immediate):', updated);
        return updated;
      });
    }
  };

  // 检查区域转换逻辑 (2个标签 → 工作室)
  const checkAreaTransformation = (newTags: CommentTag[]) => {
    if (!gridSystemRef.current) return;

    const gridCounts = new Map<string, number>();

    console.log('🔍 检查区域转换，当前标签总数:', newTags.length);

    // 统计每个网格单元的标签数量，并更新GridSystem的标签计数
    newTags.forEach(tag => {
      const gridPos = gridSystemRef.current!.screenToGrid(tag.position.x, tag.position.y);
      const gridKey = `${gridPos.gridX}-${gridPos.gridY}`;
      const count = (gridCounts.get(gridKey) || 0) + 1;
      gridCounts.set(gridKey, count);
    });

    console.log('📊 网格标签分布:', Object.fromEntries(gridCounts));

    // 同步更新GridSystem中的标签计数（基于总计数）
    gridCounts.forEach((count, gridKey) => {
      const [gridX, gridY] = gridKey.split('-').map(Number);
      // 获取当前计数，只添加新增的标签
      const currentCount = gridSystemRef.current!.getTagCount(gridX, gridY);
      if (count > currentCount) {
        for (let i = currentCount; i < count; i++) {
          gridSystemRef.current!.addTagToCell(gridX, gridY);
        }
        console.log(`📈 网格 ${gridKey} 标签数量更新: ${currentCount} → ${count}`);
      }
    });

    // 检查是否有网格单元达到2个或更多标签
    const newStudioAreas = new Set(studioAreas);
    let hasNewStudios = false;

    gridCounts.forEach((count, gridKey) => {
      if (count >= 2 && !studioAreas.has(gridKey)) {
        newStudioAreas.add(gridKey);
        hasNewStudios = true;
        console.log(`🏭 区域 ${gridKey} 转换为工作室！(${count} 个标签)`);
      }
    });

    if (hasNewStudios) {
      console.log(`🎉 新增 ${newStudioAreas.size - studioAreas.size} 个工作室区域，总数: ${newStudioAreas.size}`);
      setStudioAreas(newStudioAreas);
    }
  };

  // 监控区域活力，自动年代转换 (area vitality ≥ 50)
  useEffect(() => {
    if (commentTags.length >= 50 && currentPeriodId === timelineData.periods[0].id) {
      console.log(`🚀 Auto-transitioning to next period! Area vitality (comment tags): ${commentTags.length}`);

      // 保存当前时期的状态快照
      saveCurrentPeriodSnapshot();

      // 切换到下一时期
      setCurrentPeriodId(timelineData.periods[1].id);
      // 解锁下一个时期
      setMaxUnlockedPeriodIndex(1);
    }
  }, [commentTags.length, currentPeriodId]);

  // 定期清理过期的临时标签
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setCommentTags(prev => {
        const now = Date.now();
        const maxPendingAge = 15000; // 15秒后清理未替换的临时标签

        const cleanedTags = prev.filter(tag => {
          // 移除过期的临时标签
          if (tag.id.startsWith('pending-evaluation-')) {
            const age = now - tag.timestamp;
            if (age > maxPendingAge) {
              console.log('🧹 Cleaning up expired pending tag:', tag.id, 'Age:', age);
              return false;
            }
          }

          // 移除包含临时内容的标签
          if (tag.content.sight === "Observing..." && tag.content.thought === "Thinking...") {
            const age = now - tag.timestamp;
            if (age > maxPendingAge) {
              console.log('🧹 Cleaning up expired placeholder tag:', tag.id, 'Age:', age);
              return false;
            }
          }

          return true;
        });

        if (cleanedTags.length !== prev.length) {
          console.log(`🧹 Cleaned up ${prev.length - cleanedTags.length} expired temporary tags`);
          return cleanedTags;
        }

        return prev;
      });
    }, 5000); // 每5秒检查一次

    return () => clearInterval(cleanupInterval);
  }, []);

  const handleAIEvaluation = (evaluation: { sight: string; thought: string; confidence: number }) => {
    console.log('🎯 handleAIEvaluation CALLED!!! This should replace pending tag!!!');

    try {
      console.log('=== AI Evaluation Received ===');
      setAiEvaluation(evaluation);

    // 直接从TrajectorySystem获取当前角色位置，而不依赖React状态
    if (artists.length > 0 && artists[0].ref.current) {
      try {
        // 获取实时角色信息（TrajectorySystem内部的角色对象）
        const characterPosition = artists[0].ref.current.getCurrentPosition();

        // 获取当前位置的网格坐标和关键词
        const gridPos = gridSystemRef.current!.screenToGrid(characterPosition.x, characterPosition.y);
        const positionKeywords = gridSystemRef.current!.getKeywordsAtPosition(gridPos);

        console.log('🏷️ Updating pending tag to completed evaluation at position:', characterPosition, 'with keywords:', positionKeywords);
        setCommentTags(prev => {
          // 查找最近的pending标签并替换它（按时间倒序查找最新的）
          let pendingIndex = -1;
          let latestTimestamp = 0;

          prev.forEach((tag, index) => {
            if (tag.id.startsWith('pending-evaluation-') && tag.timestamp > latestTimestamp) {
              pendingIndex = index;
              latestTimestamp = tag.timestamp;
            }
          });

          if (pendingIndex !== -1) {
            console.log('📝 Found pending tag to replace:', prev[pendingIndex]);
            // 替换pending标签
            const newTags = [...prev];
            newTags[pendingIndex] = {
              ...prev[pendingIndex],
              id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 生成新ID
              content: {
                sight: evaluation.sight,
                thought: evaluation.thought
              },
              keywords: positionKeywords.length > 0 ? positionKeywords : debugData.lastKeywords,
              timestamp: Date.now(),
              position: characterPosition // 更新到实际位置
            };
            console.log('✅ Replaced pending tag with completed evaluation:', newTags[pendingIndex]);

            // 检查区域转换
            setTimeout(() => checkAreaTransformation(newTags), 100);
            return newTags;
          } else {
            console.log('⚠️ No pending tag found, creating new tag');

            // 先清理所有可能残留的临时标签
            const cleanedTags = prev.filter(tag =>
              !tag.id.startsWith('pending-evaluation-') &&
              tag.content.sight !== "Observing..." &&
              tag.content.thought !== "Thinking..."
            );

            // 创建新标签（备用方案）
            const newCommentTag: CommentTag = {
              id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              position: characterPosition,
              content: {
                sight: evaluation.sight,
                thought: evaluation.thought
              },
              keywords: positionKeywords.length > 0 ? positionKeywords : debugData.lastKeywords,
              timestamp: Date.now(),
              characterId: 'ARTIST'
            };

            const newTags = [...cleanedTags, newCommentTag];
            setTimeout(() => checkAreaTransformation(newTags), 100);
            return newTags;
          }
        });
      } catch (error) {
        console.error('Error updating comment tag:', error);
        console.log('Fallback: No character available for tag update');
      }
    } else {
      console.log('⚠️ wanderingCharacterRef.current is null, cannot update tag');
    }

    } catch (globalError) {
      console.error('🚨 Global error in handleAIEvaluation:', globalError);
    }
  };

  const handleDebugDataUpdate = (data: {
    aiServiceStatus: { pending: number; processing: boolean };
    evaluationInterval: number;
    evaluationCount: number;
    lastKeywords: string[];
    timeRemaining: number;
  }) => {
    setDebugData(data);

    // 同时更新暂停状态
    if (artists.length > 0 && artists[0].ref.current) {
      const paused = artists[0].ref.current.isPaused();
      setIsPaused(paused);
    }
  };

  // 政府标签移除处理器
  const handleTagRemove = (tagId: string) => {
    setCommentTags(prev => prev.filter(tag => tag.id !== tagId));
    console.log('🏛️ Government removed tag:', tagId);
  };

  // 保存当前时期的状态快照
  const saveCurrentPeriodSnapshot = () => {
    if (!gridSystemRef.current) return;

    console.log('💾 Saving period snapshot for:', currentPeriodId);

    // 收集所有艺术家位置
    const artistPositions = artists.map(artist => {
      const position = artist.ref.current?.getCurrentPosition() || { x: 0, y: 0 };
      return {
        id: artist.id,
        x: position.x,
        y: position.y
      };
    });

    // 获取工作室圆形数据
    const studioCircles = studioCirclesRef.current?.getCircles() || [];

    // 获取网格标签计数
    const gridTagCountsMap = gridSystemRef.current.getAllTagCounts();
    const gridTagCounts: Record<string, number> = {};
    gridTagCountsMap.forEach((count, key) => {
      gridTagCounts[key] = count;
    });

    const snapshot: PeriodSnapshot = {
      periodId: currentPeriodId,
      timestamp: Date.now(),
      commentTags: [...commentTags],
      studioAreas: Array.from(studioAreas),
      studioCircles: studioCircles.map(circle => ({
        id: circle.id,
        centerX: circle.centerX,
        centerY: circle.centerY,
        radius: circle.radius,
        gridKey: circle.gridKey,
        createdAt: circle.createdAt
      })),
      artistPositions,
      areaVitality: commentTags.length,
      gridTagCounts
    };

    setPeriodSnapshots(prev => {
      const newSnapshots = new Map(prev);
      newSnapshots.set(currentPeriodId, snapshot);
      console.log('✅ Snapshot saved:', snapshot);
      return newSnapshots;
    });
  };

  // 恢复时期状态快照
  const restorePeriodSnapshot = (periodId: string) => {
    const snapshot = periodSnapshots.get(periodId);
    if (!snapshot) {
      console.warn('⚠️ No snapshot found for period:', periodId);
      return;
    }

    console.log('📂 Restoring period snapshot:', snapshot);

    // 恢复评论标签
    setCommentTags(snapshot.commentTags);

    // 恢复工作室区域
    setStudioAreas(new Set(snapshot.studioAreas));

    // 恢复工作室圆形
    if (studioCirclesRef.current) {
      const restoredCircles: StudioCircle[] = snapshot.studioCircles.map(circle => ({
        ...circle,
        isAnimating: false // 恢复的圆形不需要动画
      }));
      studioCirclesRef.current.setCircles(restoredCircles);
    }

    // 恢复网格标签计数（需要GridSystem支持）
    // TODO: 如果GridSystem需要恢复标签计数，在这里添加逻辑

    console.log('✅ Period snapshot restored');
  };

  // 清空当前时期的所有动态数据
  const clearCurrentPeriodData = () => {
    console.log('🧹 Clearing current period data');
    setCommentTags([]);
    setStudioAreas(new Set());
    if (studioCirclesRef.current) {
      studioCirclesRef.current.setCircles([]);
    }
    // 清空网格标签计数
    if (gridSystemRef.current) {
      // TODO: 如果需要清空GridSystem的标签计数，在这里添加逻辑
    }
  };

  // 时期变化处理器
  const handlePeriodChange = (periodId: string) => {
    console.log(`🔄 Period change requested: ${currentPeriodId} -> ${periodId}`);

    const currentPeriodIndex = timelineData.periods.findIndex(p => p.id === currentPeriodId);
    const targetPeriodIndex = timelineData.periods.findIndex(p => p.id === periodId);

    // 如果是向前跳转（回到过去的时期），并且当前时期是period-2或更晚
    if (targetPeriodIndex < currentPeriodIndex && currentPeriodIndex >= 1) {
      // 显示确认弹窗
      setPendingPeriodId(periodId);
      setIsConfirmDialogOpen(true);
      console.log('⚠️ Backward time travel detected, showing confirmation dialog');
      return;
    }

    // 正常的时期切换（向前或同时期）
    performPeriodChange(periodId);
  };

  // 执行时期切换
  const performPeriodChange = (periodId: string) => {
    console.log(`✅ Performing period change to: ${periodId}`);
    setCurrentPeriodId(periodId);

    // 时期切换时，强制更新所有艺术家的canvas尺寸
    setTimeout(() => {
      if (gridSystemRef.current && artists.length > 0) {
        const canvasDimensions = gridSystemRef.current.getCanvasDimensions();
        console.log('🔄 Period change - updating artist canvas dimensions:', canvasDimensions);

        artists.forEach((artist, index) => {
          if (artist.ref.current) {
            const position = artist.ref.current.getCurrentPosition();
            console.log(`📍 Artist ${index + 1} position before period change:`, position);
          }
        });

        // 更新所有艺术家的canvas尺寸
        artists.forEach((artist, index) => {
          if (artist.ref.current) {
            artist.ref.current.updateCanvasDimensions(
              canvasDimensions.width,
              canvasDimensions.height
            );
          }
        });
      }
    }, 100); // 短暂延迟确保状态更新完成
  };

  // 确认回退到过去时期
  const handleConfirmBackwardTravel = () => {
    console.log('✅ User confirmed backward time travel');
    setIsConfirmDialogOpen(false);

    // 清空当前时期（period-2或更晚）的数据
    clearCurrentPeriodData();

    // 恢复目标时期的快照
    if (periodSnapshots.has(pendingPeriodId)) {
      restorePeriodSnapshot(pendingPeriodId);
    }

    // 执行时期切换
    performPeriodChange(pendingPeriodId);
  };

  // 取消回退
  const handleCancelBackwardTravel = () => {
    console.log('❌ User cancelled backward time travel');
    setIsConfirmDialogOpen(false);
    setPendingPeriodId('');
  };

  return (
    <div
      className="min-h-screen text-white font-mono overflow-hidden relative"
      style={{
        backgroundImage: 'url(/backgrounds/initial_bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/70" />

      {/* 调试面板 */}
      <DebugPanel
        debugData={debugData}
        isVisible={isDebugVisible}
        onToggleVisibility={() => setIsDebugVisible(!isDebugVisible)}
        onManualEvaluation={() => {
          if (artists.length > 0 && artists[0].ref.current) {
            console.log('🔥 Debug Panel: Triggering manual evaluation...');
            artists[0].ref.current.manualEvaluation();
          }
        }}
      />

      {/* 确认弹窗 */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="时期回退确认"
        message="系统将清空2002-2006阶段的全部历史，是否确认回退到1995-2002阶段？"
        confirmText="确认回退"
        cancelText="取消"
        onConfirm={handleConfirmBackwardTravel}
        onCancel={handleCancelBackwardTravel}
      />

      {/* 页面标题 - 顶部位置 */}
      <div className="relative z-10 text-right p-6">
        <h1 className="text-2xl leading-tight tracking-wide">
          The 798 Paradox<br />
          <span className="text-lg">Artists, Governance, and the Unfinished Dream of 798</span>
        </h1>
      </div>

      {/* 区域活力指示器 - 左上角，仅在1995-2002期间显示 */}
      {currentPeriodId === 'period-1' && (
        <div className="absolute top-20 left-8 z-20">
          <div className="flex items-center space-x-2">
            <span className="text-white font-mono text-xs">Area Vitality</span>
            <div className="px-1.5 py-0.5 bg-white/20 border border-white/40 text-white font-mono text-xs">
              {commentTags.length}
            </div>
          </div>
        </div>
      )}

      {/* 主布局区域 */}
      <div className="flex relative z-10 px-6 pb-6 h-[calc(100vh-120px)]">

        {/* 左侧：地图区域 占 2/3 */}
        <div className="w-2/3 pr-8 flex flex-col">

          {/* 地图容器 - 占据5/6高度，支持响应式，从左上角开始布局 */}
          <div
            ref={mapContainerRef}
            className="bg-black/50 h-5/6 overflow-hidden relative"
          >
            {/* 地图内容区域 - 保持比例的容器，从左上角开始 */}
            <div
              className="absolute top-0 left-0"
              style={{
                width: mapDimensions.width,
                height: mapDimensions.height
              }}
              ref={(div) => {
                if (div && mapContainerRef.current) {
                  const containerRect = mapContainerRef.current.getBoundingClientRect();
                  const contentRect = div.getBoundingClientRect();
                  console.log('🎯 Fixed Layout Debug:', {
                    container: {
                      width: containerRect.width,
                      height: containerRect.height,
                      top: containerRect.top,
                      left: containerRect.left
                    },
                    content: {
                      width: contentRect.width,
                      height: contentRect.height,
                      top: contentRect.top,
                      left: contentRect.left
                    },
                    offset: {
                      x: contentRect.left - containerRect.left,
                      y: contentRect.top - containerRect.top
                    },
                    mapDimensions,
                    shouldBeZero: 'offset should be (0,0) now'
                  });
                }
              }}
            >
              {/* 底图背景 */}
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: 'url(/maps/798-base-map.png)',
                  width: '100%',
                  height: '100%'
                }}
              />

              {/* 基础网格显示 - 简化的网格系统 */}
              {gridSystemRef.current && showGrid && (
                <GridOverlay
                  gridSystem={gridSystemRef.current}
                  className="absolute inset-0 z-20"
                  showLabels={true}
                  currentPeriod={currentPeriod?.years || ''}
                  studioAreas={studioAreas}
                />
              )}

              {/* 工作室圆形可视化 - 在网格之上，在角色之下 */}
              {/* 所有时间阶段都显示圆形，但只在1995-2002阶段生成新圆形 */}
              {gridSystemRef.current && (
                <StudioCircles
                  ref={studioCirclesRef}
                  gridSystem={gridSystemRef.current}
                  studioAreas={studioAreas}
                  commentTags={commentTags}
                  className="absolute inset-0 z-25"
                  allowNewCircles={currentPeriodId === 'period-1'} // 只在第一阶段允许生成新圆形
                />
              )}

              {/* 多个游走艺术家系统 */}
              {gridSystemRef.current && checkedItems.artist && artists.map((artist, index) => {
                console.log(`🎭 Rendering artist ${artist.id} (${index}) - gridSystemReady: ${gridSystemReady}, checkedItems.artist: ${checkedItems.artist}`);
                return (
                <WanderingCharacter
                  key={artist.id}
                  ref={artist.ref}
                  artistId={artist.id} // 传递艺术家ID
                  gridSystem={gridSystemRef.current}
                  className="absolute inset-0 z-40"
                  onCharacterUpdate={index === 0 ? handleCharacterUpdate : undefined} // 只有第一个艺术家更新主状态
                  onEvaluation={index === 0 ? handleEvaluation : undefined}
                  onEvaluationStart={index === 0 ? handleEvaluationStart : undefined}
                  onAIEvaluation={handleAIEvaluation} // 所有艺术家都可以生成评论
                  onDebugDataUpdate={index === 0 ? handleDebugDataUpdate : undefined} // 只有第一个艺术家更新调试信息
                />
                );
              })}

              {/* 政府角色系统 */}
              {gridSystemRef.current && checkedItems.government && (
                <WanderingGovernment
                  ref={wanderingGovernmentRef}
                  gridSystem={gridSystemRef.current}
                  className="absolute inset-0 z-40"
                  commentTags={commentTags}
                  onTagRemove={handleTagRemove}
                  currentPeriod={currentPeriod?.years || ''}
                />
              )}

              {/* 网格光标系统 */}
              {gridSystemRef.current && checkedItems.artist && artists.length > 0 && (
                <GridCursor
                  gridSystem={gridSystemRef.current}
                  character={currentCharacter}
                  className="absolute inset-0 z-50"
                  onManualEvaluation={() => artists[0]?.ref.current?.manualEvaluation()}
                  onRegenerateTrajectory={() => artists[0]?.ref.current?.regenerateTrajectory()}
                  onToggleMovement={() => artists[0]?.ref.current?.toggleMovement()}
                  onSpeedChange={(speed) => artists[0]?.ref.current?.setSpeed(speed)}
                  aiServiceStatus={debugData.aiServiceStatus}
                  evaluationInterval={debugData.evaluationInterval}
                  evaluationCount={debugData.evaluationCount}
                  lastKeywords={debugData.lastKeywords}
                />
              )}

              {/* 艺术家光点 - 显示所有艺术家 */}
              {checkedItems.artist && artists.map((artist, index) => {
                console.log(`✨ Rendering SimpleArtistDot for artist ${artist.id} (${index}) - currentCharacter:`, index === 0 ? currentCharacter : undefined);
                return (
                <SimpleArtistDot
                  key={`dot-${artist.id}`}
                  character={index === 0 ? currentCharacter : undefined} // 第一个艺术家使用主状态，其他的暂时为undefined
                  className="absolute inset-0 z-60"
                />
                );
              })}

              {/* 评论标签 */}
              {checkedItems.artist && (
                <CommentTags
                  tags={commentTags}
                  className="absolute inset-0 z-70"
                />
              )}
            </div>
          </div>

          {/* 时间线 - 在地图下方，占据剩余1/6高度 */}
          <div className="h-1/6 flex items-center">
            <Timeline
              periods={timelineData.periods}
              currentPeriod={currentPeriodId}
              onPeriodChange={handlePeriodChange}
              className="w-full"
              maxUnlockedPeriodIndex={maxUnlockedPeriodIndex}
            />
          </div>
        </div>

        {/* 右侧：信息面板 占 1/3 */}
        <div className="w-1/3 space-y-2 h-full">

          {/* 当前时期描述 */}
          <div className="bg-black/80 p-4">
            <PeriodInfoPanel currentPeriod={currentPeriod} />
          </div>

          {/* 角色信息 */}
          <div className="bg-black/80 p-4 flex-1 overflow-y-auto">
            <h3 className="text-[10px] font-mono text-white/70 uppercase tracking-widest mb-2">
              Roles
            </h3>
            <RolePanel
              roles={currentRoles}
              currentKeywords={debugData.lastKeywords}
            />
          </div>

        </div>
      </div>

      {/* 调试配置面板（在右下角显示） */}
      {isDebugVisible && (
        <div className="fixed bottom-4 right-4 bg-black/90 p-4 text-xs z-50 max-w-xs">
          <h3 className="text-white/70 uppercase tracking-wider mb-3">Debug Panel</h3>
          <div className="space-y-2">
            {currentCharacter && (
              <>
                <div>Position: ({currentCharacter.position.x.toFixed(1)}, {currentCharacter.position.y.toFixed(1)})</div>
                <div className={currentCharacter.isMoving ? 'text-green-400' : 'text-white'}>
                  Status: {currentCharacter.isMoving ? 'Moving' : 'Stationary'}
                </div>
                <div>Studios: {studioAreas.size} | Area Vitality: {commentTags.length}/50</div>
              </>
            )}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-3 py-1 text-xs hover:bg-white/10 transition-colors ${
                showGrid ? 'bg-white/20' : 'bg-white/10'
              }`}
            >
              {showGrid ? 'Hide Grid' : 'Show Grid'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLayout;