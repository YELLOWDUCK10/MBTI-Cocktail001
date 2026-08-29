# MBTI-Cocktail

> 你的性格，你的酒 | _Your Personality, Your Pour_

基于 MBTI 人格类型的本地鸡尾酒推荐应用。调节四个性格维度的倾向，发现属于你的那杯酒；AI 还会为你独创一款专属配方。

**零安装、零依赖、单文件**：构建产物就是一个 `index.html`，双击即可在浏览器打开使用。

## 功能特性

- **维度滑块**：拖动 E/I、S/N、T/F、J/P 四个滑块，精细调节性格倾向（左黄右黑，黄色越长代表左侧字母越强）
- **16 型直选**：跳过滑块，直接点选你的 MBTI 类型
- **智能推荐**：基于连续值加权评分算法，为你的类型匹配 5 款鸡尾酒，卡片显示匹配度，支持「换一批」
- **AI 特调**：根据维度强度实时生成独一无二的专属配方（含风味冲突校验），可无限「重新生成AI特调」
- **鸡尾酒百科**：按评分降序浏览，支持搜索、分类/技法筛选，一键「随机来一杯」
- **收藏管理**：卡片心形一键收藏，按时间倒序展示，AI 特调也可收藏
- **状态恢复**：关闭重开后自动恢复上次的滑块位置、类型与收藏

## 快速开始

### 直接使用（推荐）

构建产物 `dist/index.html` 是一个完全自包含的单文件（HTML + CSS + JS 全部内联），**双击即可在浏览器打开**，无需安装任何软件。

### 从源码构建

仅当需要修改源码并重新打包时需要：

**前提**：电脑已安装 Node.js（v16 及以上，推荐 v18+）。下载地址：<https://nodejs.org>

```bash
node build.js
```

构建脚本会读取 `src/` 下的源码，产出 `dist/index.html`。构建过程零依赖，只用 Node 内置模块。

## 项目结构

```
MBTI-Cocktail/
├── build.js              # 零依赖打包脚本（CSS 内联 + JS 拼接 → dist/index.html）
├── package.json          # 项目配置（仅 build 脚本）
├── src/                  # 源码（模块化）
│   ├── index.html        # 页面结构
│   ├── style.css         # 样式
│   ├── app.js            # 应用主逻辑（路由、交互、收藏、状态恢复）
│   ├── engine.js         # 推荐引擎（评分算法、AI 生成）
│   ├── cocktails.js      # 鸡尾酒数据库（29 款）
│   ├── mbti-profiles.js  # 16 种 MBTI 人格档案
│   └── flavor-library.js # 风味素材库（基酒、配料、技法、冲突规则）
├── dist/                 # 构建产物（已随仓库提交）
│   └── index.html        # 最终单文件，双击即用
├── PRD.md                # 产品需求文档（v2.0）
└── README.md             # 本文件
```

> 说明：`dist/index.html` 已随仓库一起提交，下载代码后无需构建即可直接使用。仅当修改 `src/` 源码后，才需要运行 `node build.js` 重新生成。

## 数据存储

所有数据保存在浏览器的 `localStorage`，关闭后不会丢失：

| 键 | 内容 |
|------|------|
| `mbti-cocktail-favorites` | 收藏（经典酒引用 + AI 酒完整对象） |
| `mbti-cocktail-gen-history` | AI 生成历史 |
| `mbti-cocktail-last-state` | 上次滑块位置与类型 |

清空浏览器站点数据即可重置全部内容。

## 常见问题

**Q：`dist/index.html` 不存在？**
A：该文件已随仓库提交。若缺失，在项目根目录运行 `node build.js` 重新生成。

**Q：数据存在哪里？**
A：浏览器的 `localStorage`，与访问 `index.html` 的路径绑定；换浏览器或换路径会视为不同站点。

**Q：修改源码后如何生效？**
A：改完 `src/` 下的文件后重新运行 `node build.js`，再刷新 `dist/index.html`。

## 许可证

MIT License
