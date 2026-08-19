# qixi-roses - Work Plan

## TL;DR (For humans)

**你会得到什么**：一个七夕浪漫网页——打开后是深蓝夜空下 7 朵 Three.js 3D 玫瑰组成的一捧花束，含苞绽放入场、镜头缓推、花瓣飘落、星光闪烁、光晕呼吸、缓慢自转；主标题「许如意」配渐变描边，两行诗「星河为笺，玫瑰为证 / 世间美好，皆如你意」与「丙午年七月初七 · 2026.8.19」依次浮现；点击/触摸任意处迸发爱心。交付物是**单个自包含 index.html**（所有代码内联，无任何外部请求），双击即可打开，也直接可推 GitHub Pages（部署由你自己做）。

**为什么这样设计**：空仓库从零构建；Three.js 3D 是「高级感」送礼页的主流路线（你选定）；esbuild 本地打包内联解决 Three.js 新版 ESM-only 与国内 CDN 不稳的问题；WebGL 不可用时自动降级为 CSS 玫瑰，保证任何设备都能看。

**它不会做什么**：不部署、不 git 提交（按你的规则）、无背景音乐、无外部字体、无后端，也没有 README 文档——只产出网页本身。

**工作量与风险**：3 个波次共 14 个实现任务 + 4 项终验；主要风险是 3D 玫瑰的美观度与移动端性能，已通过确定性种子、设备降档、agent 浏览器 QA 兜底。预计中等规模（一个下午量级）。

**已定决策**：Three.js 3D 玫瑰（你选）；单文件交付、无部署步骤（你选，自行推 Pages）；默认唯美文案（你选，文案已定稿）；无音乐；系统字体；点击爱心彩蛋。

## Scope

### In scope
- 交付物：根目录**单个自包含 `index.html`**（CSS/JS/Three.js 全内联，零外部请求，双击可开，可直接推 GitHub Pages）。
- 工程文件：`package.json`（依赖 `three`、`esbuild`）、`src/main.js`、`src/style.css`、`src/template.html`、`build.mjs`（esbuild 打包 + 内联 → 产出根目录 `index.html`）。
- 视觉核心：Three.js 3D 玫瑰花束——程序化生成 7 朵玫瑰（七夕之七），分层螺旋花瓣、花蕊、花萼、茎叶刺，错落组装成「一捧」，束口捆扎；深蓝夜空/星云背景。
- 高级动效：入场绽放（含苞→盛开 + 镜头缓推 + 文字层淡入）、飘落花瓣粒子、星光粒子、光晕呼吸、镜头慢自转、鼠标/触摸视差、点击/轻触任意处爱心粒子迸发。
- 文案（已定稿，worker 不得改词）：`<title>`=七夕 · 致许如意；主标题=许如意；副诗=「星河为笺，玫瑰为证 / 世间美好，皆如你意」；日期行=丙午年七月初七 · 2026.8.19；提示=点击任意处，有惊喜。
- 鲁棒性：WebGL 不可用 → 2D 降级（CSS 玫瑰 + 简化粒子 + 同套文案）；手机端 DPR 上限、粒子/玫瑰数量按设备降档；尊重 `prefers-reduced-motion`；控制台零报错、零外部请求。
- 测试策略：无单元测试框架；每 todo 自带 agent 浏览器 QA（**必须用 agent-browser cli，禁用 dev-browser**，用户 AGENTS.md 规则 2）+ 用户本地双击人工复核。

### Out of scope（Must-NOT）
- 不做任何部署步骤/命令（用户自行推 GitHub Pages）。
- 不执行任何 git 提交/推送（用户 AGENTS.md 规则 1；Commit 行一律「无」）。
- 不引入背景音乐/音频。
- 不引入 webfont（仅系统字体栈：KaiTi, STKaiti, SimSun, Microsoft YaHei, serif）。
- 不引入除 three/esbuild 外的依赖（不用 OrbitControls/postprocessing 等 addons——镜头手写，光晕用 canvas 径向渐变 Sprite 模拟）。
- 不创建 README 或任何文档文件。
- 不做后端/存储/统计等一切超出静态页的内容。

## Verification strategy

- 每 todo 验收 = agent 可执行的检查（命令/断言/文件内容/浏览器截图），零人工判断。
- 浏览器 QA 统一入口：agent-browser cli。桌面 1920x1080 + 移动 375x667 各跑一遍；检查渲染、动效、点击爱心、控制台零报错、网络零外部请求、截图留档 `.omo/qa/<编号>.png`。
- 降级验证：以 `--disable-webgl` 参数（或浏览器设置）禁用 WebGL 后重开，确认 2D 降级完整。
- 最终完成证明 = F1-F4 终验波全部 APPROVE。
- 环境注意（用户规则 3/7）：Windows 11 x64 用 cmd；`npm install` 超时换镜像 `--registry=https://registry.npmmirror.com` 或重试，不无限等待。

