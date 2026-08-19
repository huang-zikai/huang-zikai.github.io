# qixi-roses - Draft (awaiting approval)

- slug: qixi-roses
- intent: **clear** (user knows the outcome: a romantic Qixi webpage, 3D rose bouquet + premium animations, dedicated to 许如意)
- review_required: **false** (no explicit high-accuracy modifier; CLEAR route offers it optionally after plan delivery)
- classification: **Standard** (single-file static page, 1-5 files, no existing infra)
- workspace_root: D:\MyLearning\MyWork\260818
- created: 2026-08-18
- scaffold: script not runnable in this session (no shell tool available); draft hand-written to match script-emitted structure. Plan skeleton after approval will also be hand-written with the verbatim template headers.

## Exploration summary (facts, cited)

1. Working directory is an EMPTY git repo: only `.git/` and `.codegraph/` (no source files). No tech stack, no constraints, greenfield. (read of D:\MyLearning\MyWork\260818)
2. 2026 Qixi = 2026-08-19 (Wednesday), 农历七月初七 — confirmed by web search (multiple sources: yinliyangli.com, chinese-lunar-calendar.com, businessweekly 2026 Qixi = Aug 19). Page will feature the date element.
3. Three.js current stable no longer ships UMD builds (r160+ ESM only) -> single-file delivery requires a bundling step (esbuild) or CDN. China network makes CDN unreliable -> inline everything via local bundling.
4. User AGENTS.md rules that constrain the plan: (1) no git commit/push without explicit instruction -> plan has NO commit steps, user deploys to GitHub Pages themselves; (2) browser QA must use agent-browser cli, never dev-browser; (3) Windows 11 x64, prefer cmd; (7) shell commands must have timeout awareness.

## Components ledger (topology lock)

| id | component | one-line outcome | status | evidence path |
|----|-----------|------------------|--------|---------------|
| C1 | 3D 玫瑰花束（Three.js 建模/材质/光照） | 一捧可旋转的 3D 立体玫瑰（花瓣分层螺旋排布，光影真实） | decided | src/main.js -> index.html, browser render |
| C2 | 高级动效系统 | 入场绽放动画 + 飘落花瓣 + 星光粒子 + 光晕呼吸 + 镜头环绕/鼠标视差 + 点击爱心迸发 | decided | browser visual QA (agent-browser) |
| C3 | 页面主题与排版 | 七夕氛围（夜空/星云背景）、"许如意"大标题 + 默认唯美文案 + 2026.8.19 日期 | decided | browser visual QA |
| C4 | 鲁棒性与适配 | WebGL 不可用时的 2D 降级、手机流畅（DPR 限制/粒子按设备降档）、prefers-reduced-motion、控制台零报错 | decided | agent-browser QA + console check |
| C5 | 交付物形态 | 单个自包含 index.html（CSS/JS/three 全部内联，零外部请求），用户自行部署 GitHub Pages | decided | file check + offline open test |

## Decisions (owner-decisions answered by user 2026-08-18)

1. **玫瑰实现**: Three.js 3D 立体玫瑰 + 高级动效（用户选）。带 2D 优雅降级（计划内保底）。
2. **交付方式**: 单个自包含 HTML 文件；用户**自己部署到 GitHub Pages，计划不含任何部署步骤**（用户自定义回答）。因此：所有依赖内联（含 three 本体，经 esbuild 打包内联），零外部网络请求。
3. **文案**: 默认唯美文案（用户选）——七夕主题浪漫短诗 + "许如意"名字 + "2026.8.19 七夕" 日期元素。
4. 采用默认（用户未反对即生效）：**无背景音乐**（无版权音频资产，保持单文件纯净）；**交互彩蛋**：点击/轻触页面任意处触发爱心粒子迸发；**文案字体**：系统字体栈（楷体/宋体/黑体），不引入 webfont 以保证离线可用。

## Test strategy (adopted default, confirm in approval)

- 无单元测试框架（纯静态单页礼物页）；QA = **agent 执行浏览器验证**（agent-browser cli，遵守 AGENTS.md 规则 2）+ 用户本地双击打开人工复核。
- 每 todo 带 happy + failure 双场景，证据路径 = 截图/控制台输出/文件内容检查。

## Approval gate

- status: **approved** (user replied 继续 to the approval brief on 2026-08-18)
- plan_path: .omo/plans/qixi-roses.md (written after approval; hand-written skeleton since no shell tool, template headers verbatim)
- Metis gap analysis: **done** (ses_febc8fdbaffempmeJzKPHvnQwi) — found duplicate stale Wave 2 block (deleted), missing-agent-executable acceptances on todos 5/7/8/9/11/12 (fixed: nanFree programmatic check, petalY0/heartY0/__fps/__deviceInfo programmatic assertions, Read-tool screenshot verification, getContext-override degradation trigger fallback), unvalidated agent-browser capabilities (mitigated with fallback triggers). All findings folded in.
- pending_action: deliver handoff explanation + ask ONE question (start work now, or high-accuracy review first) — CLEAR route with review_required=false.

## Wait rule

Brief presented once; wait for explicit user approval. Do not re-explore unless scope changes.
