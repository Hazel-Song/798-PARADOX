# 快照系统修复总结

## 修复时间
2025-11-21

## 修复的问题

### ✅ 问题1: 快照数据不完整

#### 问题描述
快照中缺少关键状态：
- `publicOpinionHeat` - 舆论热度值
- `isGovernmentActive` - 政府角色激活状态
- `governmentInputs` - 政府输入文本列表
- `studioCircles[].evaluationResult` - 圆形评估结果

#### 修复方案

**1. 扩展PeriodSnapshot接口**

文件：`src/types/periodSnapshot.ts`

```typescript
export interface PeriodSnapshot {
  periodId: string;
  timestamp: number;
  commentTags: CommentTag[];
  studioAreas: string[];
  studioCircles: StudioCircleData[];
  artistPositions: ArtistPosition[];
  areaVitality: number;
  gridTagCounts: Record<string, number>;
  publicOpinionHeat: number;           // 新增
  isGovernmentActive: boolean;         // 新增
  governmentInputs: string[];          // 新增
}

export interface StudioCircleData {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  gridKey: string;
  createdAt: number;
  evaluationResult?: 'demolish' | 'passed'; // 新增
}
```

**2. 更新保存快照逻辑**

文件：`src/components/ui/MapLayout.tsx:838-892`

```typescript
const saveCurrentPeriodSnapshot = () => {
  // ... 省略前面的代码

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
      createdAt: circle.createdAt,
      evaluationResult: circle.evaluationResult // 保存评估结果
    })),
    artistPositions,
    areaVitality: commentTags.length,
    gridTagCounts,
    publicOpinionHeat: publicOpinionHeat, // 新增
    isGovernmentActive: isGovernmentActive, // 新增
    governmentInputs: [...governmentInputs] // 新增
  };

  // ...
};
```

**3. 更新恢复快照逻辑**

文件：`src/components/ui/MapLayout.tsx:894-946`

```typescript
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

  // 恢复工作室圆形（包含评估结果）
  if (studioCirclesRef.current) {
    const restoredCircles: StudioCircle[] = snapshot.studioCircles.map(circle => ({
      ...circle,
      isAnimating: false,
      evaluationResult: circle.evaluationResult // 恢复评估结果
    }));
    studioCirclesRef.current.setCircles(restoredCircles);
  }

  // ... gridTagCounts恢复

  // 恢复舆论热度
  setPublicOpinionHeat(snapshot.publicOpinionHeat);

  // 恢复政府激活状态
  setIsGovernmentActive(snapshot.isGovernmentActive);

  // 恢复政府输入
  setGovernmentInputs(snapshot.governmentInputs);

  // 恢复UI checkedItems
  setCheckedItems(prev => ({
    ...prev,
    government: snapshot.isGovernmentActive
  }));

  console.log('✅ Period snapshot restored completely');
};
```

#### 修复效果

| 数据字段 | 修复前 | 修复后 |
|---------|--------|--------|
| publicOpinionHeat | ❌ 恢复后重置为0 | ✅ 正确恢复 |
| isGovernmentActive | ❌ 恢复后重置为false | ✅ 正确恢复 |
| governmentInputs | ❌ 恢复后清空 | ✅ 正确恢复 |
| evaluationResult | ❌ 恢复后全部丢失 | ✅ 正确恢复（demolish/passed状态） |

---

### ✅ 问题3: GridSystem标签计数未恢复

#### 问题描述
快照中保存了`gridTagCounts`，但恢复时未实际恢复到GridSystem，标记为TODO。

#### 修复方案

**1. 添加GridSystem.restoreTagCounts方法**

文件：`src/lib/map-grid/GridSystem.ts:370-374`

```typescript
// 恢复标签计数（用于快照恢复）
public restoreTagCounts(counts: Map<string, number>): void {
  this.tagCounts = new Map(counts);
  console.log('🔄 GridSystem: Tag counts restored');
}
```

**2. 在恢复快照时调用**

文件：`src/components/ui/MapLayout.tsx:920-928`

```typescript
// 恢复网格标签计数
if (gridSystemRef.current && snapshot.gridTagCounts) {
  const tagCountsMap = new Map<string, number>();
  Object.entries(snapshot.gridTagCounts).forEach(([key, count]) => {
    tagCountsMap.set(key, count);
  });
  gridSystemRef.current.restoreTagCounts(tagCountsMap);
  console.log('✅ Grid tag counts restored:', snapshot.gridTagCounts);
}
```

#### 修复效果

- ✅ 网格标签计数正确恢复
- ✅ studioAreas生成逻辑数据准确
- ✅ 控制台输出恢复日志

---

### ✅ 问题4: 回退对话框文本硬编码

#### 问题描述
对话框message固定为"系统将清空2002-2006阶段的全部历史，是否确认回退到1995-2002阶段？"，未根据实际点击的periodId动态生成。

#### 修复方案

**1. 添加confirmDialogMessage状态**

文件：`src/components/ui/MapLayout.tsx:140`

```typescript
const [confirmDialogMessage, setConfirmDialogMessage] = useState<string>('');
```

**2. 动态生成对话框文本**

文件：`src/components/ui/MapLayout.tsx:978-1004`

