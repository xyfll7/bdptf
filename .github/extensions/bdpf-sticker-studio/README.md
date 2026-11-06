# 鼻窦排涕法 · 车贴设计台（Canvas 扩展）

工作区级 Copilot Canvas 扩展：在设计台里预览「鼻窦排涕法」车贴并保存方案。

## 与在线版的关系

渲染器、数据模型与界面逻辑都来自 [`docs/lib/`](../../../docs/lib)，两边是同一份代码：

| 文件 | 作用 |
| --- | --- |
| [`docs/lib/render.js`](../../../docs/lib/render.js) | 纯 SVG 渲染器（3 配色 × 4 版型） |
| [`docs/lib/design.js`](../../../docs/lib/design.js) | 设计数据模型、校验、默认值 |
| [`docs/lib/studio.js`](../../../docs/lib/studio.js) | 界面与交互（存储适配器注入） |

本扩展只多做两件事：把存储换成文件系统，并把页面资源挂到本地 HTTP 服务上。
改渲染逻辑请改 `docs/lib/`，不要在扩展里再写一份。

```
.github/extensions/bdpf-sticker-studio/
├── extension.mjs      # Canvas 声明（open / actions / onClose）与 HTTP 服务
├── lib/store.mjs      # 文件存储：原子写入、按 id 串行化、格式/版本校验
└── assets/
    ├── page.mjs       # 复用 docs/index.html 并注入已保存的设计
    └── client.js      # 把保存动作接到 /api/design
```

## Canvas 接口

- Canvas ID：`bdpf-sticker-studio`
- 打开输入：`{ "designId"?: string }`（默认 `default`）
- Actions：
  - `getDesign` — 读取已保存设计
  - `setDesign` — 保存设计（可只传部分字段，其余沿用已存值）
  - `resetDesign` — 恢复默认文案与样式
  - `exportSvg` — 返回 SVG 源码与尺寸

## 可选项

| 字段 | 取值 |
| --- | --- |
| `theme` | `vermilion` 朱红金 / `mono` 极简黑白 / `pop` 国潮撞色 |
| `shape` | `round` 圆形贴 1200² / `banner` 横幅贴 1600×460 / `card` 圆角贴 1120×780 / `portrait` 竖版贴 760×1320 |
| `title` | 主标语（放大），≤ 40 字 |
| `subtitle` | 副标语，≤ 80 字，按逗号自动断行 |
| `cutline` | 是否显示刻字/裁切线 |

## 数据位置

设计保存在仓库外的私有目录，避免把个人方案提交进版本库：

```
~/.copilot/extension-data/bdpf-sticker-studio/designs/<designId>.json
```

同一 `designId` 的写入会串行执行。保存是「读取—合并—写入」，并发请求若不加锁会互相覆盖，
把刚设置的配色或版型改回旧值。

## 限制

本扩展依赖 `@github/copilot-sdk`（由 Copilot 运行时注入）和一个本地 HTTP 服务，
因此**不能**作为 GitHub Pages 站点运行。要网页版请用 [`docs/`](../../../docs)。
