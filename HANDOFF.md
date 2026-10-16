# FEIROO Visual Lab 跨设备交接

更新：2026-10-16（Asia/Shanghai）。今日停止新增功能；等待用户今晚真机导入验收，不自动进入第三阶段。

## 仓库、版本和安全边界

- 仓库：https://github.com/senorfairy-cpu/my-files ，远程 origin；本次只提交、推送 dev/local-review-20261016。
- 起始完整 SHA：2e8d26d182174b99478307d3310fc9302637088f。当前设计参数 baseCommit 仍指该原站设计基准，不是本次工具代码提交的 HEAD。
- 生产分支 portfolio-site 的交接前 SHA：1487507325d369107e16bf5e86ab1bfa6d529841。禁止修改或推送生产分支。
- 今天未修改 public/、正式 server.js、netlify.toml；已认可的移动 CSS 修复包含在起始提交中，继续保留。
- 用户此前亲自确认 Netlify 只部署生产分支 portfolio-site，开发分支普通推送不触发正式部署。本轮不改配置、不建 PR、不调用部署接口；没有新增 GitHub Actions 工作流。
- 交接提交 SHA 由推送后的 git rev-parse HEAD 和 git ls-remote 核对，不在提交内自引用尚未生成的 SHA。

## 今日完成

### 独立工具、背景与主题

- tools/visual-lab/ 独立入口，专用只读服务绑定 127.0.0.1:4185；真实首页 iframe，保留动画、中英文及七档预览宽度。
- 图片替换、缩放、X/Y、亮度、透明度、模糊；深色/亮色/自定义主题；纯色、渐变、图片、光源、遮罩独立开关。亮色真实白底，不被原黑色遮罩压暗。
- 推荐文字/按钮配色必须主动应用；照片墙/浮卡仅作可关闭的亮底预览适配，未重构组件。
- 桌面为移动默认继承来源，移动可独立稀疏覆盖；原始空覆盖保持默认视觉。

### 多光源与列表交互

- 最多五个稳定 ID 柔光；名称、顺序、增删共用；defaults/base/desktop/mobile 逐层覆盖。
- 每源颜色/HEX、X/Y、宽高、旋转、强度、柔化、模糊、normal/screen/lighten/multiply/soft-light。底层环境光独立，不占五个名额。
- 画布中心点拖动、方向键微调、Shift 加速、Esc 退出；pointer capture、唯一手势 ID 和最终落点回执避免旧回传覆盖。尺寸/旋转仍用面板。
- 新增入口置顶，紧随列表；单击行或名称选中并同步画布，双击名称行内编辑；Enter 确认、Esc 取消、失焦确认，空名保留旧名。
- 新增/复制名称避重，显隐/上下排序保留；复制、删除在属性标题旁；属性独立滚动，切换其他光源回顶部。交互优化只改面板，不改模型、渲染或存储格式。
- 切换设备/语言/主题不清源、不重写已有混合模式；亮底新源默认 multiply，深底 screen；保留原始橙色主光源和动画。

### 本机草稿与 ZIP 设计包

- IndexedDB 手动保存参数与图片 Blob，最多十份，支持名称、保存时间、打开/删除、未保存状态；刷新后主动打开，不自动保存滑块操作。
- .feiroo.zip 含格式版本、名称/创建时间、完整 Banner 参数、双端继承和覆盖、中英配置、预览语言/宽度、被任一图层引用的替换图片字节及 SHA-256 关系。
- 导入先校验、展示摘要，再确认替换；失败不改当前设计和已有草稿。导入后可另存本机草稿；不会将草稿写入 public。
- 标准 ZIP STORE，无新增依赖；单文件 20 MiB、ZIP/解压总量各 100 MiB、100 条目，清单另限 2 MiB。拒绝路径穿越、重复、软链接/特殊属性、加密、压缩/ZIP64、多磁盘、CRC/哈希错误、缺失素材、未知字段/版本；图片须签名匹配且实际可解码。
- 包只在内存读取，不执行脚本、不解压写源码、不依赖云端；不保存绝对路径或临时 blob URL，恢复时重建当前 origin 的 URL。
- 原站内置素材、字体、内容种子由同基准仓库提供，设计包不是独立网站安装包。未来文字/按钮/布局通过版本扩展；当前不静默丢弃未知字段。
- IndexedDB 按浏览器及 origin（协议/主机/端口）隔离，不能靠 Git 搬走草稿；跨设备需携带 ZIP。

## 待修复与限制（本轮不修）

