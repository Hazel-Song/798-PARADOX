# Period-2 (2002-2006) 行为与样式分析

## 概述
Period-2（对抗与命名阶段）是艺术家与政府首次产生互动的时期。本文档详细分析该时期所有角色的行为、留下的视觉痕迹以及样式转变逻辑。

---

## 一、艺术家行为 (WanderingCharacter)

### 1.1 基本移动行为
- **文件**: `src/components/ui/WanderingCharacter.tsx`
- **行为**:
  - 继续在12x8网格上自由游走
  - 使用TrajectorySystem进行路径规划
  - **新增限制**: 避开passed区域和政府正在评估的区域（restrictedZones）

### 1.2 评论标签生成
- **触发**: 每5秒自动触发AI评估（可配置）
- **过程**:
  1. 获取当前位置的关键词（从GridSystem）
  2. 调用OpenAI API生成艺术评论
  3. 创建CommentTag并添加到地图

### 1.3 抗议行为（Period-2特有）
- **触发条件**: 在passed区域内创建评论时
- **检测逻辑**:
  ```typescript
  // MapLayout.tsx:528-555
  const isInPassedZone = currentPeriodRef.current?.id === 'period-2' && studioCirclesRef.current
    ? studioCirclesRef.current.getCircles().some(circle => {
        if (circle.evaluationResult !== 'passed') return false;
        const distance = Math.sqrt(
          Math.pow(characterPosition.x - circle.centerX, 2) +
          Math.pow(characterPosition.y - circle.centerY, 2)
        );
        return distance < circle.radius;
      })
    : false;
  ```
- **结果**: 创建的标签被标记为 `isProtestTag: true`

---

## 二、政府行为 (WanderingGovernment)

### 2.1 激活条件
- **文件**: `src/components/ui/WanderingGovernment.tsx`
- **激活时机**: 当commentTags.length >= 50时，period-1自动切换到period-2，政府角色被激活
- **显示条件**:
  ```typescript
  const shouldShow = isActive && (currentPeriod === '2002-2006' || currentPeriod === '2006-2010');
  ```

### 2.2 移动与评估流程
1. **寻找目标**: 找到未被评估的工作室圆形（Studio Circle）
2. **直线移动**: 以速度3px/frame移动到圆心
3. **开始评估**:
   - 状态变为 'evaluating'
   - 停留在圆心位置
   - 显示打字机动画（政府输入文本）
   - 显示橙色扩展圆动画
4. **评估决策**:
   - **Demolish**: 移除圆心的艺术家标签，Public Opinion Heat +1
   - **Passed**: 圆心标签变为橙色，该区域成为restricted zone
5. **完成**: 移动到下一个目标

### 2.3 评估决策逻辑
- **规则**: 目前是简单的交替模式（demolish → passed → demolish...）
- **位置**: `WanderingGovernment.tsx:71`
  ```typescript
  const [nextResult, setNextResult] = useState<'demolish' | 'passed'>('demolish');
  ```

### 2.4 视觉元素
- **政府点**: 白色圆点，10px直径
- **轨迹**: 留下30秒消失的轨迹线（黑色，50%透明度）
- **评估动画**: 橙色扩展圆（从0扩展到80px）

---

## 三、CommentTags 样式系统

### 3.1 标签类型与视觉样式
**文件**: `src/components/ui/CommentTags.tsx`

#### 类型1: 普通艺术家标签（白色/米黄色）
- **条件**: `!isProtestTag && !inPassedZone`
- **视觉**:
  - 外层光晕: 白色，32px，30%透明度，blur-sm
  - 核心点: #FFF5DB（米黄色），8px，阴影 `0 0 10px 2px rgba(255, 245, 219, 0.6)`
  - 文字框: 白色/60%透明度，7px字号，backdrop-filter blur(4px)
  - 连接线: 18px高，白色/60%透明度
- **代码位置**: `CommentTags.tsx:273-314`

