# Learnings — qixi-roses

Conventions, patterns, and successful approaches discovered during work on this plan.

_Auto-scaffolded by /start-work. Append new entries below - never overwrite._

---

## [2026-08-20] 交付收尾
- **findstr 无法检查压缩单行 JS**：esbuild minify 产物是单行 ~575KB，findstr 行缓冲上限（~8KB）导致 `findstr /v` 过滤失败并报「参数 1 太长」，且 `/n` 会打印整行巨量输出。**正确做法**：用 Node 脚本 `fs.readFileSync + /https?:\/\/[^\s"'<>)]+/g` 扫描。
- **体积口径**：build.mjs 输出的 "index.html written (575840 bytes)" 是 esbuild JS bundle 大小，**不是**完整文件大小；磁盘实测 index.html = 576215 bytes（含内联 CSS+HTML）。报告体积时以磁盘实测为准。
- **URL 检查结论**：index.html 仅 2 处 URL 命中，均非网络请求——`http://www.w3.org/1999/xhtml`（XHTML 命名空间声明，标准写法）+ `https://jcgt.org/published/0007/04/01/`（Three.js 许可证注释）。零外部资源引用。
- **F3 阻塞处理**：浏览器真实手动 QA 由用户手动执行（用户明确指示），按 boulder 规则将 F3 标记 `- [~]`（阻塞）而非 `[ ]`，程序化部分（构建/URL/console/体积）已全部覆盖。
- **交付状态**：T1-T14 全部 `[x]`；F1/F2/F4 APPROVE（证据 .omo/qa/final-F1/F2/F4.txt）；F3 `[~]` 待用户手动验证；交付物 D:\MyLearning\MyWork\260818\index.html（576215 B < 1.5MB）。
