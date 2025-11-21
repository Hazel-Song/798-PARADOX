# 快照系统深度分析

## 目录
1. [快照数据结构](#1-快照数据结构)
2. [快照保存机制](#2-快照保存机制)
3. [快照恢复机制](#3-快照恢复机制)
4. [数据清除机制](#4-数据清除机制)
5. [时期转换完整流程](#5-时期转换完整流程)
6. [关键状态变量](#6-关键状态变量)
7. [快照回退操作](#7-快照回退操作)
8. [潜在问题与优化](#8-潜在问题与优化)

---

## 1. 快照数据结构

### 1.1 PeriodSnapshot 接口
**文件**: `src/types/periodSnapshot.ts`

```typescript
export interface PeriodSnapshot {
  periodId: string;           // 当前时期ID (如 'period-1')
  timestamp: number;           // 快照创建时间戳
  commentTags: CommentTag[];  // 所有评论标签的完整状态
  studioAreas: string[];      // 工作室区域网格key数组 (如 ['0-0', '1-2'])
  studioCircles: StudioCircleData[];  // 工作室圆形数据
  artistPositions: ArtistPosition[];  // 所有艺术家位置
  areaVitality: number;       // 区域活力值 (等于commentTags.length)
  gridTagCounts: Record<string, number>;  // 每个网格的标签计数
}
```

### 1.2 快照中包含的子数据结构

#### StudioCircleData
```typescript
{
  id: string;          // 圆形唯一ID
  centerX: number;     // 圆心X坐标
  centerY: number;     // 圆心Y坐标
  radius: number;      // 半径
  gridKey: string;     // 所属网格key
  createdAt: number;   // 创建时间戳
}
```
**注意**: 快照中**不包含** `evaluationResult` 和 `isAnimating`

#### ArtistPosition
```typescript
{
  id: string;    // 艺术家ID (如 'artist-1')
  x: number;     // X坐标
  y: number;     // Y坐标
}
```

#### CommentTag（完整状态）
```typescript
{
  id: string;
  position: { x: number; y: number };
  content: { sight: string; thought: string };
  keywords: string[];
  timestamp: number;
  characterId: string;
  evaluationResult?: 'demolish' | 'passed';
  isProtestTag?: boolean;
}
```

### 1.3 快照存储结构
```typescript
const [periodSnapshots, setPeriodSnapshots] = useState<Map<string, PeriodSnapshot>>(new Map());
```
- **存储方式**: React state中的Map
- **键**: periodId (如 'period-1', 'period-2')
- **值**: PeriodSnapshot对象
- **生命周期**: 与组件生命周期一致，刷新页面后丢失

---

## 2. 快照保存机制

### 2.1 保存函数
**文件**: `src/components/ui/MapLayout.tsx:839-888`

```typescript
const saveCurrentPeriodSnapshot = () => {
  if (!gridSystemRef.current) return;

  console.log('💾 Saving period snapshot for:', currentPeriodId);

  // 1. 收集所有艺术家位置
  const artistPositions = artists.map(artist => {
    const position = artist.ref.current?.getCurrentPosition() || { x: 0, y: 0 };
    return { id: artist.id, x: position.x, y: position.y };
  });

  // 2. 获取工作室圆形数据
  const studioCircles = studioCirclesRef.current?.getCircles() || [];

  // 3. 获取网格标签计数
  const gridTagCountsMap = gridSystemRef.current.getAllTagCounts();
  const gridTagCounts: Record<string, number> = {};
  gridTagCountsMap.forEach((count, key) => {
    gridTagCounts[key] = count;
  });

  // 4. 创建快照对象
  const snapshot: PeriodSnapshot = {
    periodId: currentPeriodId,
    timestamp: Date.now(),
    commentTags: [...commentTags],  // 深拷贝
    studioAreas: Array.from(studioAreas),  // Set转数组
    studioCircles: studioCircles.map(circle => ({
      id: circle.id,
      centerX: circle.centerX,
      centerY: circle.centerY,
      radius: circle.radius,
      gridKey: circle.gridKey,
      createdAt: circle.createdAt
      // 注意：不包含 evaluationResult 和 isAnimating
    })),
    artistPositions,
    areaVitality: commentTags.length,
    gridTagCounts
  };

  // 5. 保存到Map
  setPeriodSnapshots(prev => {
    const newSnapshots = new Map(prev);
    newSnapshots.set(currentPeriodId, snapshot);
    console.log('✅ Snapshot saved:', snapshot);
    return newSnapshots;
  });
};
```

### 2.2 保存时机

#### 时机1: Period 1 → Period 2 自动切换
**触发条件**: `commentTags.length >= 50`
**代码位置**: `MapLayout.tsx:442-459`

```typescript
useEffect(() => {
  if (commentTags.length >= 50 && currentPeriodId === 'period-1') {
    console.log(`🚀 Auto-transitioning to next period!`);

    // 保存period-1的快照
    saveCurrentPeriodSnapshot();

    // 切换到period-2
    setCurrentPeriodId('period-2');
    setMaxUnlockedPeriodIndex(1);
    setIsGovernmentActive(true);
  }
}, [commentTags.length, currentPeriodId]);
```

**快照内容**:
- 50+个commentTags（艺术家评论）
- 若干studioAreas（≥2标签的网格）
- 对应的studioCircles（未评估状态）
- 艺术家位置
- 网格标签计数

#### 时机2: Period 2 → Period 3 自动切换
**触发条件**: `publicOpinionHeat >= 20`
**代码位置**: `MapLayout.tsx:462-478`

```typescript
useEffect(() => {
  if (publicOpinionHeat >= 20 && currentPeriodId === 'period-2') {
    console.log(`🚀 Auto-transitioning from period2 to period3!`);

    // 保存period-2的快照
    saveCurrentPeriodSnapshot();

    // 切换到period-3
    setCurrentPeriodId('period-3');
    setMaxUnlockedPeriodIndex(2);
  }
}, [publicOpinionHeat, currentPeriodId]);
```

**快照内容**:
- Period-1遗留的commentTags + Period-2新增的
- 被政府demolish的圆形（橙红色点阵）
- 被政府passed的圆形（橙色斜线填充）
- passed区域内的抗议标签（粉色）
- publicOpinionHeat达到20
- 政府评估记录

#### 时机3: Period 3 → Period 4 自动切换
**触发条件**: `publicOpinionHeat >= 50`
**代码位置**: `MapLayout.tsx:481-495`

```typescript
useEffect(() => {
  if (publicOpinionHeat >= 50 && currentPeriodId === 'period-3') {
    console.log(`🚀 Auto-transitioning from period3 to period4!`);

    // 保存period-3的快照
    saveCurrentPeriodSnapshot();

    // 切换到period-4
    setCurrentPeriodId('period-4');
    setMaxUnlockedPeriodIndex(3);
  }
}, [publicOpinionHeat, currentPeriodId]);
```

### 2.3 保存的数据特点

| 数据类型 | 是否深拷贝 | 特殊处理 |
|---------|-----------|---------|
| commentTags | ✅ `[...commentTags]` | 完整保留所有字段 |
| studioAreas | ✅ `Array.from(studioAreas)` | Set转数组 |
| studioCircles | ✅ `map(...)` | **移除**evaluationResult和isAnimating |
| artistPositions | ✅ `map(...)` | 从ref中实时获取位置 |
| gridTagCounts | ✅ `forEach(...)` | Map转Object |

**重要**: 快照中的studioCircles**不包含政府评估结果**，恢复时所有圆形都恢复为"未评估"状态

---

## 3. 快照恢复机制

### 3.1 恢复函数
**文件**: `src/components/ui/MapLayout.tsx:890-919`

```typescript
const restorePeriodSnapshot = (periodId: string) => {
  const snapshot = periodSnapshots.get(periodId);
  if (!snapshot) {
    console.warn('⚠️ No snapshot found for period:', periodId);
    return;
  }

  console.log('📂 Restoring period snapshot:', snapshot);

  // 1. 恢复评论标签
  setCommentTags(snapshot.commentTags);

  // 2. 恢复工作室区域
  setStudioAreas(new Set(snapshot.studioAreas));

  // 3. 恢复工作室圆形
  if (studioCirclesRef.current) {
    const restoredCircles: StudioCircle[] = snapshot.studioCircles.map(circle => ({
      ...circle,
      isAnimating: false  // 恢复的圆形不需要动画
      // 注意：没有恢复evaluationResult，默认为undefined（未评估）
    }));
    studioCirclesRef.current.setCircles(restoredCircles);
  }

  // 4. TODO: 恢复网格标签计数
  // if (gridSystemRef.current) {
  //   // 需要GridSystem支持restoreTagCounts方法
  // }

  console.log('✅ Period snapshot restored');
};
```

### 3.2 恢复后的数据状态

#### 恢复的数据
- ✅ **commentTags**: 完全恢复，包括isProtestTag、evaluationResult等所有字段
- ✅ **studioAreas**: 完全恢复
- ✅ **studioCircles**: 恢复位置和大小，但**evaluationResult丢失**

#### 不恢复的数据
- ❌ **artistPositions**: 快照中有记录，但**未使用**（艺术家位置不恢复）
- ❌ **gridTagCounts**: 快照中有记录，但**未实现恢复逻辑**（TODO）
- ❌ **publicOpinionHeat**: 不在快照中，恢复后重置为0
- ❌ **governmentInputs**: 不在快照中，恢复后清空
- ❌ **isGovernmentActive**: 不在快照中，恢复后设为false

### 3.3 恢复逻辑的重要特性

**StudioCircles恢复为"未评估"状态**:
```typescript
const restoredCircles: StudioCircle[] = snapshot.studioCircles.map(circle => ({
  ...circle,
  isAnimating: false
  // evaluationResult: undefined (未明确设置，默认为未评估)
}));
```

**影响**:
- 所有圆形恢复后显示为**浅黄色虚线 + 点阵填充**（未评估状态）
- passed区域**不再是restricted zone**
- demolish状态**丢失**
- 政府可以重新评估这些圆形

---

## 4. 数据清除机制

### 4.1 清除函数
**文件**: `src/components/ui/MapLayout.tsx:922-948`

```typescript
const clearCurrentPeriodData = () => {
  console.log('🧹 Clearing current period data');

  // 1. 清空核心数据
  setCommentTags([]);
  setStudioAreas(new Set());
  setDemolishedProtestPositions({});

  // 2. 清空工作室圆形
  if (studioCirclesRef.current) {
    studioCirclesRef.current.setCircles([]);
  }

  // 3. 清空网格标签计数 (TODO)
  // if (gridSystemRef.current) {
  //   gridSystemRef.current.clearAllTagCounts();
  // }

  // 4. 清空政府相关状态
  setPublicOpinionHeat(0);
  setGovernmentInputs([]);
  setIsGovernmentActive(false);
  setCheckedItems(prev => ({ ...prev, government: false }));

  // 5. 重置政府角色
  if (wanderingGovernmentRef.current) {
    wanderingGovernmentRef.current.pause();
  }

  console.log('🧹 Government states cleared for period rollback');
};
```

### 4.2 清除时机

**唯一调用位置**: 快照回退操作（`handleConfirmBackwardTravel`）

### 4.3 清除范围

| 数据类型 | 清除方式 | 清除后的状态 |
|---------|---------|------------|
| commentTags | `setCommentTags([])` | 空数组 |
| studioAreas | `setStudioAreas(new Set())` | 空Set |
| demolishedProtestPositions | `setDemolishedProtestPositions({})` | 空对象 |
| studioCircles | `setCircles([])` | 空数组 |
| publicOpinionHeat | `setPublicOpinionHeat(0)` | 0 |
| governmentInputs | `setGovernmentInputs([])` | 空数组 |
| isGovernmentActive | `setIsGovernmentActive(false)` | false |
| checkedItems.government | `setCheckedItems({government: false})` | false |

**不清除的数据**:
- ❌ artistPositions（艺术家继续在原位置）
- ❌ gridSystemRef（网格系统保持）
- ❌ periodSnapshots（快照Map保留）
- ❌ maxUnlockedPeriodIndex（已解锁的时期保持）

---

## 5. 时期转换完整流程

### 5.1 正向自动切换流程

#### Period 1 → Period 2
```
[触发] commentTags.length >= 50
   ↓
[保存] saveCurrentPeriodSnapshot() → 保存period-1快照
   ↓
[切换] setCurrentPeriodId('period-2')
   ↓
[解锁] setMaxUnlockedPeriodIndex(1)
   ↓
[激活] setIsGovernmentActive(true)
   ↓
[显示] UI显示2002-2006，政府角色开始评估
```

**数据状态**:
- Period-1快照已保存（50个tags，未评估的circles）
- Period-2继承Period-1的所有数据
- 政府角色激活，开始评估studioCircles

#### Period 2 → Period 3
```
[触发] publicOpinionHeat >= 20
   ↓
[保存] saveCurrentPeriodSnapshot() → 保存period-2快照
   ↓
[切换] setCurrentPeriodId('period-3')
   ↓
[解锁] setMaxUnlockedPeriodIndex(2)
   ↓
[显示] UI显示2006-2010
```

**数据状态**:
- Period-2快照已保存（包含demolish/passed圆形，抗议标签）
- Period-3继承Period-2的所有数据
- 政府角色继续活跃（isGovernmentActive仍为true）
- Public Opinion Heat继续累积

#### Period 3 → Period 4
```
[触发] publicOpinionHeat >= 50
   ↓
[保存] saveCurrentPeriodSnapshot() → 保存period-3快照
   ↓
[切换] setCurrentPeriodId('period-4')
   ↓
[解锁] setMaxUnlockedPeriodIndex(3)
   ↓
[显示] UI显示2010-2017
```

### 5.2 快照回退流程

#### 在Period-3点击Period-1节点
```
[点击] 1995-2002节点
   ↓
[检测] targetIndex(0) < currentIndex(2) → 触发回退确认
   ↓
[弹窗] "系统将清空2002-2006阶段的全部历史，是否确认回退？"
   ↓
[确认] 用户点击"确认回退"
   ↓
[清除] clearCurrentPeriodData() → 清空当前所有数据
   ↓
[恢复] restorePeriodSnapshot('period-1') → 恢复period-1快照
   ↓
[切换] performPeriodChange('period-2') → UI显示period-2
   ↓
[结果] 数据状态：period-1结束时的状态
       UI显示：2002-2006 (period-2)
       政府角色：激活
```

**关键逻辑**:
```typescript
const targetIndex = timelineData.periods.findIndex(p => p.id === pendingPeriodId);
const nextPeriod = timelineData.periods[targetIndex + 1];

// 恢复点击时期的快照，UI显示其下一个时期
restorePeriodSnapshot(pendingPeriodId);
performPeriodChange(nextPeriod.id);
```

#### 在Period-3点击Period-2节点
```
[点击] 2002-2006节点
   ↓
[检测] targetIndex(1) < currentIndex(2) → 触发回退确认
   ↓
[弹窗] "系统将清空2002-2006阶段的全部历史，是否确认回退？"
   ↓
[确认] 用户点击"确认回退"
   ↓
[清除] clearCurrentPeriodData() → 清空当前所有数据
   ↓
[恢复] restorePeriodSnapshot('period-2') → 恢复period-2快照
   ↓
[切换] performPeriodChange('period-3') → UI显示period-3
   ↓
[结果] 数据状态：period-2结束时的状态（publicOpinionHeat=20时）
       UI显示：2006-2010 (period-3)
       政府角色：激活
```

### 5.3 回退操作的数据变化

#### 清除阶段
```
Before: Period-3当前状态
  - commentTags: 60个（含period-3新增）
  - publicOpinionHeat: 25
  - studioCircles: 15个（含passed/demolish状态）
  - isGovernmentActive: true

After clearCurrentPeriodData():
  - commentTags: []
  - publicOpinionHeat: 0
  - studioCircles: []
  - isGovernmentActive: false
```

#### 恢复阶段
```
Restore period-2 snapshot:
  - commentTags: 52个（period-2结束时的状态）
  - publicOpinionHeat: 0 (未恢复)
  - studioCircles: 12个（evaluationResult丢失，恢复为未评估）
  - isGovernmentActive: false (未恢复)
```

#### UI切换阶段
```
performPeriodChange('period-3'):
  - currentPeriodId: 'period-3'
  - UI显示: 2006-2010
  - 时间轴高亮: period-3节点
```

---

## 6. 关键状态变量

### 6.1 持久化状态（React State）

| 变量名 | 类型 | 生命周期 | 快照中 | 说明 |
|-------|------|---------|--------|------|
| `currentPeriodId` | string | 组件级 | ❌ | 当前显示的时期 |
| `maxUnlockedPeriodIndex` | number | 组件级 | ❌ | 最大已解锁的时期索引 |
| `commentTags` | CommentTag[] | 组件级 | ✅ | 所有评论标签 |
| `studioAreas` | Set<string> | 组件级 | ✅ | 工作室区域网格keys |
| `publicOpinionHeat` | number | 组件级 | ❌ | 舆论热度值 |
| `governmentInputs` | string[] | 组件级 | ❌ | 政府输入文本 |
| `isGovernmentActive` | boolean | 组件级 | ❌ | 政府角色是否激活 |
| `periodSnapshots` | Map | 组件级 | ⚠️ | 快照存储容器 |
| `demolishedProtestPositions` | Record | 组件级 | ❌ | 抗议标签粉色动画位置 |

### 6.2 引用状态（Refs）

| 变量名 | 类型 | 生命周期 | 快照中 | 说明 |
|-------|------|---------|--------|------|
| `gridSystemRef` | GridSystem | 组件级 | ⚠️ | 网格系统实例 |
| `studioCirclesRef` | StudioCirclesRef | 组件级 | ✅ | 工作室圆形控制器 |
| `wanderingGovernmentRef` | WanderingGovernmentRef | 组件级 | ❌ | 政府角色控制器 |
| `artists[].ref` | WanderingCharacterRef | 组件级 | ⚠️ | 艺术家控制器 |

### 6.3 子组件内部状态

#### WanderingGovernment内部
- `currentEvaluation`: 当前评估状态
- `evaluatedCircleIds`: 已评估的圆形IDs
- `overlayCircles`: 覆盖圆形
- `permanentComments`: 永久评论
- **清除时机**: period变化时自动清除（`shouldShow`监听）

#### StudioCircles内部
- `circles`: 圆形数组（通过ref暴露）
- **管理方式**: 外部通过ref控制（`setCircles`）

#### CommentTags内部
- `visibleTags`: 可见标签（过滤临时标签）
- `hiddenTags`: 隐藏标签集合
- `protestTextIndexes`: 抗议文本索引
- **数据源**: 完全由props传入，无内部持久化

---

## 7. 快照回退操作

### 7.1 回退触发条件
```typescript
// MapLayout.tsx:951-968
const handlePeriodChange = (periodId: string) => {
  const currentPeriodIndex = timelineData.periods.findIndex(p => p.id === currentPeriodId);
  const targetPeriodIndex = timelineData.periods.findIndex(p => p.id === periodId);

  // 如果是向前跳转（回到过去的时期），并且当前时期是period-2或更晚
  if (targetPeriodIndex < currentPeriodIndex && currentPeriodIndex >= 1) {
    // 显示确认弹窗
    setPendingPeriodId(periodId);
    setIsConfirmDialogOpen(true);
    return;
  }

  // 正常的时期切换（向前或同时期）
  performPeriodChange(periodId);
};
```

**触发条件**:
- 点击时期索引 < 当前时期索引
- 当前时期索引 >= 1 (即period-2或更晚)

### 7.2 回退确认对话框
```typescript
<ConfirmDialog
  isOpen={isConfirmDialogOpen}
  title="时期回退确认"
  message="系统将清空2002-2006阶段的全部历史，是否确认回退到1995-2002阶段？"
  confirmText="确认回退"
  cancelText="取消"
  onConfirm={handleConfirmBackwardTravel}
  onCancel={handleCancelBackwardTravel}
/>
```

**注意**: 对话框文本**硬编码**，未根据实际点击的时期动态调整

### 7.3 回退执行逻辑
```typescript
// MapLayout.tsx:1002-1028
const handleConfirmBackwardTravel = () => {
  console.log('✅ User confirmed backward time travel');
  setIsConfirmDialogOpen(false);

  const targetIndex = timelineData.periods.findIndex(p => p.id === pendingPeriodId);
  const nextPeriod = timelineData.periods[targetIndex + 1];

  console.log(`🔄 Restoring snapshot from ${pendingPeriodId}, UI will display at ${nextPeriod?.id}`);

  // 1. 清空当前时期数据
  clearCurrentPeriodData();

  // 2. 恢复目标时期的快照
  if (periodSnapshots.has(pendingPeriodId)) {
    restorePeriodSnapshot(pendingPeriodId);
  }

  // 3. UI切换到目标时期的下一个时期
  if (nextPeriod) {
    performPeriodChange(nextPeriod.id);
    console.log(`✅ Snapshot restored from ${pendingPeriodId}, UI now at ${nextPeriod.id}`);
  }
};
```

### 7.4 回退操作矩阵

| 当前时期 | 点击节点 | 恢复快照 | 清除数据 | UI切换到 | 政府激活 | 说明 |
|---------|---------|---------|---------|---------|---------|------|
| Period-2 | Period-1 | period-1 | ✅ | Period-2 | ✅ | 重新开始period-2 |
| Period-3 | Period-1 | period-1 | ✅ | Period-2 | ✅ | 从period-1数据重新体验 |
| Period-3 | Period-2 | period-2 | ✅ | Period-3 | ❌→需手动激活 | 回到period2→3切换时 |
| Period-4 | Period-1 | period-1 | ✅ | Period-2 | ✅ | 从period-1重新开始 |
| Period-4 | Period-2 | period-2 | ✅ | Period-3 | ❌→需手动激活 | 从period-2重新开始 |
| Period-4 | Period-3 | period-3 | ✅ | Period-4 | ❌→需手动激活 | 从period-3重新开始 |

### 7.5 回退后的状态重建

**问题**: 回退后某些状态需要重新激活

#### 例1: Period-3回退到Period-1快照
```typescript
// 恢复后的状态
currentPeriodId: 'period-2'
commentTags: 50个（period-1快照）
studioCircles: 未评估状态
publicOpinionHeat: 0
isGovernmentActive: false  // ❌ 应该是true

// 需要的状态
isGovernmentActive: true   // 因为进入period-2
checkedItems.government: true
```

**修复**: 在`performPeriodChange`中根据period自动激活政府

#### 例2: Period-3回退到Period-2快照
```typescript
// 恢复后的状态
currentPeriodId: 'period-3'
commentTags: 52个（period-2快照，publicOpinionHeat=20时）
publicOpinionHeat: 0       // ❌ 应该是20
isGovernmentActive: false  // ❌ 应该是true

// 期望的状态
publicOpinionHeat: 20      // 需要在快照中保存
isGovernmentActive: true   // 需要在快照中保存或自动激活
```

---

## 8. 潜在问题与优化

### 8.1 当前存在的问题

#### 问题1: 快照不完整
**现象**: 快照中缺少以下关键状态
- ❌ `publicOpinionHeat`
- ❌ `isGovernmentActive`
- ❌ `governmentInputs`
- ❌ `checkedItems.government`
- ❌ `studioCircles[].evaluationResult`

**影响**:
- 回退后需要重新累积publicOpinionHeat
- 政府状态需要手动重建
- 圆形评估结果丢失

**建议**:
```typescript
export interface PeriodSnapshot {
  // ... 现有字段
  publicOpinionHeat: number;           // 新增
  isGovernmentActive: boolean;         // 新增
  governmentInputs: string[];          // 新增
  studioCirclesEvaluation: Record<string, 'demolish' | 'passed'>;  // 新增
}
```

#### 问题2: 艺术家位置未恢复
**现象**: 快照保存了`artistPositions`，但恢复时未使用

**代码**:
```typescript
// 保存时
const artistPositions = artists.map(artist => {
  const position = artist.ref.current?.getCurrentPosition() || { x: 0, y: 0 };
  return { id: artist.id, x: position.x, y: position.y };
});

// 恢复时 - 未使用artistPositions
```

**影响**:
- 艺术家位置不回退
- 可能导致艺术家在不合理的位置（如在period-3的限制区域内）

**建议**:
```typescript
// 恢复时添加
snapshot.artistPositions.forEach(artistPos => {
  const artist = artists.find(a => a.id === artistPos.id);
  if (artist?.ref.current) {
    artist.ref.current.setPosition(artistPos.x, artistPos.y);
  }
});
```

#### 问题3: GridSystem标签计数未恢复
**现象**: 快照保存了`gridTagCounts`，但恢复时标记为TODO

**代码**:
```typescript
// 恢复网格标签计数（需要GridSystem支持）
// TODO: 如果GridSystem需要恢复标签计数，在这里添加逻辑
```

**影响**:
- 网格标签计数可能不准确
- 影响studioAreas的生成逻辑（虽然studioAreas本身有快照）

**建议**:
在GridSystem中添加恢复方法：
```typescript
class GridSystem {
  restoreTagCounts(counts: Record<string, number>) {
    this.tagCounts.clear();
    Object.entries(counts).forEach(([key, count]) => {
      this.tagCounts.set(key, count);
    });
  }
}
```

#### 问题4: 回退对话框文本硬编码
**现象**: 对话框message固定为"系统将清空2002-2006阶段的全部历史"

**代码**:
```typescript
<ConfirmDialog
  message="系统将清空2002-2006阶段的全部历史，是否确认回退到1995-2002阶段？"
  // 未根据实际点击的periodId动态生成
/>
```

**影响**:
- 在period-3点击period-1时，文本不准确
- 用户可能困惑

**建议**:
```typescript
const getBackwardTravelMessage = (currentPeriod: string, targetPeriod: string) => {
  const current = timelineData.periods.find(p => p.id === currentPeriod);
  const target = timelineData.periods.find(p => p.id === targetPeriod);
  return `系统将清空${current?.years}阶段的全部历史，是否确认回退到${target?.years}阶段？`;
};
```

#### 问题5: 快照存储在内存中
**现象**: `periodSnapshots`是React state，刷新页面后丢失

**影响**:
- 用户无法在刷新后恢复进度
- 无法实现"保存游戏"功能

**建议**:
- 使用localStorage持久化快照
- 添加"保存进度"/"加载进度"功能

```typescript
// 保存到localStorage
const saveSnapshotToStorage = (periodId: string, snapshot: PeriodSnapshot) => {
  const key = `798-snapshot-${periodId}`;
  localStorage.setItem(key, JSON.stringify(snapshot));
};

// 从localStorage加载
const loadSnapshotFromStorage = (periodId: string): PeriodSnapshot | null => {
  const key = `798-snapshot-${periodId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};
```

### 8.2 优化建议

#### 优化1: 自动状态重建
在`performPeriodChange`中根据period自动激活相关功能：

```typescript
const performPeriodChange = (periodId: string) => {
  console.log(`✅ Performing period change to: ${periodId}`);
  setCurrentPeriodId(periodId);

  // 自动激活政府（period-2及以后）
  const periodIndex = timelineData.periods.findIndex(p => p.id === periodId);
  if (periodIndex >= 1) {
    setIsGovernmentActive(true);
    setCheckedItems(prev => ({ ...prev, government: true }));
  } else {
    setIsGovernmentActive(false);
    setCheckedItems(prev => ({ ...prev, government: false }));
  }

  // 其他逻辑...
};
```

#### 优化2: 增量快照
当前每次切换都保存完整快照，可以优化为增量快照：

```typescript
interface IncrementalSnapshot {
  baseSnapshotId: string;
  changes: {
    addedTags: CommentTag[];
    removedTagIds: string[];
    evaluatedCircles: Record<string, 'demolish' | 'passed'>;
    // ...
  };
}
```

#### 优化3: 快照版本控制
添加快照版本号，支持向后兼容：

```typescript
export interface PeriodSnapshot {
  version: string;  // 如 "1.0.0"
  periodId: string;
  // ...
}
```

#### 优化4: 快照压缩
对于大量数据的快照，可以压缩存储：

```typescript
import pako from 'pako';

const compressSnapshot = (snapshot: PeriodSnapshot): string => {
  const json = JSON.stringify(snapshot);
  const compressed = pako.deflate(json, { to: 'string' });
  return btoa(compressed);
};

const decompressSnapshot = (compressed: string): PeriodSnapshot => {
  const decoded = atob(compressed);
  const decompressed = pako.inflate(decoded, { to: 'string' });
  return JSON.parse(decompressed);
};
```

---

## 9. 总结

### 9.1 快照系统的核心逻辑

**保存时机**:
- Period自动切换时（1→2, 2→3, 3→4）

**恢复时机**:
- 用户点击时间轴回退时

**关键规则**:
- 恢复**点击时期**的快照
- UI显示**点击时期的下一个时期**
- 清除当前所有数据后再恢复

### 9.2 数据流转图

```
Period-1 (1995-2002)
  ↓ commentTags.length >= 50
[保存period-1快照]
  ↓
Period-2 (2002-2006)
  - 继承period-1所有数据
  - 政府开始评估
  - publicOpinionHeat累积
  ↓ publicOpinionHeat >= 20
[保存period-2快照]
  ↓
Period-3 (2006-2010)
  - 继承period-2所有数据
  - publicOpinionHeat继续累积
  ↓ publicOpinionHeat >= 50
[保存period-3快照]
  ↓
Period-4 (2010-2017)
  - 继承period-3所有数据
```

**回退操作**:
```
Period-3 点击 Period-1
  ↓
[清除所有数据]
  ↓
[恢复period-1快照]
  ↓
[UI切换到period-2]
  ↓
从period-1数据状态重新体验
```

### 9.3 关键代码位置

| 功能 | 文件 | 行号 |
|-----|------|------|
| 快照类型定义 | periodSnapshot.ts | 4-13 |
| 保存快照 | MapLayout.tsx | 839-888 |
| 恢复快照 | MapLayout.tsx | 890-919 |
| 清除数据 | MapLayout.tsx | 922-948 |
| Period 1→2切换 | MapLayout.tsx | 442-459 |
| Period 2→3切换 | MapLayout.tsx | 462-478 |
| Period 3→4切换 | MapLayout.tsx | 481-495 |
| 回退触发 | MapLayout.tsx | 951-968 |
| 回退执行 | MapLayout.tsx | 1002-1028 |

### 9.4 最佳实践

1. **保存快照**:
   - 在period切换前调用`saveCurrentPeriodSnapshot()`
   - 确保所有关键状态都在snapshot中

2. **恢复快照**:
   - 先调用`clearCurrentPeriodData()`清除当前数据
   - 再调用`restorePeriodSnapshot(periodId)`恢复
   - 最后调用`performPeriodChange(nextPeriodId)`切换UI

3. **数据清除**:
   - 只在回退时清除
   - 不影响periodSnapshots本身

4. **状态重建**:
   - 在`performPeriodChange`中自动激活period相关功能
   - 或在snapshot中保存更多状态信息

---

**文档创建时间**: 2025-11-21
**项目版本**: 798 PARADOX v0.1.0
**作者**: Claude Code分析生成
