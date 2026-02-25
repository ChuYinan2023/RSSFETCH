# RSS 信息看板

## 项目目录

```
D:\PlayClaudeCode\RSSFETCH\
├── feeds.json          ← RSS 源配置（40个源）
├── fetch_feeds.js      ← 抓取脚本
├── raw_feeds.json      ← 抓取输出（500+篇文章）
├── index.html          ← 看板前端
├── package.json        ← 项目配置（fast-xml-parser）
└── node_modules/
```

## 工作流程

```
feeds.json（源列表）
    │
    ▼
node fetch_feeds.js     ← 读取源 → 并发抓取XML → 解析 → 输出
    │
    ▼
raw_feeds.json（结构化数据）
    │
    ▼
index.html（看板）      ← 通过 HTTP 读取 JSON → 渲染
```

**日常使用两步：**

1. `node fetch_feeds.js` — 抓取生成数据
2. 浏览器打开 `http://localhost:3300` — 查看看板（需 `npx serve . -l 3300`）

## feeds.json — 源配置

40 个源，6 大分类：

| 分类 | 源数量 | 典型源 |
|------|--------|--------|
| 监管 | 1 | 美国FDA |
| 心血管 | 9 | ESC、EuroPCR、TCTMD、AHA、Medscape心血管、世界心脏联盟等 |
| 医疗科技 | 3 | MassDevice、MedTech Dive × 2 |
| 器械 | 12 | 美敦力、波士顿科学、雅培、西门子、史赛克、飞利浦、微创医疗等 |
| 医药 | 12 | 强生 × 4、罗氏、辉瑞、诺华中国、艾伯维、礼来、赛诺菲、默沙东等 |
| 研究 | 3 | NCBI × 2、德国血栓与止血学会 |

每条记录格式：

```json
{ "id": "bsc", "name": "Boston Scientific", "nameZh": "波士顿科学",
  "url": "https://...", "category": "器械", "color": "#006272", "lang": "en" }
```

增删源只需编辑此文件。

## fetch_feeds.js — 抓取脚本

- 从 `feeds.json` 读取源列表
- 分批并发（每批 8 个，避免超时）
- 自动重试（失败最多重试 2 次，递增延时）
- 用 `fast-xml-parser` 解析 RSS 2.0 / Atom 格式
- 提取字段：标题、链接、发布时间、摘要（去 HTML 标签，截取前 500 字）
- 输出 `raw_feeds.json`

## index.html — 前端看板

- 直接读取 `raw_feeds.json`，无中间转换
- 文章按发布时间倒序排列
- 侧边栏：按分类分组显示源列表，文章计数随筛选条件动态更新，抓取失败的源标 ⚠
- 搜索：全文匹配标题 + 摘要 + 源名
- 时间筛选：全部 / 3天 / 7天 / 15天 / 30天
- 响应式：手机端侧边栏折叠为汉堡菜单

## 关键特性

- **纯静态**：无后端、无数据库，一个 JSON 文件搞定
- **速度快**：40 个源全部抓完约 30 秒
- **易维护**：加源改 `feeds.json`，改样式改 `index.html`，全部独立