## Execution strategy

依赖矩阵（N → N' 表示 N 完成后才做 N'）：
- 1 → 2 → 3 → 4 → 5 → 6（构建链 → 页面结构 → 场景 → 单株玫瑰 → 花束 → 材质）
- 6 → 7 → 8 → 9（场景就绪：入场 → 粒子 → 交互）
- 7 → 10（文字层动画与入场时序联调）
- 9 → 11 → 12（降级 → 适配）
- 12 → 13 → 14（全量 QA → 交付检查）
- F1-F4 终验波并行，全部 APPROVE 才算完成。

3 个波次（Wave 1: 1-6；Wave 2: 7-10；Wave 3: 11-14），波内顺序执行（单场景强耦合，不并行改同一文件）。每 todo 完成后立即跑 QA 留证据。

技术要点（已决策，worker 照此实现）：
- three 版本：npm 最新稳定（r160+ ESM-only，由 esbuild 打包）。
- `build.mjs`：esbuild JS API `build({entryPoints:['src/main.js'], bundle:true, minify:true, format:'iife', write:false})`，将输出 JS 与 `src/style.css` 内联进 `src/template.html` 占位符 `<!--INLINE_JS-->` / `<!--INLINE_CSS-->`，写出根目录 `index.html`；产物不得引用任何外部 URL。
- 玫瑰几何：花瓣=自定义 BufferGeometry（12x6 分段平面，沿长向贝塞尔卷曲、沿宽向外展；内层 5 片×3 层半径 0.12/0.18/0.26 螺旋错位 72°/36°，外层 6 片×2 层半径 0.34/0.42）；花蕊=12 根短圆柱+球头（黄）；花萼=5 片小曲面（绿）；茎=TubeGeometry+CatmullRomCurve3（4 控制点 2 弯曲，半径 0.02）；叶=4-6 片椭圆片对折交错；刺=2-4 锥体。随机由确定性 PRNG `mulberry32(seed)`，全局 seed=20260819，保证每次构建一致。
- 材质：花瓣 MeshStandardMaterial（DoubleSide、transparent、opacity 0.92、roughness 0.45、metalness 0、红 #d42b4e→深红 #8f1530 渐变，用顶点色或两色混合）；茎叶 #2e7d32 系；花蕊 #f5c542；光晕=canvas 径向渐变纹理 Sprite（AdditiveBlending）。
- 光照：HemisphereLight（#3a4a7a/#1a1030）+ 主 DirectionalLight 暖白 #fff2d8 强度 1.2 + 补光冷蓝 #4a6bd4 强度 0.4；`toneMapping=ACESFilmicToneMapping`。
- 镜头：PerspectiveCamera fov 50，位于 (0,1.2,6.5) 看向 (0,0.9,0)；慢自转 yaw += dt*0.05 绕花束中心；鼠标视差指针偏移 lerp ±0.35。
- 粒子：飘落花瓣=每株 60-120 片小平面（低档减半），带旋转与正弦飘荡，出视口重置顶部；星光=THREE.Points 800-1600 点（低档减半），AdditiveBlending，顶点 alpha 正弦闪烁。调试钩子统一：__animState / __particleStats（含 petalY0）/ __interactStats（含 activeHearts, heartY0）/ __bouquetInfo / __degraded / __deviceInfo / __fps，全部在 3D 与降级两路径都可用。
- 入场序列（约 2.5s，performance.now 时间轴手写 tween）：0-0.8s 遮罩渐隐；0.3-1.5s 花束 scale 0→1 + 花瓣层从闭合外翻；0.8-2.2s 镜头 z 8→6.5 缓推；1.2-2.5s 名字→诗→日期依次淡入。
- 爱心迸发：独立 2D canvas 覆盖层（fixed、inset 0、pointer-events none），点击/触摸从触点迸发 16-24 个爱心，重力下落+渐隐，1.2s 生命周期，max 200 粒子池。
- 降级：try webgl2||webgl 失败 → 隐藏 #scene 显示 #fallback2d（CSS 玫瑰：border-radius 花瓣 div 旋转层叠 + 茎叶伪元素 + CSS 飘落粒子），跳过全部 3D 代码。
- 设备档位：low = innerWidth<768 || hardwareConcurrency<=4；DPR = min(devicePixelRatio, low?1.5:2)；prefers-reduced-motion 时跳过粒子/自转/视差/爱心，入场改瞬时。