#### 类型2: Passed区域内的标签（黑色/橙色）
- **条件**: `!isProtestTag && inPassedZone && currentPeriod === '2002-2006'`
- **视觉**:
  - 外层光晕: #FF550F（橙色），32px
  - 核心点: **黑色**，8px，橙色阴影 `0 0 10px 2px rgba(255, 85, 15, 0.8)`
  - 特效: rippleColorChange动画（0.6s）
  - **无文字框显示**（被政府"passed"后隐藏评论）
- **z-index**: 30（提高以覆盖passed圆填充）
- **代码位置**: `CommentTags.tsx:295-314, 373-430`

#### 类型3: 抗议标签（粉色/红色）
- **条件**: `isProtestTag === true`
- **视觉**:
  - **核心结构**（从内到外）:
    1. 红色内圆: #E70014，3px直径，z-index 65
    2. 粉色主圆: #ec4899（pink-500），22px直径，z-index 60
       - 白色边框: 5px solid #ffffff
       - 复杂光晕: 白色外光晕 + 粉色内光晕混合
    3. 外轮廓圆: 56px直径，1px白色边框，z-index 55
  - **浮动粒子**: 2-5个粉色粒子（#F328A5），8px，环绕主圆25-40px距离
  - **粉色涟漪动画**: 三层扩展动画（60px/40px/80px），animate-ping
  - **文字框**: 白色背景，不透明，**红色文字**（#E70014），**加粗**
  - **连接线**: 粉色到白色渐变（从下到上）
  - **文字内容**: 随机抗议口号（从预设列表）
- **代码位置**: `CommentTags.tsx:295-333, 352-370, 404-428, 436-494`

### 3.2 抗议标签触发机制
```typescript
// MapLayout.tsx:528-616
// 1. 检测艺术家位置是否在passed区域
const isInPassedZone = currentPeriodRef.current?.id === 'period-2' && studioCirclesRef.current
  ? studioCirclesRef.current.getCircles().some(circle => {
      if (circle.evaluationResult !== 'passed') return false;
      const distance = Math.sqrt(
        Math.pow(characterPosition.x - circle.centerX, 2) +
        Math.pow(characterPosition.y - circle.centerY, 2)
      );
      return distance < circle.radius;
    })
  : false;

// 2. 创建标签时标记为抗议标签
const newCommentTag: CommentTag = {
  id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  position: characterPosition,
  content: { sight: evaluation.sight, thought: evaluation.thought },
  keywords: positionKeywords,
  timestamp: Date.now(),
  characterId: 'ARTIST',
  isProtestTag: isInPassedZone // 关键标记
};

// 3. 触发粉色涟漪动画
setDemolishedProtestPositions(prev => ({
  ...prev,
  [protestTag.id]: { x: protestTag.position.x, y: protestTag.position.y }
}));
```

### 3.3 标签生命周期
- **普通标签**: 8秒基础显示时间 + 每个后续标签增加3秒
- **抗议标签**: **永久显示**，不会自动消失
- **Passed区域标签**: 转为橙色圆点，评论文字被隐藏

---

## 四、StudioCircles 状态与样式

### 4.1 圆形生成
**文件**: `src/components/ui/StudioCircles.tsx`

- **触发条件**: 网格单元内有2个或以上commentTags
- **圆心位置**: 使用该网格第一个标签的位置
- **半径**:
  - Period-1: 100-250px（正常大小）
  - **Period-2**: 50-125px（**缩小至1/2**）
- **允许生成**: `allowNewCircles={currentPeriodId === 'period-1' || currentPeriodId === 'period-2'}`
- **代码位置**: `StudioCircles.tsx:97-108`

### 4.2 圆形状态与样式

#### 状态1: 未评估（默认）
- **轮廓**: #F9F0D3（浅黄色），1px，虚线 [4, 4]
- **填充**: 斜向点阵，#F9F0D3色，1.5px点，10px间距
- **透明度**: 100%（完全不透明）
- **展开动画**: 1秒easeOutCubic
- **代码位置**: `StudioCircles.tsx:258-299`

