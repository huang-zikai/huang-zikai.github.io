# Draft — qixi-layout（文字与玫瑰上下分离布局）

- slug: `qixi-layout`
- intent: **clear**
- review_required: **false**（无高精度修饰词）
- 用户决策：桌面宽屏**上下分离**（文字居上部、花束居下部中央）；移动端窄屏自动退化为上下错开
- 计划文件：`.omo/plans/qixi-layout.md`（待批准后创建）

## 问题根因（探索已确认，非推测）

1. `#overlay`（src/style.css:135-148）为 `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center` → 文字块永远位于**视口正中**。
2. 3D 相机（src/main.js:241-248）`camera.position.set(0,1.2,6.5)` + `camera.lookAt(0,0.9,0)`，花束 Group 位于 `(0,0.9,0)`（src/main.js:714）→ 花束投影位于**画面正中**。
3. 结论：桌面宽屏下文字块与花束上部花瓣必然相交重叠。
4. 降级路径：CSS 玫瑰在视口下半部（bottom 2%-14%，src/main.js:168-174），`#name` 居中时仍可能压到中间那朵玫瑰。
5. 移动端 768px 媒体查询仅 `translateY(-5vh)`（src/style.css:218），不足以错开。

## 已确认的几何参数

- 花束世界包围盒约 y∈[0.02,1.1]、半径≈0.6-0.8；相机 fov 50 @ z=6.5 → 画面半高≈3.03 世界单位
- 若 `lookAt` 改为 `(0,1.6,0)`：花束中心 y=0.9 相对画面中心下偏 0.7/3.03≈23%，花束底部偏下约 52% → 花束投影整体落入画面下半部
- 入场动画/视差只改 `camera.position`，不覆盖 `lookAt` → 相机角度调整零冲突

## 方案（决策-完备）

- T1. 文字层上移：`#overlay` `justify-content: center` → `flex-start`，`padding-top: calc(env(safe-area-inset-top) + 10vh)`（PC）/ `8vh`（移动 768px）；`align-items: center` 不变
- T2. 3D 相机 `lookAt(0,0.9,0)` → `lookAt(0,1.6,0)`（可微调 ±0.2，以三视口不重叠为准）；花束位置、自转、入场、视差全部不动
- T3. 降级路径：CSS 玫瑰 positions bottom 保持不变，核对文字上移后间隙；不足则玫瑰整体下沉 2-3vh 或 `#overlay` padding-top 增大
- T4. 防折叠：`#poem` 两 span 单行不折、`#date`/`#hint` 单行不折（320px 视口验证）；`#overlay` 子元素 `flex-shrink:0`；移动端字号/margin 收口
- T5. `node build.mjs` 重建 + 程序化断言（新样式生效、lookAt 新值、体积 <1.5MB）；浏览器 QA 按用户指示移交手动

## 边界（Must-NOT）

- 不改文案（template.html 定稿逐字不动）
- 不改花束几何/自转/入场/视差/爱心/粒子逻辑
- 不 git 提交、不部署、不加依赖

## Approval gate

- status: **awaiting-approval**
- 下一步：用户批准 → 创建 `.omo/plans/qixi-layout.md`（完整 todo + 验收 + QA + 终验波）
- 执行：另行 worker 会话（如 `$start-work`）