## Todos

### Wave 1 - 基建与 3D 玫瑰花束

- [x] 1. 构建链：根目录创建 `package.json`（scripts.build=node build.mjs，依赖 three+esbuild）并 npm install（超时换 npmmirror 镜像）；创建 `build.mjs`（esbuild JS API 打包 src/main.js 为 IIFE minify 产物，读入 src/style.css，替换 src/template.html 的 <!--INLINE_JS--> 与 <!--INLINE_CSS--> 占位符，写出根目录 index.html）；创建最小 src/main.js（仅 console.log('qixi-roses init')）、src/style.css、src/template.html（<!DOCTYPE html><html lang=zh-CN>，viewport meta 含 viewport-fit=cover，title=七夕 · 致许如意，body 含占位符）。
  - References: 自建 build.mjs；esbuild API https://esbuild.github.io/api/#build ；npmmirror https://npmmirror.com
  - Acceptance: `npm run build` 退出码 0；index.html 含打包后 JS/CSS 原文、无 <!--INLINE_ 残留、无任何 http(s):// 或 src=/href= 外部引用；file:// 打开 console 出现 qixi-roses init。
  - QA happy: 构建后 findstr 检查 index.html 含 qixi-roses init 且不含 <!--INLINE_（证据 .omo/qa/01-build.txt）。
  - QA failure: 删除 node_modules 后构建应报模块缺失错误而非产出坏文件（证据 .omo/qa/01-build-fail.txt，随后重装恢复）。
  - Commit: 无（用户自行部署，AGENTS.md 规则 1）

- [x] 2. 页面结构：src/template.html 补全 body——#scene（3D canvas 容器）、#fallback2d（隐藏，2D 降级容器）、#overlay（文字层：#name=许如意、#poem=两行诗、#date=日期行、#hint=点击任意处，有惊喜）、#hearts（爱心 2D canvas，pointer-events none）、#intro（入场遮罩）。src/style.css 全套：body 深蓝夜空渐变 linear-gradient(#0b1026,#1a1030,#0b1026)；#overlay 居中，系统字体栈 KaiTi/STKaiti/SimSun/Microsoft YaHei/serif；#name 用 clamp(3rem,10vw,6rem)，background-clip:text 渐变（#ffd9a0→#ff7eb3）+ text-shadow 光晕；#poem clamp(1.2rem,3.5vw,2rem) 字距 0.2em；#date #9aa5c4；#intro 渐隐动画；#fallback2d 的 CSS 玫瑰与飘落粒子样式；@media (max-width:768px) 文字层上移 + env(safe-area-inset-*) padding；prefers-reduced-motion 关闭动画。
  - References: 自建 style.css；background-clip MDN https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip ；env() https://developer.mozilla.org/en-US/docs/Web/CSS/env
  - Acceptance: 构建后 index.html 含全部结构与类名；agent-browser 桌面+375x667 截图 .omo/qa/02-dom.png：#overlay 可见、#name 显示许如意、深蓝背景、无横向滚动条。
  - QA happy: agent-browser 断言 document.querySelectorAll('#name,#poem,#date,#hint,#hearts,#intro').length===6（证据 .omo/qa/02-dom-check.txt）。
  - QA failure: 删除 #hearts 后构建，断言应失败（证据输出），恢复后通过。
  - Commit: 无

- [x] 3. Three.js 场景初始化：src/main.js 中 WebGL 检测（try { canvas.getContext('webgl2')||('webgl') } catch → null）；null → 隐藏 #scene 显示 #fallback2d 并跳过 3D；否则 WebGLRenderer（antialias、setPixelRatio(DPR)、setSize(innerWidth,innerHeight)、ACESFilmicToneMapping）、Scene（背景=canvas 生成的 512x512 夜空渐变+星点纹理）、PerspectiveCamera(50,aspect,0.1,100) 位于 (0,1.2,6.5) 看向 (0,0.9,0)、HemisphereLight+主/补 DirectionalLight（参数见 Execution strategy）、resize 监听重设 size/aspect。
  - References: threejs.org/docs/#api/en/renderers/WebGLRenderer 、/scenes/Scene 、/cameras/PerspectiveCamera 、/lights/DirectionalLight ；版本以 npm ls three 为准
  - Acceptance: agent-browser 打开，#scene canvas 存在且 width/height 与视口×DPR 相符；渲染 3 秒无异常；控制台零报错；resize 到 375 宽后 canvas 同步变化。
  - QA happy: evaluate 读 canvas.width 断言>0；控制台无 error 级条目（证据 .omo/qa/03-console.txt + .omo/qa/03-scene.png）。
  - QA failure: 临时注释 resize 监听后重跑，resize 后尺寸应不变（预期失败），恢复后通过。
  - Commit: 无

