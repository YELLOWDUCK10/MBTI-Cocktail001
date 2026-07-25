# MBTI-Cocktail

> 你的性格，你的酒 | _Your Personality, Your Pour_

基于 MBTI 人格类型的智能鸡尾酒推荐桌面应用。调节四个性格维度的倾向，发现属于你的那杯酒；AI 还会为你独创一款专属配方。

## 功能特性

- **维度滑块**：拖动 E/I、S/N、T/F、J/P 四个滑块，精细调节性格倾向
- **智能推荐**：基于荣格八维理论，为你的 MBTI 类型匹配 5 款鸡尾酒
- **AI 特调**：根据维度强度，算法实时生成一款独一无二的专属配方
- **鸡尾酒百科**：浏览、搜索、按技法/分类筛选鸡尾酒知识库
- **收藏管理**：一键收藏喜欢的鸡尾酒
- **桌面级体验**：Electron 封装，可独立窗口运行

## 快速开始

本项目提供两种运行方式，任选其一即可。

### 方式一：浏览器运行（零安装，最快上手）

适合不想安装额外软件的情况，只需一个现代浏览器 + 一个本地服务器。

**前提**：电脑已安装 Python 或 Node.js（任一即可）。

**步骤**：

1. 启动本地服务器（任选其一）：
   Windows：文件夹空白处 Shift + 右键 → 在此处打开 PowerShell / CMD
   Mac/Linux：终端 cd 进入项目根目录（能看到 server.js 的文件夹）

   有 Node.js（推荐，项目自带启动脚本，零依赖）：

   ```bash
   node server.js
   ```

   有 Python：
   终端切换到项目里的 src 目录

   ```bash
   cd src
   ```
   启动 Python 简易服务
    ```bash
    python -m http.server 8000
    ```
  
3. 用浏览器打开 <http://localhost:8000>

> 说明：页面使用了 ES 模块（`<script type="module">`），直接双击 `index.html` 打开会被浏览器安全策略拦截，因此需要通过本地服务器访问。

### 方式二：Electron 桌面版（完整桌面体验）

以独立窗口运行，体验最完整。

**前提**：电脑已安装 Node.js（v16 及以上，推荐 v18+）。下载地址：<https://nodejs.org>

**步骤**：

1. 在项目根目录安装依赖：

   ```bash
   npm install
   ```

2. 启动应用：

   ```bash
   npm start
   ```

应用会以独立窗口打开。

## 项目结构

```
MBTI-Cocktail-Desktop-main/
├── main.js               # Electron 主进程（窗口创建、收藏持久化）
├── preload.js            # 预加载脚本（安全暴露 API 给渲染进程）
├── server.js             # 零依赖本地服务器（浏览器版启动用）
├── package.json          # 项目配置与依赖
├── src/                  # 渲染进程（界面与逻辑）
│   ├── index.html        # 页面结构
│   ├── style.css         # 样式
│   ├── app.js            # 应用主逻辑（路由、交互）
│   ├── engine.js         # 推荐引擎（评分算法、AI 生成）
│   ├── cocktails.js      # 鸡尾酒数据库
│   ├── mbti-profiles.js  # 16 种 MBTI 人格档案
│   ├── mbti-questions.js # MBTI 测试题目
│   └── flavor-library.js # 风味素材库（基酒、配料等）
├── PRD.md                # 产品需求文档
└── README.md             # 本文件
```

## 运行环境要求

| 项目 | 浏览器版 | Electron 版 |
|------|---------|-------------|
| 浏览器 | 需要（任意现代浏览器） | 不需要 |
| Node.js | 可选（或用 Python） | 需要（v16+） |
| Python | 可选（v3.x） | 不需要 |
| 操作系统 | 跨平台 | Windows / macOS / Linux |

## 常见问题

**Q：双击 index.html 打开是空白页？**
A：因为使用了 ES 模块，需要通过本地服务器访问，参见“方式一”。

**Q：Electron 版启动后没有自定义图标？**
A：默认使用 Electron 自带图标。如需自定义，把图片放到 `assets/icon.png`，应用会自动加载。

**Q：收藏的数据存在哪里？**
A：浏览器版存在浏览器的 localStorage；Electron 版存在用户数据目录的 `favorites.json`，关闭后不会丢失。

**Q：npm install 很慢或失败？**
A：可切换为国内镜像加速：`npm install --registry=https://registry.npmmirror.com`，并设置 Electron 镜像：`set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`（Windows）或 `export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`（macOS/Linux）。

## 许可证

MIT License