```typescript
const handlePeriodChange = (periodId: string) => {
  console.log(`🔄 Period change requested: ${currentPeriodId} -> ${periodId}`);

  const currentPeriodIndex = timelineData.periods.findIndex(p => p.id === currentPeriodId);
  const targetPeriodIndex = timelineData.periods.findIndex(p => p.id === periodId);

  // 如果是向前跳转（回到过去的时期），并且当前时期是period-2或更晚
  if (targetPeriodIndex < currentPeriodIndex && currentPeriodIndex >= 1) {
    // 生成动态对话框文本
    const currentPeriod = timelineData.periods[currentPeriodIndex];
    const targetPeriod = timelineData.periods[targetPeriodIndex];
    const nextPeriod = timelineData.periods[targetPeriodIndex + 1];

    const message = `系统将清空${currentPeriod.years}阶段的全部历史，恢复到${targetPeriod.years}阶段结束时的状态，并跳转到${nextPeriod?.years || '未知'}阶段。是否确认回退？`;

    // 显示确认弹窗
    setPendingPeriodId(periodId);
    setConfirmDialogMessage(message);
    setIsConfirmDialogOpen(true);
    console.log('⚠️ Backward time travel detected, showing confirmation dialog');
    return;
  }

  // 正常的时期切换（向前或同时期）
  performPeriodChange(periodId);
};
```

**3. 使用动态message**

文件：`src/components/ui/MapLayout.tsx:1100-1108`

```typescript
<ConfirmDialog
  isOpen={isConfirmDialogOpen}
  title="时期回退确认"
  message={confirmDialogMessage}  // 使用动态message
  confirmText="确认回退"
  cancelText="取消"
  onConfirm={handleConfirmBackwardTravel}
  onCancel={handleCancelBackwardTravel}
/>
```

#### 修复效果

**示例对话框文本**：

| 当前时期 | 点击节点 | 生成的对话框文本 |
|---------|---------|----------------|
| Period-3 | Period-1 | "系统将清空2006-2010阶段的全部历史，恢复到1995-2002阶段结束时的状态，并跳转到2002-2006阶段。是否确认回退？" |
| Period-3 | Period-2 | "系统将清空2006-2010阶段的全部历史，恢复到2002-2006阶段结束时的状态，并跳转到2006-2010阶段。是否确认回退？" |
| Period-4 | Period-1 | "系统将清空2010-2017阶段的全部历史，恢复到1995-2002阶段结束时的状态，并跳转到2002-2006阶段。是否确认回退？" |

---

## 修改的文件清单

| 文件 | 修改内容 | 行数变化 |
|-----|---------|---------|
| `src/types/periodSnapshot.ts` | 扩展PeriodSnapshot和StudioCircleData接口 | +4 |
| `src/components/ui/MapLayout.tsx` | 保存和恢复快照逻辑更新 | +30 |
| `src/lib/map-grid/GridSystem.ts` | 添加restoreTagCounts方法 | +5 |

## 测试建议

### 测试场景1: 完整快照保存和恢复

1. 进入Period-1，生成50个commentTags
2. 自动切换到Period-2（保存period-1快照）
3. 政府评估10个圆形（5个demolish, 5个passed）
4. publicOpinionHeat达到20，自动切换到Period-3（保存period-2快照）
5. 在Period-3点击时间轴的1995-2002节点
6. 确认对话框文本正确显示
7. 确认回退，验证：
   - ✅ 恢复period-1的50个commentTags
   - ✅ 所有圆形为未评估状态
   - ✅ publicOpinionHeat = 0
   - ✅ isGovernmentActive = false
   - ✅ UI显示2002-2006

### 测试场景2: Period-2快照恢复

1. 在Period-3点击2002-2006节点
2. 确认对话框文本正确显示period-2和period-3
3. 确认回退，验证：
   - ✅ 恢复period-2结束时的commentTags
   - ✅ 圆形的evaluationResult正确恢复（demolish/passed）
   - ✅ publicOpinionHeat = 20
   - ✅ isGovernmentActive = true
   - ✅ governmentInputs正确恢复
   - ✅ UI显示2006-2010

### 测试场景3: GridSystem标签计数

1. 查看网格单元的标签计数
2. 执行快照回退
3. 验证标签计数正确恢复
4. 检查控制台日志：`✅ Grid tag counts restored`

---

## 相关文档

- [SNAPSHOT_SYSTEM_ANALYSIS.md](SNAPSHOT_SYSTEM_ANALYSIS.md) - 快照系统深度分析
- [PERIOD2_ANALYSIS.md](PERIOD2_ANALYSIS.md) - Period-2行为与样式分析
- [CLAUDE.md](CLAUDE.md) - 项目整体文档

---

## 后续优化建议

虽然问题1、3、4已修复，但仍有优化空间：

### 优化1: 艺术家位置恢复（问题2）
快照中保存了`artistPositions`，但恢复时未使用。建议添加：

```typescript
// 在WanderingCharacter中添加setPosition方法
snapshot.artistPositions.forEach(artistPos => {
  const artist = artists.find(a => a.id === artistPos.id);
  if (artist?.ref.current) {
    artist.ref.current.setPosition(artistPos.x, artistPos.y);
  }
});
```

### 优化2: 快照持久化（问题5）
使用localStorage持久化快照：

```typescript
const saveSnapshotToStorage = (periodId: string, snapshot: PeriodSnapshot) => {
  const key = `798-snapshot-${periodId}`;
  localStorage.setItem(key, JSON.stringify(snapshot));
};
```

### 优化3: 快照版本控制
添加版本号支持向后兼容：

```typescript
export interface PeriodSnapshot {
  version: string; // "1.0.0"
  // ...
}
```

---

**修复完成时间**: 2025-11-21
**测试状态**: 待测试
**部署状态**: 开发服务器运行中（http://localhost:3000）