- [x] 4. 单株玫瑰几何：实现 `createRose(seed)`：花瓣 BufferGeometry（12x6 分段，沿长向贝塞尔卷曲、沿宽向外展；内层 5 片×3 层半径 0.12/0.18/0.26 螺旋错位 72°/36°，外层 6 片×2 层半径 0.34/0.42）；花蕊 12 根 CylinderGeometry(0.008,0.012,0.12)+SphereGeometry(0.02) 顶球（黄 #f5c542 临时色）；花萼 5 片小曲面（绿）；茎 TubeGeometry+CatmullRomCurve3 4 控制点 2 弯曲半径 0.02；叶 4-6 片椭圆片对折+旋转 30-60° 沿茎交错；刺 2-4 个 ConeGeometry。随机值全部由 mulberry32(seed)（全局 seed=20260819）生成；返回 THREE.Group。本 todo 用临时灰白材质便于检查几何，正式材质在 todo 6。
  - References: threejs.org/docs/#api/en/core/BufferGeometry 、/geometries/TubeGeometry 、/extras/curves/CatmullRomCurve3 ；mulberry32 标准实现 https://github.com/bryc/code/blob/master/jshash/PRNGs.md
  - Acceptance: createRose(seed) 返回 Group 且 children.length>=8；同 seed 两次调用 position.array 完全一致（确定性）；页面渲染出可辨识玫瑰轮廓。
  - QA happy: agent-browser evaluate 暴露钩子 window.__roseInfo() 断言 children>=8，且两次调用返回相同 position 摘要哈希（证据 .omo/qa/04-geometry.txt + .omo/qa/04-rose.png 截图可见轮廓）。
  - QA failure: 换 seed=0 后两次哈希应不同（证明 PRNG 生效），恢复 20260819 后一致。
  - Commit: 无

- [x] 5. 花束组装：用 createRose 生成 7 株玫瑰（七夕之七），在 Group 内错落排布：中心 1 株略高、周围 6 株绕中心环列（半径 0.5-0.8、高度差 0.2-0.4、各自绕 Y 随机旋转、轻微外倾 5-15°），根部聚拢到 (0, 0.05, 0) 附近；用 2-3 个细长圆柱或 TubeGeometry 模拟束口捆扎（#8d6e63 棕），可选 3 片包装叶；整体 Group 位置 (0,0.9,0)。提供 window.__bouquetInfo() 返回 {roseCount, totalMeshes, nanFree}（nanFree=遍历所有 geometry position 数组无 NaN/Infinity）。
  - References: threejs.org/docs/#api/en/math/Vector3 、/objects/Group ；自建 src/main.js
  - Acceptance: __bouquetInfo().roseCount===7 且 totalMeshes>=50 且 nanFree===true；渲染无报错、无黑屏；前/侧/俯三角度截图渲染完整。
  - QA happy: agent-browser evaluate __bouquetInfo() 断言 roseCount===7、totalMeshes>=50、nanFree===true；旋转相机到 3 个角度（每角度暂停 0.5s）截图 .omo/qa/05-bouquet-{front,side,top}.png，agent 用 Read 工具查看 3 张截图确认花束完整无穿帮、无黑屏。
  - QA failure: 将 roseCount 常量改 6 后断言应失败（预期失败），恢复 7 后通过。
  - Commit: 无

- [x] 6. 材质与质感：替换 todo 4/5 临时材质——花瓣 MeshStandardMaterial（DoubleSide、transparent、opacity 0.92、roughness 0.45、metalness 0、红 #d42b4e→深红 #8f1530：用顶点色渐变或内外层两色）；茎叶 #2e7d32 roughness 0.6；花萼 #3e8e41；花蕊 #f5c542；刺 #6d8f4e。光晕：canvas 生成 128x128 径向渐变（白→暖粉→透明）纹理，2-3 个 Sprite（AdditiveBlending、scale 1.5-2.5）置于花束中心与两侧，材质 opacity 随正弦呼吸（0.35-0.6）。统一材质工厂函数 createRoseMaterials() 供 createRose 复用，避免每株重建纹理。
  - 遗留动作 A 已完成（2026-08-19 Atlas）：petal 材质恢复 vertexColors:true（移除 DIAGNOSTIC 残留）；构建 744KB；__bouquetInfo {roseCount:7,totalMeshes:459,nanFree:true}；像素分析红色 16800 vs 绿 563（红主导确认）；证据 .omo/qa/06-materials.txt+png。
  - 遗留动作 B（worker 下次运行时补）：ledger.jsonl 追加 todo 6 完成事件（本次 Prometheus 模式无法写非 .md 文件）。
  - References: threejs.org/docs/#api/en/materials/MeshStandardMaterial 、/objects/Sprite 、/textures/CanvasTexture ；自建 src/main.js
  - Acceptance: 花束呈现红粉渐变花瓣+绿色茎叶+暖黄花蕊+柔和光晕；材质实例数=7 株×固定类型（无每片花瓣独立材质）；呼吸光晕 opacity 周期变化；控制台零报错。
  - QA happy: agent-browser evaluate 断言花瓣材质 opacity===0.92、DoubleSide、sprite 数 2-3；间隔 1.5s 两次读取光晕 sprite opacity 值不同（呼吸生效）（证据 .omo/qa/06-materials.txt + .omo/qa/06-glow.png 截图可见光晕）。
  - QA failure: 将光晕呼吸写死为常量后两次读取应相同（预期失败），恢复正弦后通过。
  - Commit: 无