#### 状态2: Demolish（被拆除）
- **轮廓**: 无
- **填充**: 纯#FF550F（橙红色）点阵，更密集
- **透明度**: 100%（完全不透明）
- **效果**:
  - 圆心的艺术家标签被移除
  - Public Opinion Heat +1
  - 圆形保留但不再是restricted zone
- **代码位置**: `StudioCircles.tsx:175-204, MapLayout.tsx:686-760`

#### 状态3: Passed（通过审核）
- **底色**: #FF8126（橙色），30%透明度填充
- **轮廓**: #FF8126（橙色），1px，100%透明度
- **内部填充**: #FF8126斜线，45度角，8px间距，100%透明度
- **圆心点**: #FF8126，2px直径
- **效果**:
  - 圆心的艺术家标签变为**黑色圆点**（带橙色阴影）
  - 标签评论文字被隐藏
  - 整个圆形区域成为**restricted zone**（艺术家无法进入）
  - 艺术家在该区域内创建的新标签变为**抗议标签**
- **代码位置**: `StudioCircles.tsx:205-257, MapLayout.tsx:730-759`

---

## 五、Public Opinion Heat 系统

### 5.1 计数机制
- **初始值**: 0
- **增加条件**: 每次政府demolish一个studio，Heat +1
- **代码位置**: `MapLayout.tsx:728, WanderingGovernment.tsx:319-320`

### 5.2 触发效果
- **阈值**: publicOpinionHeat >= 20
- **效果**: 自动从period-2切换到period-3
- **代码位置**: `MapLayout.tsx:461-478`

### 5.3 UI显示
- **位置**: 左上角
- **显示条件**: `currentPeriodId === 'period-2' || currentPeriodId === 'period-3'`
- **样式**: 白色字体，半透明边框框
- **代码位置**: `MapLayout.tsx:1047-1056`

---

## 六、输入交互系统

### 6.1 功能
**文件**: `src/components/ui/InputInteractionSystem.tsx`

- **显示条件**: Period-2 和 Period-3
- **位置**: 地图左下角
- **功能**:
  - 用户输入文本（代表公众意见）
  - 输入的文本影响政府评估规则（理论上）
  - 实际使用打字机动画显示在政府评估时

### 6.2 打字机动画
- **位置**: 政府评估时显示在政府点上方
- **效果**: 循环显示用户输入的3条文本
- **速度**: 33ms/字符（打字），17ms/字符（删除）
- **暂停**: 打字后500ms，删除后200ms
- **代码位置**: `WanderingGovernment.tsx:111-159`

---

## 七、Period-2 到 Period-3 的关键差异点

### 7.1 需要修改的行为
根据period-3的描述（"Illusion of Freedom"，商业化、选择性展示），以下行为需要调整：

#### 艺术家行为变化
- [ ] **移动限制**: passed区域仍然限制，但可能有"quiet zones"（安静区域）
- [ ] **评论生成**: 可能需要不同的AI prompt，反映商业化压力
- [ ] **抗议行为**: 可能减少或改变形式（政府不再直接demolish）

#### 政府行为变化
- [ ] **评估方式**: "No longer clears artists but 'selectively displays' them"
- [ ] **Passed逻辑**: passed不再是完全限制，而是"controlled freedom"
- [ ] **Demolish逻辑**: 可能不再demolish，而是"designate art district"

#### 新角色: Visitor
- [ ] **新增Visitor角色**: "Chase hotspots, approach galleries (high-profile artists)"
- [ ] **消费行为**: 改变艺术区的意义（从creation到consumption）

### 7.2 样式修改建议

#### CommentTags样式
- [ ] **商业化标签**: 新增商业化标签类型（可能金色/商业色调）
- [ ] **抗议标签**: 减少或改变视觉强度（政府不再直接对抗）
- [ ] **Passed区域标签**: 改变逻辑（不再完全隐藏评论，而是"selective display"）

