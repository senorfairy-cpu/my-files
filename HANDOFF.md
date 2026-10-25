# FEIROO Visual Lab 跨设备交接

更新：2026-10-25（Asia/Shanghai）。3.1文字排版和照片墙/浮卡模块均已完成初步验收；暂停新功能，本次仅提交、推送开发分支以便跨设备继续测试。

## 仓库、分支与版本

- 正确仓库：https://github.com/senorfairy-cpu/my-files
- 开发分支：`dev/local-review-20261016`。
- 本轮开发起点：`2a6af37ac01bd060a184859ffecfde05ce9d4f61`。
- 生产分支：`portfolio-site`；推送前核验SHA为 `1487507325d369107e16bf5e86ab1bfa6d529841`。禁止修改、合并或推送该分支。
- 设计参数中的 `baseCommit` 固定为原站设计基准 `2e8d26d182174b99478307d3310fc9302637088f`，不要替换为工具代码HEAD。`schemaVersion`仍为1；新草稿/ZIP的 `manifest.version` 为3，三者含义不同。
- 本次交接提交SHA以推送后最终回复和Git记录为准，不能在提交内自引用尚未生成的SHA。另一台电脑必须核对最终回复中的完整SHA。
- 原 `senorfairy-cpu/portfolio-site` 仓库地址错误，不能作为项目来源。
- 已批准的完整方案：[docs/FEIROO_VISUAL_LAB_PROPOSAL.md](docs/FEIROO_VISUAL_LAB_PROPOSAL.md)。实际交付功能以本文件和工具README为准，未实现的方案内容不视为已开发。

## 已验收功能

- 独立本地服务与真实首页iframe，中英文切换、七档预览宽度，桌面/移动独立稀疏参数与继承。
- 背景图片、深浅/自定义主题、渐变、遮罩及独立图层开关；最多5个光源，位置、颜色、尺寸、混合模式、列表顺序/命名等既有交互。
- 3.1文字：眉题、主标题、简介（副标题）可点击选中；中英文内容独立；字体、字号、字重、颜色、行高、字距、透明度、文本最大宽度、对齐；单项和单对象恢复。
- 照片墙整体：相对原响应式位置的X/Y（px）、独立scale、附加透明度、间距系数。透明度为原动画效果的0–1乘数，1保留原样；不强行把原0.62最终透明度改成1。
- 单图：按原图库asset ID选择，透明度、相对原主题滤镜的亮度/饱和度、墙内z-index。不改变DOM顺序、不提升整墙越过标题/遮罩。当前种子2张墙图，保留原站前5张显示和移动裁切规则，不新增/替换墙图。
- 浮卡：背景透明度、圆角、阴影强度、backdrop模糊；不影响标签和数字透明度。点击真实墙图或浮卡自动打开对应属性。
- 原有动画结构、响应式规则、按钮链接和内容结构保留；默认空覆盖还原原站视觉。只使用项目字体及系统字体。
- IndexedDB手动草稿（最多10份），包含替换图片；ZIP导入先校验与摘要确认，失败/取消不替换当前设计。

## 开发边界与生产隔离

- 按用户调整后的计划，跳过Banner整体布局。没有开放Banner高度、主布局或按钮编辑，没有新增照片墙素材管理、自由排布、撤销重做或代码固化。
- 本轮相对开发起点未修改 `public/`、正式 `server.js`、`netlify.toml`、`package.json`、`.gitignore`，未新增依赖或下载字体。更早已验收的移动溢出修复在开发起点中继续保留。
- 本地工具仅绑定 `127.0.0.1:4185`，只读本地种子及静态资源；拒绝写请求、管理/Netlify路由、非法Host/Origin及路径越界。不会访问生产Blobs或线上后台数据。
- 仅专用服务对预览首页注入桥接；普通首页源码没有调试入口。编辑器均在 `tools/visual-lab/`，不进入Netlify发布目录 `public`。
- 用户此前已在Netlify后台核验：Production branch为 `portfolio-site`；Branch deploys为 `Deploy only the production branch`；Deploy Previews针对生产/部署分支的PR。普通推送当前开发分支不发布正式站。本次不修改这些设置、不创建PR、不调用部署接口。
- 当前树没有GitHub Actions工作流；没有自定义Git钩子或core.hooksPath。本轮仅使用显式开发分支refspec推送，不进行生产分支或标签推送。

## 草稿与ZIP版本兼容

- 新保存/导出为v3；新版继续读取v1（背景）和v2（背景+文字）。旧记录只在主动保存时转成新版本，不自动改写已有草稿。
- v3增加 `wall`、`wall.images` 与 `mark` 的受限字段。单图按asset ID逐图逐字段合并，桌面/移动覆盖和0值完整保留。旧工具不能读v3，必须使用本次交接代码。
- 包含当前设计参数、设备/语言/预览宽度、光源、文字与组件效果，以及引用的替换背景图片字节和SHA-256；不保存临时blob URL或绝对磁盘路径。
- 原站内置照片墙图片、字体和种子来自配套同基准仓库，设计包不是完整网站安装包。不导出后台数据或凭据。
- 草稿按浏览器和origin（协议/主机/端口）隔离，不随Git迁移。跨电脑请先手动导出自己的 `.feiroo.zip`，再在新电脑导入；不要将私人草稿或ZIP提交仓库。
- 包限单文件20MiB、ZIP/解压总量各100MiB、100条目、清单2MiB；标准ZIP STORE。未知版本/字段、非法路径、重复/特殊条目、CRC/哈希错误、缺失或伪装素材等均拒绝。

## 验证结果与已知问题

- 本次交接前重新运行完整自动测试：37项通过、0失败；生产隔离检查PASS，`git diff --check`通过。
- 既有浏览器验收：中英文 × 1440/390px × 深浅主题八组回归；无新增横向溢出；默认空覆盖没有多余墙/图片/浮卡内联样式；按钮仍指向 `#chapters` 和 `/blog`。
- 实际v1/v2/v3草稿读取、v3保存刷新恢复及ZIP导出再导入通过。自动v3往返含真实JPEG、双语文字、设备参数、光源和组件效果；重复滤镜、CSSStyleRule嵌套兼容有回归覆盖。
- 当前内置浏览器 `prefers-reduced-motion: reduce`。重播和最终状态已测，未覆盖原transform/opacity/transition；普通慢速入场仍需另一电脑在普通动效环境目视确认。
- 既有问题未修：已有草稿不能直接改名；同名下载产生 `xxx.feiroo (1).zip` 时需要手动改成以 `.feiroo.zip` 结尾；英文768px原站导航溢出；内置浏览器iframe的历史MutationObserver异常。
- 移动端继续使用原裁切边界，大位移/缩放可能被裁掉；层次只在墙内生效。不存在的墙图保留其参数并提示，不擅自增图或删除参数。
- IndexedDB仍是当前浏览器本机数据；本轮验证不等于另一台实体电脑的v3最终验收。
- 不刷新有未保存修改的旧标签。代码更新后旧标签不会热更新：先保存/导出，再刷新并主动打开草稿或导入ZIP。

## 另一台电脑恢复步骤

安装/确认Git和Node.js 24 LTS。Visual Lab只用Node内置模块，**无需npm install**；不运行原站 `npm start`、任何Netlify命令或生产凭据。

### 没有该项目：新目录克隆

先确认目标目录不存在；若已存在则换一个新名字，不覆盖、合并或删除旧目录。

```powershell
git --version
node --version
git clone --single-branch --branch dev/local-review-20261016 https://github.com/senorfairy-cpu/my-files.git feiroo-visual-lab-handoff
cd feiroo-visual-lab-handoff
```

### 已有开发副本：先检查，再快进获取

先进入正确项目，运行 `git status --short` 和 `git remote -v`。有本地修改、仓库来源错误、分支不符或提交分叉时停止，不强行reset/合并；可在另一个独立新目录克隆。确认工作区干净后：

```powershell
git fetch origin dev/local-review-20261016
git switch dev/local-review-20261016
git pull --ff-only origin dev/local-review-20261016
```

### 核对版本、测试、启动

```powershell
git branch --show-current
git rev-parse HEAD
git ls-remote origin refs/heads/dev/local-review-20261016
git status --short
node --test tools/visual-lab/*.test.js
node tools/visual-lab/check-production.js
node tools/visual-lab/server.js
```

预期：分支为 `dev/local-review-20261016`；本地/远端SHA与本次最终交接回复一致；工作区干净；37项通过、0失败；隔离检查PASS。若SHA不同或测试失败，保留错误并报告，不改源码、不强行覆盖。

打开 http://127.0.0.1:4185/__visual-lab/ 。必须使用127.0.0.1和4185保持origin一致；端口占用时先查原因，不结束未知进程。编辑器页标题应包含“文字、照片墙与光影”，分类应有“照片墙与浮卡”。

展开“草稿与设计包” → 导入自己携带的 `.feiroo.zip` → 核对摘要及版本 → 确认 → 检查中英文、桌面/移动、背景、光源、文字、单图、浮卡 → 另存本机草稿。在普通动效环境检查照片墙重播。私人ZIP不要复制进仓库。

## 下一步

暂停新功能。先完成另一台电脑的v3设计包恢复与普通动效验收，报告差异；等待用户新授权，再处理具体问题或继续后续模块。不要自行开发按钮、Banner整体布局，或执行代码固化、PR、合并和部署。

## 本次提交内容与排除项

只提交 `HANDOFF.md` 以及 `tools/visual-lab/` 中的实现、正式自动测试、README和STORAGE。`*.test.js`是持续回归测试，并非临时测试产物。

不提交IndexedDB内容、个人设计草稿、下载ZIP、验收截图、临时测试脚本、outputs/work/tmp、缓存、日志、node_modules、.env或密钥。`.gitignore`保留既有排除规则。本轮没有删除用户本机草稿、设计包或旧目录。