### Wave 2 - 动效与交互

- [x] 7. 入场绽放动画：performance.now 时间轴手写 tween（约 2.5s，easeInOutCubic）：0-0.8s #intro 遮罩 opacity 1→0（CSS transition 亦可，但必须与 3D 时间轴同步）；0.3-1.5s 花束 Group scale 0.01→1 + 花瓣各层从闭合角外翻到展开角（每层存 baseRotation，动画时叠加 -70°→0° 回弹）；0.8-2.2s 相机 z 8→6.5 缓推；1.2-2.5s 文字层 #name→#poem→#date 依次 opacity 0→1 上移 20px 归位；#hint 在 2.5s 后淡入并轻微呼吸。动画期间暂停自转（todo 9 引入），结束后恢复。暴露 window.__animState() 返回 {phase, progress}。
  - 阻塞已解除（2026-08-19 /start-work 恢复 worker 模式；todo 1-6 已验证勾选）。
  - 已完成（2026-08-19 Atlas 验证）：实现落地（initEntrance/updateEntrance 接入 animate；遮罩 JS 驱动、花束 scale+花瓣 -70° 外翻 easeOutBack、相机 z 8→6.5、文字 1.2/1.6/2.0s 依次、hint 2.5s 后呼吸、reduced-motion 瞬时完成、entranceDone 标志）；构建 563KB；__animState 采样 camera 0.437→done 1（progress 单调递增、3s 内 done）；证据 .omo/qa/07-anim.txt+07-t30.png。
  - References: 自建 src/main.js；ease 函数标准实现 https://easings.net/
  - Acceptance: 打开页面 3s 内完成完整入场序列，无跳变、无闪烁；遮罩在 0.8s 前后消失；花束由小变大且花瓣展开；文字依次浮现；控制台零报错。
  - QA happy: agent-browser 打开页面后分别在 t=0.5s/1.5s/3s 读取 __animState() 与截屏（.omo/qa/07-t05.png、07-t15.png、07-t30.png），断言 progress 递增且 3s 后 phase===done；agent 用 Read 工具查看 3 张截图，确认遮罩由实变虚、花束由小变大（截图人工复核仅作佐证，程序化断言为主）。
  - QA failure: 把相机 z 写死为 6.5（无缓推）后，t=1s 与 t=2s 的 z 应相同（预期失败），恢复后通过。
  - Commit: 无

- [x] 8. 粒子系统：飘落花瓣=每株 60-120 片小平面（低档设备减半，见 Execution strategy 设备档位），用 canvas 生成 32x32 粉色花瓣纹理（两色渐变），PlaneGeometry 随机大小 0.04-0.09，初始随机 x/z/高度，每帧下落 vy 0.3-0.6 + 正弦横漂 + 自身旋转，y<-2 时重置到顶部；共用一个 InstancedMesh 或独立 Mesh 池（优先 InstancedMesh 控制 draw call）。星光=THREE.Points 800-1600（低档减半），随机球壳分布半径 3-8，PointsMaterial size 0.02-0.05、transparent、AdditiveBlending、顶点 alpha 正弦闪烁（更新 attribute 或 shader 简单实现）。暴露 window.__particleStats() 返回 {petals, stars, petalY0}（petalY0=第一片花瓣当前世界 y 坐标）。
  - 遗留动作 C 已完成（2026-08-19 Atlas 验证）：构建 571KB；__particleStats {petals:469, stars:1551}；petalY0 三采样 -0.506/0.386/-0.089（下落运动确认）；__fps 56.7→59.9（桌面≥45）；failure 测试 pvy=0 → petalY0 两次相同（预期失败确认）→ 已恢复；证据 .omo/qa/08-particles.txt+png+fail.txt。
  - References: threejs.org/docs/#api/en/objects/InstancedMesh 、/objects/Points 、/materials/PointsMaterial 、/textures/CanvasTexture
  - Acceptance: 花瓣持续飘落并循环重置（间隔 0.5s 两次读取 petalY0 应不同）；星光闪烁；粒子数量按设备档位降档；控制台零报错。
  - QA happy: evaluate __particleStats() 断言 petals>0 且 stars>0；间隔 0.5s 两次读取 petalY0 断言不等（位置位移程序化证明，无需看图）；帧率程序化采样：暴露 __fps() 返回最近 2s 平均 fps，断言桌面>=45、低档>=30（证据 .omo/qa/08-particles.txt + 截图 .omo/qa/08-particles.png）。
  - QA failure: 将飘落速度写 0 后两次 petalY0 应相同（预期失败），恢复后通过。
  - Commit: 无

