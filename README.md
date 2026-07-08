# Designer Portfolio

设计师个人作品集网站，包含前台展示、管理员后台、图库媒体库和作品集 PDF。

## 本地运行

```bash
npm start
```

打开：

- 前台：http://localhost:4173/
- 后台：http://localhost:4173/admin.html

后台默认密码：

```text
admin123
```

可通过环境变量修改：

```bash
PORTFOLIO_ADMIN_PASSWORD=your-password npm start
```

## 后台模块

- 作品：维护作品信息和作品图片
- 文章：维护设计心得文章和文章封面
- 图库：独立媒体库，只维护图片、章节、路径、尺寸和排序

## 文件结构

- `public/`：前台、后台静态页面和素材
- `data/portfolio.json`：作品、文章、图库数据
- `server.js`：本地服务、登录、保存和上传接口
- `public/Designer-Portfolio.pdf`：作品集 PDF