1. **用户指定：已有本机草稿保存后，无法直接修改草稿名称。** 下次确认重命名流程与更新语义，今天只记录。
2. 文件名需以 .feiroo.zip 结尾；同名下载若变成 xxx.feiroo (1).zip，先手动改为 xxx-副本.feiroo.zip 再导入。今天不调整文件名识别。
3. 英文 768px 原站导航横向溢出，scrollWidth 约 828/clientWidth 753；未注入工具也复现。候选最小方案为 681–980px 导航换行，正式 CSS 未改。
4. MutationObserver.observe 异常在无网站脚本的最小 iframe 也复现，指向内置浏览器 iframe 检测/注入路径，未定位宿主内部行号；保留 diagnostic.html，不为此改原站 JS。
5. 没有撤销重做、拖拽缩放/旋转、复杂光源动画、3D、代码固化、云同步或账户系统；第三阶段完整文字/按钮/布局编辑未授权。
6. 已做同机 4186 独立 origin 空存储迁移模拟，**尚未完成两台实体 Windows 验收**。用户已自行导出设计包，今晚携带测试。
7. 旧标签不会热更新。更新工具代码前先保存/导出，再刷新并打开草稿或导入，不丢弃未保存设计。

当前约定开发范围已完成，没有失败自动测试或未完成的关键实现项；上述待修复/限制保留，不擅自扩展开发。

## 今日代码与验证

- 新增 tools/visual-lab/：独立服务、编辑器、schema/默认值、背景适配、光源模型/面板/渲染、桥接、图片检查、IndexedDB、ZIP 编解码、诊断入口及测试。
- package.json 仅增加 lab、lab:check，无新依赖；.gitignore 排除本地数据、work/outputs、ZIP、截图目录、缓存和密钥。
- 文档：本文件、方案当前状态、tools/visual-lab/README.md 与 STORAGE.md。
- 最终全量 node --test tools/visual-lab/*.test.js：25 项通过、0 失败；生产隔离检查通过，工具语法检查通过。提交前检查 git diff --check 与暂存名单。
- 原版默认样式对照一致；黑橙、白橙蓝、黑底多色、独立图层、中英文/设备切换实测通过。
- 390/768px 拖动坐标通过；列表回归从 X=32/Y=40 拖动约 5%/4% 得到 X=36.98/Y=44.02，像素舍入误差约 0.02%；移动独立 X=68 保留。
- 单击、双击、Enter/Esc、失焦、排序、复制删除、隐藏、属性滚动复位实测通过；名称和参数经草稿/ZIP 恢复保留。
- 含 JPEG 草稿刷新恢复，十份上限/第十一份拒绝，清空草稿后只凭 ZIP 恢复图片，4186 空存储重建自身 blob URL，通过。
- 浏览器实测未来版本/CRC 错误/取消导入不替换设计；自动化覆盖缺失/伪装素材、超限、非法路径、重复/特殊条目、未知字段/版本。
- 仅显式暂存 .gitignore、HANDOFF.md、方案、package.json、tools/visual-lab/；不提交本机 IndexedDB、设计包、测试截图、work、outputs、日志、缓存、node_modules、.env 或密钥。

## 今晚另一台 Windows 恢复

准备 Git 和 Node.js 24 LTS，在新的父目录运行。若目标目录已存在请换一个新名字，不覆盖旧目录：

```powershell
git clone --branch dev/local-review-20261016 --single-branch https://github.com/senorfairy-cpu/my-files.git feiroo-visual-lab-20261016
cd feiroo-visual-lab-20261016
git rev-parse HEAD
git ls-remote origin refs/heads/dev/local-review-20261016
git status --short
node --test tools/visual-lab/*.test.js
node tools/visual-lab/check-production.js
node tools/visual-lab/server.js
```

成功标志：本地/远端 SHA 一致，status 无输出，25 项测试通过，终端给出 http://127.0.0.1:4185/__visual-lab/ 。

Visual Lab 只用 Node 内置模块，**无需 npm install**。不运行 npm start（原站服务），不运行任何 Netlify 命令，不导入生产凭据。

打开该地址 → 展开“草稿与设计包” → 选择自己携带的 .feiroo.zip → 核对摘要并确认 → 检查背景、光源/顺序/显隐、桌面/移动、中英文和图片 → 另存本机草稿。

若 SHA 不同、测试失败、包不兼容或素材缺失，保留包和错误原文并报告，不强行覆盖、合并、改生产或部署。

## 下次开发

先等用户今晚实体机导入结果，再按新授权处理待修复项。没有新授权不继续第三阶段，不提交、推送、建 PR 或部署。