- [x] 9. 交互与环境动效：镜头慢自转（每帧 yaw+=dt*0.05 绕花束中心，入场动画期间暂停）；鼠标视差（pointermove 记录归一化偏移，相机 x/z lerp ±0.35，touch 用 touchmove 同样处理）；光晕呼吸（todo 6 已含，此处联调节奏 2.5s 周期）；点击/轻触任意处爱心迸发：2D canvas #hearts（fixed inset 0 pointer-events none，独立 requestAnimationFrame 或并入主循环），从触点迸发 16-24 个爱心（贝塞尔绘制或 canvas arc 拼心形），初速随机 2-5、重力 -6、摩擦 0.98、渐隐，1.2s 生命周期，粒子池上限 200（超限丢弃最旧）；prefers-reduced-motion 时跳过自转/视差（爱心保留但减半）。暴露 window.__interactStats() 返回 {heartsSpawned, activeHearts, heartY0}（heartY0=第一颗活跃爱心当前 y 坐标；无活跃爱心时 heartY0=null）。
  - 已完成（2026-08-19，快速通道）：实现落地且审查通过（自转 entranceDone 门控、视差 lerp、呼吸 2.513 rad/s、贝塞尔心形精灵、池 200 上限、__yaw/__interactStats 钩子）；构建 574169 bytes 通过。浏览器交互验证由用户手动执行（用户指示）。
  - References: 自建 src/main.js；PointerEvent https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent ；prefers-reduced-motion https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
  - Acceptance: 页面静止时花束缓慢自转（间隔 1s 两次读取相机 yaw 不同）；鼠标移动相机有视差；点击/触摸屏幕任意处迸发爱心并下落渐隐（点击后 0.3s 与 1.0s 两次 heartY0 不同）；爱心粒子池不超 200；控制台零报错。
  - QA happy: agent-browser 模拟 click 于 (300,400)，0.3s 后 evaluate __interactStats() 断言 heartsSpawned>=16 且 activeHearts>0 且 heartY0!=null；再等 0.7s 断言 heartY0 变化（下落）；连续点击 20 次后断言 activeHearts<=200（证据 .omo/qa/09-hearts.txt + 截图 .omo/qa/09-hearts.png）。
  - QA failure: 把迸发数量写 0 后点击应无爱心（heartsSpawned 不增，预期失败），恢复后通过。
  - Commit: 无

- [ ] 10. 文字层动画与文案定稿：确保模板与样式最终呈现：<title>七夕 · 致许如意；#name=许如意；#poem 两行「星河为笺，玫瑰为证」/「世间美好，皆如你意」（<br> 分隔或两 span）；#date=丙午年七月初七 · 2026.8.19；#hint=点击任意处，有惊喜。文字动画与入场序列（todo 7）联调：名字先现（1.2s）、诗逐行（1.6s/2.0s）、日期 2.4s、提示 2.5s+呼吸；prefers-reduced-motion 时全部瞬时显示。检查字体栈在 Windows 楷体/雅黑与移动端渲染正常，无乱码（UTF-8 meta）。
  - References: 自建 src/template.html + src/style.css；UTF-8 https://developer.mozilla.org/en-US/docs/Glossary/UTF-8
  - Acceptance: 截图可见全部文案按顺序浮现、内容逐字正确（与定稿一致）；#name 渐变描边生效；移动端 375 宽无截断；控制台零报错。
  - QA happy: agent-browser 桌面+375x667 截图 .omo/qa/10-text-desktop.png / 10-text-mobile.png；evaluate 读取 #name.textContent 断言===许如意、#date 含 2026.8.19、#poem 含 星河为笺 与 皆如你意（.omo/qa/10-text-check.txt）。
  - QA failure: 临时把 #name 文本改错字后断言应失败（预期失败），恢复定稿文本后通过。
  - Commit: 无

