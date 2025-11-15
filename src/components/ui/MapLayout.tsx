'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MapGridCanvas from './MapGridCanvas';
import WanderingCharacter, { WanderingCharacterRef } from './WanderingCharacter';
import WanderingGovernment, { WanderingGovernmentRef } from './WanderingGovernment';
import GridCursor from './GridCursor';
import SimpleArtistDot from './SimpleArtistDot';
import CommentTags, { CommentTag } from './CommentTags';
import GridOverlay from './GridOverlay';
import BackgroundGrid from './BackgroundGrid';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { Character } from '@/types/character';

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
  // Main layout component
  // 移除activeTab，现在只有role模式
  const [expandedItem, setExpandedItem] = useState<string | null>('artist');
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [characterEvaluation, setCharacterEvaluation] = useState<string>('');
  const [aiEvaluation, setAiEvaluation] = useState<{ artistic: string; cultural: string; critique: string; confidence: number } | null>(null);
  const [isDebugExpanded, setIsDebugExpanded] = useState(true);
  const [gridSystemReady, setGridSystemReady] = useState(false);
  const gridSystemRef = useRef<GridSystem | null>(null);
  const wanderingCharacterRef = useRef<WanderingCharacterRef>(null);
  const wanderingGovernmentRef = useRef<WanderingGovernmentRef>(null);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
    artist: true,
    government: false
  });

  // 网格显示控制
  const [showGrid, setShowGrid] = useState(false);

  // 当前年代状态
  const [currentPeriod, setCurrentPeriod] = useState('1995-2000');
  
  // 调试数据状态
  const [debugData, setDebugData] = useState({
    aiServiceStatus: { pending: 0, processing: false },
    evaluationInterval: 20,
    evaluationCount: 0,
    lastKeywords: [] as string[],
    timeRemaining: 20
  });

  // 获取暂停状态
  const [isPaused, setIsPaused] = useState(false);


  // 评论标签状态
  const [commentTags, setCommentTags] = useState<CommentTag[]>([]);
  
  // 工作室区域状态 (存储已转换为工作室的网格坐标)
  const [studioAreas, setStudioAreas] = useState<Set<string>>(new Set());
  
  // Artist配置参数
  const [artistConfig, setArtistConfig] = useState({
    evaluationInterval: 20, // AI评价间隔
    movementSpeed: 1.0,     // 移动速度
    autoEvaluation: true    // 自动评价开关
  });

  // 初始化网格系统
  useEffect(() => {
    gridSystemRef.current = new GridSystem(600, 400, 50);
    console.log('MapLayout: Grid system initialized:', gridSystemRef.current.getGridInfo());
    setGridSystemReady(true);
  }, []);

  const roleData = {
    artist: "Artists operate within a framework of creative autonomy while navigating institutional constraints. They seek to preserve artistic integrity while adapting to commercial pressures and governmental oversight.",
    government: "政府部门致力于将这片废弃工厂区域改造为现代化电子科技园。我们评估每个区域的发展潜力，清理不符合规划的元素，为高新技术企业创造优质的产业环境。"
  };

  const layerData = {
    "1995-2000": "Factory Renovation Period: Artists and intellectuals began discovering and occupying abandoned state-owned factories, transforming industrial spaces into experimental art studios and creative communities.",
    "2000-2004": "Independent Studio Period: Artists occupied abandoned factory spaces, establishing informal creative communities without official recognition or commercial infrastructure.",
    "2004-2008": "Commercialization Phase: Introduction of galleries, cafes, and commercial spaces. Government recognition and tourist development began transforming the artistic ecosystem.",
    "2008-2010": "Warm Winter Period: Stabilization phase with established commercial operations and governmental support, marking the institutionalization of the art district."
  };

  const currentData = roleData;
  const currentItems = Object.keys(currentData);

  const handleItemClick = (item: string) => {
    // 只切换展开状态
    setExpandedItem(expandedItem === item ? null : item);
  };

  const handleCheckboxChange = (item: string) => {
    const newCheckedState = !checkedItems[item];
    setCheckedItems(prev => ({
      ...prev,
      [item]: newCheckedState
    }));
    
    // 当Artist被勾选时，自动展开内容和CONFIGURATION面板
    if (item === 'artist' && newCheckedState) {
      setExpandedItem('artist');
      setIsDebugExpanded(true);
    }
    // 当Artist被取消勾选时，收起CONFIGURATION面板
    else if (item === 'artist' && !newCheckedState) {
      setIsDebugExpanded(false);
    }
  };

  const handleCharacterUpdate = (character: Character) => {
    if (character) {
      // console.log('MapLayout: Character update received:', {
      //   name: character.name,
      //   position: character.position,
      //   isMoving: character.isMoving,
      //   timestamp: Date.now()
      // });
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
      // 立即创建带有placeholder内容的标签
      const placeholderTag: CommentTag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: currentCharacter.position.x,
          y: currentCharacter.position.y
        },
        content: {
          sight: "正在观察中...",
          thought: "正在思考中..."
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

    // 统计每个网格单元的标签数量，并更新GridSystem的标签计数
    newTags.forEach(tag => {
      const gridPos = gridSystemRef.current!.screenToGrid(tag.position.x, tag.position.y);
      const gridKey = `${gridPos.gridX}-${gridPos.gridY}`;
      const count = (gridCounts.get(gridKey) || 0) + 1;
      gridCounts.set(gridKey, count);
    });

    // 同步更新GridSystem中的标签计数（基于总计数）
    gridCounts.forEach((count, gridKey) => {
      const [gridX, gridY] = gridKey.split('-').map(Number);
      // 获取当前计数，只添加新增的标签
      const currentCount = gridSystemRef.current!.getTagCount(gridX, gridY);
      if (count > currentCount) {
        for (let i = currentCount; i < count; i++) {
          gridSystemRef.current!.addTagToCell(gridX, gridY);
        }
      }
    });

    // 检查是否有网格单元达到2个或更多标签
    const newStudioAreas = new Set(studioAreas);
    let hasNewStudios = false;

    gridCounts.forEach((count, gridKey) => {
      if (count >= 2 && !studioAreas.has(gridKey)) {
        newStudioAreas.add(gridKey);
        hasNewStudios = true;
        console.log(`🏭 Area ${gridKey} transformed to studio! (${count} tags)`);
      }
    });

    if (hasNewStudios) {
      setStudioAreas(newStudioAreas);
    }
  };

  // 监控工作室数量，自动年代转换
  useEffect(() => {
    if (studioAreas.size >= 25 && currentPeriod === '1995-2000') {
      console.log(`🚀 Auto-transitioning to 2000-2004! Studio count: ${studioAreas.size}`);
      setCurrentPeriod('2000-2004');
    }
  }, [studioAreas.size, currentPeriod]);

  const handleAIEvaluation = (evaluation: { sight: string; thought: string; confidence: number }) => {
    console.log('🎯 handleAIEvaluation CALLED!!! This should create a tag!!!');
    
    try {
      console.log('=== AI Evaluation Received ===');
      setAiEvaluation(evaluation);
    
    // 直接从TrajectorySystem获取当前角色位置，而不依赖React状态
    if (wanderingCharacterRef.current) {
      try {
        // 获取实时角色信息（TrajectorySystem内部的角色对象）
        const characterPosition = wanderingCharacterRef.current.getCurrentPosition();
        
        // 获取当前位置的网格坐标和关键词
        const gridPos = gridSystemRef.current!.screenToGrid(characterPosition.x, characterPosition.y);
        const positionKeywords = gridSystemRef.current!.getKeywordsAtPosition(gridPos);
        
        // 创建新的评论标签
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
        
        console.log('🏷️ Created new comment tag at position:', characterPosition, 'with keywords:', positionKeywords);
        setCommentTags(prev => {
          const newTags = [...prev, newCommentTag];
          // 检查区域转换
          setTimeout(() => checkAreaTransformation(newTags), 100);
          return newTags;
        });
      } catch (error) {
        console.error('Error creating comment tag:', error);
        console.log('Fallback: No character available for tag creation');
      }
    } else {
      console.log('⚠️ wanderingCharacterRef.current is null, cannot create tag');
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
    if (wanderingCharacterRef.current) {
      const paused = wanderingCharacterRef.current.isPaused();
      setIsPaused(paused);
    }
  };

  // 政府标签移除处理器
  const handleTagRemove = (tagId: string) => {
    setCommentTags(prev => prev.filter(tag => tag.id !== tagId));
    console.log('🏛️ Government removed tag:', tagId);
  };

  return (
    <div 
      className="h-screen text-white font-mono overflow-hidden relative"
      style={{
        backgroundImage: 'url(/backgrounds/initial_bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/70" />
      {/* Header */}
      <header className="p-4 border-b border-white relative z-10">
        <div className="px-2">
          <h1 className="text-2xl leading-tight tracking-wide">
            The 798 Paradox<br />
            <span className="text-lg">Artists, Governance, and the Unfinished Dream of 798</span>
          </h1>
        </div>
        
        {/* Timeline - 时间轴 */}
        <div className="px-2 pt-4">
          <div className="flex items-center space-x-8">
            {Object.entries(layerData).map(([period, description], index) => (
              <div key={period} className="flex items-center">
                <button
                  onClick={() => setCurrentPeriod(period)}
                  className="flex flex-col items-center hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className={`w-3 h-3 rounded-full ${
                    currentPeriod === period ? 'bg-yellow-400' : 'bg-white'
                  }`}></div>
                  <div className={`text-xs mt-1 font-mono tracking-wide ${
                    currentPeriod === period ? 'text-yellow-400' : 'text-white/90'
                  }`}>{period}</div>
                  <div className={`text-xs mt-1 max-w-48 text-center leading-tight ${
                    currentPeriod === period ? 'text-yellow-300/80' : 'text-white/60'
                  }`}>
                    {description.split(':')[0]}
                  </div>
                </button>
                {index < Object.entries(layerData).length - 1 && (
                  <div className="w-20 h-px bg-white/40 mx-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>


      <div className="flex h-[calc(100vh-280px)] relative z-10">
        {/* Left Section - ROLE */}
        <div className="w-1/4 px-2 py-4 border-r border-white">
          {/* ROLE标题 */}
          <h2 className="text-white font-semibold pb-2 text-sm uppercase tracking-widest">ROLE</h2>
          <div className="border border-white h-full overflow-y-auto">
            <div className="p-4 space-y-4">
            {currentItems.map((item) => (
              <div key={item} className="border border-white">
                <div className="flex items-center p-4 border-b border-white">
                  {/* 勾选框 - 对artist和government显示 */}
                  {(item === 'artist' || item === 'government') && (
                    <input
                      type="checkbox"
                      checked={checkedItems[item] || false}
                      onChange={() => handleCheckboxChange(item)}
                      className="mr-3 w-4 h-4 bg-transparent border border-white checked:bg-white checked:border-white focus:ring-0 focus:ring-offset-0"
                      style={{
                        appearance: 'none',
                        backgroundImage: checkedItems[item] ? 'url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox=\'0 0 16 16\' fill=\'black\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z\'/%3E%3C/svg%3E")' : 'none',
                        backgroundSize: '100% 100%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                  )}
                  
                  <button
                    onClick={() => handleItemClick(item)}
                    className="flex-1 text-left hover:bg-white hover:text-black transition-colors uppercase tracking-wider text-sm"
                  >
                    {item}
                  </button>
                </div>
                
                <AnimatePresence>
                  {/* 显示内容的逻辑：需要勾选并展开 */}
                  {(checkedItems[item] && expandedItem === item) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-black border-t border-white">
                        <p className="leading-relaxed text-xs">
                          {currentData[item as keyof typeof currentData]}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Center Section - DEMO TEST */}
        <div className="w-2/4 px-4 py-4 border-r border-white">
          {/* DEMO TEST MAP 标题移到框外上方 */}
          <h2 className="text-white font-semibold pb-2 text-sm uppercase tracking-widest">DEMO TEST MAP</h2>
          <div className="border border-white h-full overflow-hidden relative">

            {/* 网格背景图案 */}
            {gridSystemRef.current && (
              <BackgroundGrid
                gridSystem={gridSystemRef.current}
                className="z-0"
              />
            )}

            {/* 网格区域显示 */}
            {gridSystemRef.current && showGrid && (
              <GridOverlay
                gridSystem={gridSystemRef.current}
                className="absolute inset-0 z-10"
                showLabels={true}
                currentPeriod={currentPeriod}
                studioAreas={studioAreas}
              />
            )}
            
            {/* 隐藏的原始网格系统，保留功能接口 */}
            <div className="absolute inset-0 opacity-0 pointer-events-none">
              <MapGridCanvas 
                width={600}
                height={400}
                onPositionHover={(keywords) => {
                  console.log('Hover keywords:', keywords);
                }}
                onPositionClick={(keywords, position) => {
                  console.log('Click keywords:', keywords, 'at:', position);
                }}
              />
            </div>

            {/* 游走角色系统 - 只有勾选Artist时显示 */}
            {gridSystemRef.current && checkedItems.artist && (
              <WanderingCharacter 
                ref={wanderingCharacterRef}
                gridSystem={gridSystemRef.current}
                className="absolute inset-0"
                onCharacterUpdate={handleCharacterUpdate}
                onEvaluation={handleEvaluation}
                onEvaluationStart={handleEvaluationStart}
                onAIEvaluation={handleAIEvaluation}
                onDebugDataUpdate={handleDebugDataUpdate}
              />
            )}

            {/* 政府角色系统 - 只有勾选Government时显示 */}
            {gridSystemRef.current && checkedItems.government && (
              <WanderingGovernment 
                ref={wanderingGovernmentRef}
                gridSystem={gridSystemRef.current}
                className="absolute inset-0"
                commentTags={commentTags}
                onTagRemove={handleTagRemove}
                currentPeriod={currentPeriod}
              />
            )}

            {/* 网格光标系统 - 只有勾选Artist时显示 */}
            {gridSystemRef.current && checkedItems.artist && (
              <GridCursor 
                gridSystem={gridSystemRef.current}
                character={currentCharacter}
                className="absolute inset-0"
                onManualEvaluation={() => wanderingCharacterRef.current?.manualEvaluation()}
                onRegenerateTrajectory={() => wanderingCharacterRef.current?.regenerateTrajectory()}
                onToggleMovement={() => wanderingCharacterRef.current?.toggleMovement()}
                onSpeedChange={(speed) => wanderingCharacterRef.current?.setSpeed(speed)}
                aiServiceStatus={debugData.aiServiceStatus}
                evaluationInterval={debugData.evaluationInterval}
                evaluationCount={debugData.evaluationCount}
                lastKeywords={debugData.lastKeywords}
              />
            )}

            {/* ARTIST艺术家光点 - 只有勾选Artist时显示 */}
            {checkedItems.artist && (
              <SimpleArtistDot 
                character={currentCharacter}
                className="absolute inset-0"
              />
            )}
            


            {/* 评论标签 - 只有勾选Artist时显示 */}
            {checkedItems.artist && (
              <CommentTags 
                tags={commentTags}
              />
            )}
          </div>
        </div>

        {/* Right Section - ARTIST CONFIGURATION */}
        <div className="w-1/4 px-2 py-4">
          {/* CONFIGURATION标题 */}
          <h2 className="text-white font-semibold pb-2 text-sm uppercase tracking-widest">CONFIGURATION</h2>
          <div className="border border-white h-full overflow-y-auto">
            {/* 内容区域 - 直接展示 */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto border-b border-white">
              <div 
                className="cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between"
                onClick={() => setIsDebugExpanded(!isDebugExpanded)}
              >
                <span className="text-xs uppercase tracking-widest text-white/90">ARTIST</span>
                <span className="text-white/60 text-xs">
                  {isDebugExpanded ? '▼' : '▶'}
                </span>
              </div>
            </div>
            
            {/* 可展开的详细内容区域 */}
            {isDebugExpanded && (
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {currentCharacter ? (
                  <>
                    {/* 基础状态信息 */}
                    <div className="space-y-2">
                      <div className="text-xs">POSITION: Canvas({currentCharacter.position.x.toFixed(2)}, {currentCharacter.position.y.toFixed(2)})</div>
                      {debugData.lastKeywords.length > 0 && (
                        <div>
                          <div className="text-white/70 text-xs">LAST KEYWORDS:</div>
                          <div className="text-xs text-gray-300 break-words">
                            {debugData.lastKeywords.join(', ')}
                          </div>
                        </div>
                      )}
                      <div className={`text-xs ${currentCharacter.isMoving ? 'text-green-400' : 'text-white'}`}>
                        STATUS: {currentCharacter.isMoving ? 'CONSTRUCTING' : 'STATIONED'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-white/50 text-xs">等待角色初始化...</div>
                )}

                {/* AI评价系统参数 */}
                <div className="border-t border-white/20 pt-4 space-y-2">
                  <div className="text-white/70 text-xs uppercase">AI EVALUATION</div>
                  <div className="text-xs">
                    INTERVAL: {debugData.evaluationInterval}s | 
                    NEXT IN: {debugData.timeRemaining >= 0 ? `${debugData.timeRemaining}s` : 'PAUSED'}
                  </div>
                  <div className="text-xs">QUEUE STATUS: {debugData.aiServiceStatus.processing ? 
                    <span className="text-green-400">PROCESSING</span> : 
                    debugData.aiServiceStatus.pending > 0 ? 
                      <span className="text-green-400">WAITING ({debugData.aiServiceStatus.pending})</span> :
                      <span className="text-white">IDLE</span>
                  }</div>
                  <div className="text-xs">EVALUATION COUNT: {debugData.evaluationCount}</div>
                  
                  {/* 手动控制按钮 - 移动到EVALUATION COUNT下方 */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => wanderingCharacterRef.current?.manualEvaluation()}
                      className="w-full px-2 py-1 text-xs border border-white/30 hover:bg-white/10 transition-colors"
                    >
                      立即评价
                    </button>
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`w-full px-2 py-1 text-xs border border-white/30 hover:bg-white/10 transition-colors ${
                        showGrid ? 'bg-white/20' : ''
                      }`}
                    >
                      {showGrid ? '隐藏网格' : '显示网格'}
                    </button>
                    {currentCharacter && (
                      <button
                        onClick={() => {
                          wanderingCharacterRef.current?.toggleMovement();
                          // 更新暂停状态
                          setTimeout(() => {
                            const paused = wanderingCharacterRef.current?.isPaused() || false;
                            setIsPaused(paused);
                          }, 100);
                        }}
                        className={`w-full px-2 py-1 text-xs border border-white/30 hover:bg-white/10 transition-colors ${
                          isPaused ? 'bg-red-400/20 text-red-400' : 'bg-green-400/20 text-green-400'
                        }`}
                      >
                        {isPaused ? '恢复移动' : '暂停移动'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Artist配置参数 */}
                <div className="border-t border-white/20 pt-4 space-y-3">
                  <div className="text-white/70 text-xs uppercase">ARTIST CONFIGURATION</div>
                  
                  {/* 评价间隔设置 */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/60">评价间隔 (秒)</label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={artistConfig.evaluationInterval}
                      onChange={(e) => {
                        const newInterval = parseInt(e.target.value);
                        setArtistConfig(prev => ({ ...prev, evaluationInterval: newInterval }));
                        wanderingCharacterRef.current?.setEvaluationInterval?.(newInterval);
                      }}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none slider"
                    />
                    <div className="text-xs text-white/50">{artistConfig.evaluationInterval}s</div>
                  </div>

                  {/* 移动速度设置 */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/60">移动速度</label>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={artistConfig.movementSpeed}
                      onChange={(e) => {
                        const newSpeed = parseFloat(e.target.value);
                        setArtistConfig(prev => ({ ...prev, movementSpeed: newSpeed }));
                        wanderingCharacterRef.current?.setSpeed?.(newSpeed);
                      }}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none slider"
                    />
                    <div className="text-xs text-white/50">{artistConfig.movementSpeed.toFixed(1)}x</div>
                  </div>

                  {/* 自动评价开关 */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white/60">自动评价</label>
                    <button
                      onClick={() => {
                        const newAutoEval = !artistConfig.autoEvaluation;
                        setArtistConfig(prev => ({ ...prev, autoEvaluation: newAutoEval }));
                        if (newAutoEval) {
                          wanderingCharacterRef.current?.resume?.();
                        } else {
                          wanderingCharacterRef.current?.pause?.();
                        }
                      }}
                      className={`px-2 py-1 text-xs border border-white/30 rounded transition-colors ${
                        artistConfig.autoEvaluation ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
                      }`}
                    >
                      {artistConfig.autoEvaluation ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* 工作室统计 */}
                  <div className="border-t border-white/20 pt-3">
                    <div className="text-white/70 text-xs uppercase">AREA STATUS</div>
                    <div className="text-xs space-y-1 mt-2">
                      <div>工作室数量: {studioAreas.size}/25</div>
                      <div>评论标签: {commentTags.length}</div>
                      <div className="text-white/50">当前时期: {currentPeriod}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapLayout;