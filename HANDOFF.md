# FEIROO Visual Lab 跨设备交接

更新日期：2026-10-16（Asia/Shanghai）。

## 项目来源与工作分支

- 正确 GitHub 仓库：https://github.com/senorfairy-cpu/my-files
- 网站生产来源分支：`portfolio-site`（用户的 Netlify 部署记录；本地已核验同名远端 Git 分支）。
- 仓库默认分支是 `main`，不能将默认分支与网站生产来源分支混同。
- 生产基准完整提交：`1487507325d369107e16bf5e86ab1bfa6d529841`，2026-09-22，`Add Google Search Console verification`。
- 当前独立开发分支：`dev/local-review-20261016`。
- 正式站：https://senorfairy-portfolio.netlify.app/
- 旧的 `senorfairy-cpu/portfolio-site` 仓库地址错误，勿继续使用。

## 已完成及需保留的成果

1. 已取得正确源代码并从生产基准建立独立开发分支，原历史目录未覆盖。
2. 已核验线上 CSS、JS、语言文件、robots 和 sitemap 与基准匹配（排除 CRLF/LF 差异）；首页只发现后台链接由 `/admin.html` 美化为 `/admin`。
3. 已修复移动端横向溢出，用户已认可，请保留 `public/styles.css` 中的修改：
   - 680px 以下 `#thinkingTitle` 允许换行，必要时断开长内容。
   - 同一响应式区间 `.topbar .brand` 限定容器宽度并允许换行，修复 320px 英文下约 1px 的额外溢出。
   - 未用隐藏溢出的方式裁切文字；桌面端标题仍保留原有不换行设计。
4. 中英文均验证 320/375/390/430px，无页面横向滚动；1440px 桌面回归通过。页面内容宽度与可用宽度分别为 305/305、360/360、375/375、415/415、1425/1425；差值来自纵向滚动条。`git diff --check` 通过。
5. 用户已审核通过 V1.1 方案，作为后续开发依据。完整方案见 [docs/FEIROO_VISUAL_LAB_PROPOSAL.md](docs/FEIROO_VISUAL_LAB_PROPOSAL.md)。方案修订号 V1.1 不表示编辑器已开发。

## Visual Lab 开发边界

- 当前尚未开发 Visual Lab，也未安装相关依赖。
- 第一版优先背景、光影、文字、按钮、圆角、整体布局；照片墙和图库浮卡仅基础整体调节。
- 真实网页元素点选为主要编辑入口，分类导航保留；常用参数优先，高级参数折叠。
- 保存草稿、导出完整设计包、固化网站代码为不同操作；完整包包含必要背景、图片、字体及参数，以支持跨设备恢复。
- 编辑器及本地草稿不进入 Netlify `public` 发布目录，不写线上数据。
- 不进行复杂单元素自由排布，不提供一键固化或发布。
- 2026-10-16 今晚明确不开发；下次需用户明确开始，再按批准方案执行。

## 本地预览与跨设备准备

现有项目无前端框架构建步骤，`npm start` 运行 `node server.js`，默认端口 4173。另一台电脑需要 Git、Node.js，并获取此开发分支；按仓库依赖需要安装后再启动。不要启动 Netlify 部署命令，不导入生产存储凭据。

可在 PowerShell 的项目目录中设置 `$env:PORT='4184'` 后运行 `npm start`，访问 http://127.0.0.1:4184/ 。该 URL 只在当前电脑有服务运行时有效，不是可跨设备访问的公网地址。数据为本地仓库种子，不保证等同线上可编辑内容。后台只读查看，不测试写入或发布。

## Netlify 配置核验与推送状态

**用户已在 Netlify 后台核实配置，并明确授权此次开发分支提交与推送。**

2026-10-16 用户直接提供的配置确认：

- Production branch：`portfolio-site`。
- Branch deploys：`Deploy only the production branch`。
- Deploy Previews：针对生产分支或部署分支的 Pull Request。
- 用户确认普通推送 `dev/local-review-20261016` 不会触发正式网站部署，并授权仅推送该开发分支。

上述配置来自用户亲自核验；此前代理看到登录界面而暂停的阻塞已由此次确认解除，不冒称代理通过管理 API 独立核验。本轮不修改部署配置、不创建 Pull Request、不调用部署或后台写入操作。开发分支当前树没有 `.github` 工作流；仓库 `netlify.toml` 的 `public` 发布目录及其余配置保持原样。

此交接提交仅包含下列三个文件。提交号及远程一致性由推送后的 Git 检查确认；下一台电脑可用 `git log -1`、`git status` 和 `git ls-remote origin refs/heads/dev/local-review-20261016` 复核，避免在本文件内自引用尚未生成的提交号。

## 明天的下一步（2026-10-17）

1. 在另一台电脑克隆正确仓库并检出 `dev/local-review-20261016`；已有克隆则先检查未提交修改，再获取并切换该分支，不覆盖本地工作。
2. 比较本地与远端分支 SHA，确认包含本交接文件、完整 V1.1 方案和移动 CSS 修复。
3. 阅读本文件及 `docs/FEIROO_VISUAL_LAB_PROPOSAL.md`，复核本地预览及移动端修复。
4. 等用户明确开始开发后，按 V1.1 阶段一进行隔离骨架与参数契约；后续依阶段验收，不自动固化设计、推送或部署。

## 本次交接提交文件

- `public/styles.css`：已认可的移动响应式修复。
- `docs/FEIROO_VISUAL_LAB_PROPOSAL.md`：完整 V1.1 方案，保持原文。
- `HANDOFF.md`：本交接说明。

本轮已检查工作区，变更恰为上述三个文件。对这三个文件执行常见 Token、私钥、凭据赋值、邮箱及手机号规则扫描，未发现匹配，并人工检查了 CSS 差异和文档内容；扫描不构成对整个历史仓库的安全审计。方案副本与原 V1.1 文档 SHA-256 相同：`DD2AAA132C3C6044976D9EF4AEAC98B369640D4DF52829C88ABB617E7F104941`。此次仅提交、推送指定开发分支；生产基准及生产分支不变。

不要提交原始会话、外部 outputs 目录、运行缓存、凭据、临时图片、开发服务器日志或本地依赖目录。