### Wave 3 - 降级、适配与交付

- [ ] 11. WebGL 检测与 2D 降级：src/main.js 入口先做 WebGL 检测（todo 3 已有雏形，此处完善）：try { const c=document.createElement('canvas'); gl=c.getContext('webgl2')||c.getContext('webgl'); } catch(e){ gl=null }；gl 为 null 时：隐藏 #scene、显示 #fallback2d、运行 2D 降级渲染（CSS 玫瑰：3-5 个 .css-rose 元素，每个由 8-10 片 border-radius 50% 花瓣 div 旋转层叠成花 + 茎（border 伪元素）+ 叶；CSS 飘落花瓣粒子 10-20 个 span 随机动画；星光用 box-shadow 星点或 radial-gradient 背景；#hearts 爱心照常工作；入场与文字动画照常）；所有 window.__* 调试钩子在降级模式下也要存在（返回降级态标志 __degraded()===true）。
  - References: 自建 src/style.css（.css-rose 等类）；WebGL 检测最佳实践 https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detecting_WebGL
  - Acceptance: 正常浏览器 3D 路径不变；禁用 WebGL 后打开：#fallback2d 可见、#scene canvas 隐藏、CSS 玫瑰与粒子渲染、点击爱心仍工作、控制台零报错。
  - QA happy: 降级触发方式（按可用性二选一）：(a) agent-browser 启动参数禁用 WebGL（如 --disable-webgl / chrome://flags）；(b) 若 cli 不支持，用 agent-browser 在页面加载前注入脚本覆盖 `HTMLCanvasElement.prototype.getContext` 使 webgl/webgl2 返回 null 后再打开。截图 .omo/qa/11-fallback.png 可见 CSS 玫瑰；evaluate __degraded()===true 且 #hearts 点击后仍迸发（.omo/qa/11-degraded.txt）。
  - QA failure: 把降级分支改为抛异常（模拟实现错误）后禁用 WebGL 打开应报错（预期失败），恢复后通过。
  - Commit: 无

- [ ] 12. 适配与性能收口：DPR 上限（low 档 1.5 / 高 2）；resize 节流（150ms）与 orientationchange 处理；移动端安全区（env(safe-area-inset-*) 用于 #overlay padding）；文字层在竖屏 375x667 与横屏不重叠（用媒体查询调整 #overlay 布局：横屏时文字偏右、花束偏左，或竖屏居中）；iOS Safari 100vh 问题（用 100dvh 或 JS 计算）；prefers-reduced-motion 全动画关闭；长按/双击缩放禁用（touch-action manipulation）；低档设备粒子/花瓣/玫瑰数量降档生效（粒子数、飘落片数减半，星光 800）；控制台零报错。暴露 window.__deviceInfo() 返回 {dpr, cap, tier}（cap=实际生效的 DPR 上限，tier=low|high）。
  - References: 自建 src/style.css + src/main.js；viewport units https://developer.mozilla.org/en-US/docs/Web/CSS/length#Viewport_units ；touch-action https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
  - Acceptance: 桌面 1920x1080、移动 375x667、横屏 667x375 三档渲染正常、无滚动条、文字不重叠、动效流畅；__deviceInfo().cap 与 tier 匹配档位规则；控制台零报错。
  - QA happy: agent-browser 三档视口截图 .omo/qa/12-{desktop,mobile,landscape}.png + evaluate 断言无横向滚动（document.documentElement.scrollWidth<=innerWidth）、__deviceInfo().cap===2（桌面档）与移动档 cap===1.5、__particleStats() 按档位降档（.omo/qa/12-adapt.txt）。
  - QA failure: 把 cap 常量写错（如低档 2.5）后 __deviceInfo().cap 断言应失败（预期失败），恢复后通过。
  - Commit: 无

- [ ] 13. 全量 QA（agent-browser）：覆盖桌面+移动+横屏三视口：打开页面完整看 6s（入场→自转→粒子→文字）；点击爱心 20 次；滚动/缩放无异常；控制台零报错（收集 console 全部级别）；网络零外部请求（Performance API 检查所有 resource entries，断言无 http/https 资源）；file:// 直接打开（不经本地服务器）同样工作；3D 与降级两路径各跑一遍；所有截图与检查文本存入 .omo/qa/ 下（13-*.png / 13-*.txt）。
  - References: agent-browser cli（用户 AGENTS.md 规则 2：禁用 dev-browser）；Performance API https://developer.mozilla.org/en-US/docs/Web/API/Performance_API
  - Acceptance: 上述全部断言通过；QA 证据文件齐全（截图 6+ 张、检查文本 4+ 份）；无未覆盖项。
  - QA happy: 全流程执行一遍，输出 QA 报告 .omo/qa/13-report.txt（断言清单+通过/失败）。
  - QA failure: 人为在 main.js 注入 console.error 后 QA 应能捕获（预期失败），移除后通过。
  - Commit: 无

- [ ] 14. 交付检查与收尾：最终产物检查——根目录 index.html 为唯一交付物且自包含（无外部引用）；文件体积报告（index.html 大小，目标 <1.5MB）；源码文件齐全（package.json、build.mjs、src/*）；`npm run build` 可重复构建且产物与上次一致（可选 diff 抽查）；删除临时/调试代码（console.log 调试、window.__* 钩子按需保留或移除——保留 __degraded 与 __particleStats 便于用户后续自检，其余移除）；无冗余文件（node_modules 不入交付、.omo 不入交付说明）；最终向用户报告：交付物路径、打开方式、部署提示（用户自行推 GitHub Pages）、QA 摘要。
  - References: 自建文件清单；AGENTS.md 规则 1（不提交）、规则 5（无冗余代码）
  - Acceptance: index.html 存在且 <1.5MB、零外部 URL；`findstr /s /i "http" index.html` 无命中（除注释外零外部引用）；无调试 console.log 残留（保留的除外）；报告交付。
  - QA happy: 执行上述检查命令输出证据 .omo/qa/14-final.txt；打开页面最后确认（截图 14-final.png）。
  - QA failure: 若 index.html 含外部引用或体积超标则修复并重验（证据记录）。
  - Commit: 无（用户自行部署）

## Final verification wave

全部并行，全部 APPROVE 才可宣告完成；每项输出证据到 .omo/qa/final-*。

- [ ] F1. 计划符合性审计：逐条核对 todos 1-14 的 Acceptance 是否全部满足，QA 证据文件是否齐全（.omo/qa/ 下 01-14 全部存在），有无跳过/漏做项。
  - 证据: .omo/qa/final-F1.txt（逐 todo 核对清单）
- [ ] F2. 代码质量评审：src/* 与 build.mjs 无冗余代码、无死代码、无未用变量、无错误代码；材质/几何无重复创建；命名一致；不破坏其他功能（本页为独立页，检查页面自身完整性）；与用户 AGENTS.md 规则 5 对齐。
  - 证据: .omo/qa/final-F2.txt（评审记录）
- [ ] F3. 真实手动 QA（agent-browser 扮演）：实际打开最终 index.html（file:// 与本地服务器两种方式），完整浏览：入场动效、花束 3D、粒子、爱心交互、文字文案；桌面+移动视口；控制台零报错；网络零外部请求；截图 4+ 张并用 Read 工具逐一查看确认视觉效果（无黑屏、无穿帮、文字完整）。
  - 证据: .omo/qa/final-F3-*.png + final-F3.txt（含 Read 查看结论）
- [ ] F4. 范围保真：对照 Scope 检查——交付物=单个 index.html；无部署步骤；无 git 提交；无音乐/webfont/额外依赖/README；文案与定稿逐字一致；无超出范围的附加功能。
  - 证据: .omo/qa/final-F4.txt（范围核对清单）

## Commit strategy

- 全程**无 git 提交、无推送**（用户 AGENTS.md 规则 1：没有明确的 git 提交或 push 指令，不擅自提交；部署由用户自行推 GitHub Pages）。
- 工作区保持：package.json、package-lock.json、build.mjs、src/、index.html（构建产物）、.omo/（计划与 QA 证据）。

## Success criteria

1. 打开 index.html（file:// 或部署后）即见：深蓝夜空下 7 朵 3D 玫瑰组成的一捧花束，含苞绽放入场，镜头缓推，花瓣与星光粒子环绕，光晕呼吸，缓慢自转，鼠标视差。
2. 文案完整且与定稿逐字一致：许如意 / 星河为笺，玫瑰为证 / 世间美好，皆如你意 / 丙午年七月初七 · 2026.8.19 / 点击任意处，有惊喜。
3. 点击/触摸任意处迸发爱心粒子。
4. 桌面与手机（含横屏）渲染正常，无滚动条、无重叠、无截断；低档设备自动降档仍流畅。
5. WebGL 禁用时优雅降级为 CSS 玫瑰，全部功能（文案/爱心/入场）仍可用。
6. 控制台零报错、网络零外部请求；单文件 <1.5MB。
7. F1-F4 终验全部 APPROVE。
8. 全程无 git 提交、无部署动作（用户自行部署）。