#### StudioCircles样式
- [ ] **Passed圆样式**: 可能改为"designated art district"样式（更官方、更商业化）
- [ ] **Demolish逻辑**: 可能移除demolish状态
- [ ] **新状态**: 可能需要"commercialized"状态（反映商业化）

#### 新增视觉元素
- [ ] **Visitor路径**: 游客移动轨迹
- [ ] **Gallery标记**: 高知名度艺术家位置标记
- [ ] **商业化区域**: 热门区域的视觉标识

---

## 八、代码文件清单

### 核心文件
1. **MapLayout.tsx** (1300+ lines) - 主容器，状态管理
   - 艺术家状态管理
   - 政府激活与评估处理
   - Period切换逻辑
   - Public Opinion Heat追踪
   - 抗议标签检测

2. **WanderingCharacter.tsx** - 艺术家角色
   - 移动与路径规划
   - AI评估触发
   - Restricted zones避让

3. **WanderingGovernment.tsx** - 政府角色
   - Studio评估流程
   - Demolish/Passed决策
   - 打字机动画
   - 橙色扩展圆动画

4. **CommentTags.tsx** - 标签视觉系统
   - 三种标签样式（普通/passed/抗议）
   - 粉色涟漪动画
   - 标签生命周期管理

5. **StudioCircles.tsx** - 工作室圆形系统
   - 圆形生成与动画
   - 三种状态样式（未评估/demolish/passed）
   - Canvas绘制

6. **InputInteractionSystem.tsx** - 输入系统
   - 用户输入收集
   - 打字机文本提供

### 支持库
7. **TrajectorySystem.ts** - 移动与路径规划
8. **GridSystem.ts** - 网格系统
9. **CharacterRenderer.ts** - 角色渲染
10. **AIEvaluationService.ts** - AI评估队列

---

## 九、Period-3修改优先级

### 高优先级（必须修改）
1. **政府行为逻辑**: 从demolish/passed改为"selective display"
2. **Visitor角色实现**: 新增游客移动与消费行为
3. **Passed区域语义**: 从"restricted"改为"designated/controlled"

### 中优先级（影响体验）
4. **商业化视觉元素**: 新增商业化标记和样式
5. **艺术家AI prompt**: 调整以反映商业化压力
6. **抗议标签逻辑**: 减少或改变触发条件

### 低优先级（优化细节）
7. **CommentTags样式微调**: 反映period-3氛围
8. **StudioCircles样式调整**: 新增商业化状态
9. **UI文案更新**: 反映period-3的语境

---

## 十、关键数值汇总

| 参数 | 数值 | 说明 |
|------|------|------|
| 艺术家评估间隔 | 5秒 | 可配置 |
| 艺术家移动速度 | 可变 | 由用户控制 |
| 政府移动速度 | 3px/frame | 固定 |
| 标签显示时间 | 8秒 + 3秒×后续标签数 | 动态 |
| 抗议标签显示 | 永久 | 不会消失 |
| Studio圆半径(P1) | 100-250px | 随机 |
| Studio圆半径(P2) | 50-125px | 缩小至1/2 |
| Passed圆透明度 | 30% | 底色 |
| Public Opinion阈值 | 20 | P2→P3切换 |
| 政府评估动画 | 橙色圆0-80px | 扩展动画 |
| 粉色涟漪圆 | 40/60/80px | 三层动画 |

---

## 总结

Period-2是整个系统中最复杂的时期，引入了：
- **政府角色**：主动评估与决策
- **对抗机制**：艺术家抗议 vs 政府管制
- **空间转变**：普通区域 → passed限制区 → 抗议场所
- **样式分化**：普通标签（白/米黄）→ passed标签（黑/橙）→ 抗议标签（粉/红）
- **舆论系统**：Public Opinion Heat追踪与period切换

这些元素在period-3需要重新解读：
- 对抗 → 共谋（complicity between government and capital）
- 限制 → 控制的自由（controlled freedom）
- 抗议 → 消费（从creation到consumption）
